import { queryWithParams } from '../../utils/database.js';
import {
  atualizarStatusEmissaoCredencial,
  buscarEmissaoCredencialPorOperationId,
  registrarEmissaoCredencial,
  formatarDataHoraLocalSql,
} from '../../services/credencialAcessoEmissaoService.js';
import {
  emitirCartaoCheckin,
  invalidarCartaoCheckout,
  estenderValidadeCartao,
  consultarStatusOperacao,
  emitirCartaoAdicional,
  solicitarLeituraCartao,
  registrarCartaoPerdido,
  atualizarCardSnr,
  buscarProximaOperacaoAgente,
  registrarHeartbeatAgente,
  enviarResultadoOperacaoAgente,
} from '../../services/yamamottoService.js';
import { registrarLogReserva, TIPOS_LOG_RESERVA } from '../../services/reservaLogsService.js';
import { atualizarStatusReserva } from '../../services/reservasService.js';

async function finalizarCheckoutDaReservaSeNecessario(emissao, statusOperacao) {
  const statusNormalizado = String(statusOperacao || '').toLowerCase();
  if (!emissao || emissao.tipo_operacao !== 'checkout' || !['completed', 'completo'].includes(statusNormalizado)) {
    return null;
  }

  let reservaAtualizada = null;

  if (emissao.reserva_id) {
    const reservaAtual = await queryWithParams(
      `SELECT TOP 1 id, status
       FROM reserva
       WHERE id = @reservaId`,
      { reservaId: emissao.reserva_id },
    );

    const statusReservaAtual = String(reservaAtual.recordset?.[0]?.status || '').toLowerCase();
    if (!['finalizado', 'finalizada', 'check-out', 'checkout'].includes(statusReservaAtual)) {
      reservaAtualizada = await atualizarStatusReserva({ id: emissao.reserva_id, status: 'finalizado' });
    }
  }

  if (emissao.quarto_id) {
    await queryWithParams(
      `UPDATE quarto
       SET status = @status
       WHERE id = @quartoId`,
      {
        quartoId: emissao.quarto_id,
        status: 'limpeza',
      },
    );
  }

  return reservaAtualizada;
}

/**
 * Liberar quarto (Check-in)
 * POST /hotel/:hotelId/liberar-quarto/issue
 * Emite um cartão RFID para o hóspede no check-in
 */
export async function liberarQuartoCheckin(req, res) {
  try {
    const { hotelId } = req.params;
    const { reservaId } = req.body;
    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || 'master';
    const gravadorWaitMs = Number(process.env.YAMAMOTTO_WAIT_MS || 5000);

    // Validar entrada
    if (!reservaId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'reservaId é obrigatório',
      });
    }

    // Buscar dados da reserva
    const resultadoReserva = await queryWithParams(
      `SELECT 
        r.id,
        r.hospede_id,
        r.quarto_id,
        h.hotel_id,
        r.data_checkin,
        r.data_checkout,
        r.status,
        q.numero as quarto_numero,
        h.nome as hospede_nome,
        h.email as hospede_email
       FROM reserva r
       LEFT JOIN quarto q ON r.quarto_id = q.id
       LEFT JOIN hospede h ON r.hospede_id = h.id
       WHERE r.id = @reservaId`,
      { reservaId }
    );

    const reserva = resultadoReserva.recordset?.[0];
    if (!reserva) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Reserva não encontrada',
      });
    }

    // Validar quarto
    if (!reserva.quarto_numero) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Quarto não associado à reserva',
      });
    }

    // Chamar API Yamamotto
    const hotelLogId = reserva.hotel_id || hotelId;
    const operacao = await emitirCartaoCheckin({
      numeroQuarto: reserva.quarto_numero,
      dataCheckin: reserva.data_checkin.toISOString(),
      dataCheckout: reserva.data_checkout.toISOString(),
      hotelId: gravadorHotelId,
      waitMs: gravadorWaitMs,
    });

    const validadeInicioSql = formatarDataHoraLocalSql(reserva.data_checkin);
    const validadeFimSql = formatarDataHoraLocalSql(reserva.data_checkout);

    await registrarEmissaoCredencial({
      reservaId: reserva.id,
      hospedeId: reserva.hospede_id,
      quartoId: reserva.quarto_id,
      quartoNumero: reserva.quarto_numero,
      hotelRef: hotelLogId,
      requestId: null,
      operationId: operacao.operationId,
      validadeInicio: validadeInicioSql,
      validadeFim: validadeFimSql,
      quantidadeCartoes: 1,
      tipoOperacao: 'issue',
      statusOperacao: operacao.status,
      dados: {
        request: {
          reservaId: reserva.id,
          numeroQuarto: reserva.quarto_numero,
          dataCheckin: reserva.data_checkin.toISOString(),
          dataCheckout: reserva.data_checkout.toISOString(),
          hotelId: gravadorHotelId,
          waitMs: gravadorWaitMs,
        },
        response: operacao,
      },
    });

    // Registrar log da operação
    await registrarLogReserva({
      hotelId: hotelLogId,
      reservaId: reserva.id,
      tipo: TIPOS_LOG_RESERVA.LIBERAR_QUARTO,
      titulo: `Quarto ${reserva.quarto_numero} liberado (check-in)`,
      descricao: `Cartão RFID emitido. Operação: ${operacao.operationId}`,
      metadados: { operationId: operacao.operationId, status: operacao.status },
    });

    return res.json({
      sucesso: true,
      mensagem: 'Cartão emitido com sucesso',
      dados: {
        reservaId: reserva.id,
        operationId: operacao.operationId,
        status: operacao.status,
        quartoNumero: reserva.quarto_numero,
        hospedeNome: reserva.hospede_nome,
      },
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao liberar quarto (check-in):', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro ao liberar quarto',
      erro: erro.message,
    });
  }
}

/**
 * Invalidar quarto (Checkout)
 * POST /hotel/:hotelId/liberar-quarto/checkout
 * Invalida o cartão RFID do hóspede no checkout
 */
export async function invalidarQuartoCheckout(req, res) {
  try {
    const { hotelId } = req.params;
    const { reservaId, tempoEspera = 5000, quantity = 1 } = req.body;
    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || 'master';
    const quantidadeCartoes = Math.max(1, Number(quantity || 1) || 1);

    // Validar entrada
    if (!reservaId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'reservaId é obrigatório',
      });
    }

    // Buscar dados da reserva
    const resultadoReserva = await queryWithParams(
      `SELECT 
        r.id,
        r.hospede_id,
        r.quarto_id,
        h.hotel_id,
        r.data_checkin,
        r.data_checkout,
        r.status,
        q.numero as quarto_numero,
        h.nome as hospede_nome
       FROM reserva r
       LEFT JOIN quarto q ON r.quarto_id = q.id
       LEFT JOIN hospede h ON r.hospede_id = h.id
       WHERE r.id = @reservaId`,
      { reservaId }
    );

    const reserva = resultadoReserva.recordset?.[0];
    if (!reserva) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Reserva não encontrada',
      });
    }

    // Validar quarto
    if (!reserva.quarto_numero) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Quarto não associado à reserva',
      });
    }

    // Chamar API Yamamotto
    const hotelLogId = reserva.hotel_id || hotelId;
    const operacao = await invalidarCartaoCheckout({
      numeroQuarto: reserva.quarto_numero,
      tempoEspera,
      hotelId: gravadorHotelId,
      quantidade: quantidadeCartoes,
    });

    const validadeReferencia = reserva.data_checkout || new Date();

    await registrarEmissaoCredencial({
      reservaId: reserva.id,
      hospedeId: reserva.hospede_id,
      quartoId: reserva.quarto_id,
      quartoNumero: reserva.quarto_numero,
      hotelRef: hotelLogId,
      requestId: operacao.requestId || null,
      operationId: operacao.operationId,
      validadeInicio: reserva.data_checkin || validadeReferencia,
      validadeFim: validadeReferencia,
      quantidadeCartoes: quantidadeCartoes,
      tipoOperacao: 'checkout',
      statusOperacao: operacao.status || 'accepted',
      dados: {
        request: {
          reservaId: reserva.id,
          numeroQuarto: reserva.quarto_numero,
          tempoEspera,
          hotelId: gravadorHotelId,
          quantidade: quantidadeCartoes,
        },
        response: operacao,
      },
    });

    // Registrar log da operação
    await registrarLogReserva({
      hotelId: hotelLogId,
      reservaId: reserva.id,
      tipo: TIPOS_LOG_RESERVA.INVALIDAR_QUARTO,
      titulo: `Cartão do quarto ${reserva.quarto_numero} invalidado (checkout)`,
      descricao: `Acesso cancelado. Operação: ${operacao.operationId}`,
      metadados: { operationId: operacao.operationId, status: operacao.status },
    });

    return res.json({
      sucesso: true,
      mensagem: 'Cartão invalidado com sucesso',
      dados: {
        reservaId: reserva.id,
        operationId: operacao.operationId,
        status: operacao.status,
        quartoNumero: reserva.quarto_numero,
        quantidadeCartoes,
      },
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao invalidar quarto (checkout):', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro ao invalidar quarto',
      erro: erro.message,
    });
  }
}

/**
 * Recadastro de cartão (segunda via)
 * POST /hotel/:hotelId/liberar-quarto/recadastro
 * Fluxo: invalida credencial atual e emite nova credencial para a mesma reserva
 */
export async function recadastrarCartaoQuarto(req, res) {
  try {
    const { hotelId } = req.params;
    const {
      reservaId,
      tempoEspera = 3000,
      quantity = 1,
      motivo = 'Segunda via solicitada',
    } = req.body;

    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || 'master';
    const quantidadeCartoes = Math.max(1, Number(quantity || 1) || 1);

    if (!reservaId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'reservaId é obrigatório',
      });
    }

    const resultadoReserva = await queryWithParams(
      `SELECT
        r.id,
        r.hospede_id,
        r.quarto_id,
        h.hotel_id,
        r.data_checkin,
        r.data_checkout,
        r.status,
        q.numero as quarto_numero,
        h.nome as hospede_nome
       FROM reserva r
       LEFT JOIN quarto q ON r.quarto_id = q.id
       LEFT JOIN hospede h ON r.hospede_id = h.id
       WHERE r.id = @reservaId`,
      { reservaId },
    );

    const reserva = resultadoReserva.recordset?.[0];
    if (!reserva) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Reserva não encontrada',
      });
    }

    if (!reserva.quarto_numero) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Quarto não associado à reserva',
      });
    }

    const hotelLogId = reserva.hotel_id || hotelId;

    // 1) invalida cartão anterior
    const operacaoInvalidacao = await invalidarCartaoCheckout({
      numeroQuarto: reserva.quarto_numero,
      tempoEspera,
      hotelId: gravadorHotelId,
      quantidade: 1,
    });

    // 2) emite novo cartão
    const operacaoEmissao = await emitirCartaoCheckin({
      numeroQuarto: reserva.quarto_numero,
      dataCheckin: reserva.data_checkin.toISOString(),
      dataCheckout: reserva.data_checkout.toISOString(),
      hotelId: gravadorHotelId,
      waitMs: tempoEspera,
    });

    const validadeInicioSql = formatarDataHoraLocalSql(reserva.data_checkin);
    const validadeFimSql = formatarDataHoraLocalSql(reserva.data_checkout);
    const validadeReferencia = reserva.data_checkout || new Date();

    await registrarEmissaoCredencial({
      reservaId: reserva.id,
      hospedeId: reserva.hospede_id,
      quartoId: reserva.quarto_id,
      quartoNumero: reserva.quarto_numero,
      hotelRef: hotelLogId,
      requestId: operacaoInvalidacao.requestId || null,
      operationId: operacaoInvalidacao.operationId,
      validadeInicio: reserva.data_checkin || validadeReferencia,
      validadeFim: validadeReferencia,
      quantidadeCartoes: 1,
      tipoOperacao: 'checkout',
      statusOperacao: operacaoInvalidacao.status || 'accepted',
      dados: {
        request: {
          reservaId: reserva.id,
          numeroQuarto: reserva.quarto_numero,
          tempoEspera,
          hotelId: gravadorHotelId,
          motivo,
        },
        response: operacaoInvalidacao,
      },
    });

    await registrarEmissaoCredencial({
      reservaId: reserva.id,
      hospedeId: reserva.hospede_id,
      quartoId: reserva.quarto_id,
      quartoNumero: reserva.quarto_numero,
      hotelRef: hotelLogId,
      requestId: operacaoEmissao.requestId || null,
      operationId: operacaoEmissao.operationId,
      validadeInicio: validadeInicioSql,
      validadeFim: validadeFimSql,
      quantidadeCartoes,
      tipoOperacao: 'issue',
      statusOperacao: operacaoEmissao.status || 'accepted',
      dados: {
        request: {
          reservaId: reserva.id,
          numeroQuarto: reserva.quarto_numero,
          dataCheckin: reserva.data_checkin.toISOString(),
          dataCheckout: reserva.data_checkout.toISOString(),
          hotelId: gravadorHotelId,
          motivo,
          quantidade: quantidadeCartoes,
        },
        response: operacaoEmissao,
      },
    });

    await registrarLogReserva({
      hotelId: hotelLogId,
      reservaId: reserva.id,
      tipo: TIPOS_LOG_RESERVA.LIBERAR_QUARTO,
      titulo: `Recadastro de cartão do quarto ${reserva.quarto_numero}`,
      descricao: `Cartão anterior invalidado e nova credencial emitida. Motivo: ${motivo}`,
      dados: {
        motivo,
        invalidateOperationId: operacaoInvalidacao.operationId,
        issueOperationId: operacaoEmissao.operationId,
      },
    });

    return res.json({
      sucesso: true,
      mensagem: 'Recadastro iniciado com sucesso',
      dados: {
        reservaId: reserva.id,
        quartoNumero: reserva.quarto_numero,
        operationId: operacaoEmissao.operationId,
        issueOperationId: operacaoEmissao.operationId,
        invalidateOperationId: operacaoInvalidacao.operationId,
        status: operacaoEmissao.status,
        quantidadeCartoes,
      },
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao recadastrar cartão:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro ao recadastrar cartão',
      erro: erro.message,
    });
  }
}

/**
 * Estender validade do cartão
 * POST /hotel/:hotelId/liberar-quarto/extend
 * Estende a validade do cartão quando há extensão de estadia
 */
export async function estenderCartaoQuarto(req, res) {
  try {
    const { hotelId } = req.params;
    const { reservaId } = req.body;
    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || 'master';

    // Validar entrada
    if (!reservaId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'reservaId é obrigatório',
      });
    }

    // Buscar dados da reserva
    const resultadoReserva = await queryWithParams(
      `SELECT 
        r.id,
        r.hospede_id,
        r.quarto_id,
        h.hotel_id,
        r.data_checkin,
        r.data_checkout,
        r.status,
        q.numero as quarto_numero,
        h.nome as hospede_nome
       FROM reserva r
       LEFT JOIN quarto q ON r.quarto_id = q.id
       LEFT JOIN hospede h ON r.hospede_id = h.id
       WHERE r.id = @reservaId`,
      { reservaId }
    );

    const reserva = resultadoReserva.recordset?.[0];
    if (!reserva) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Reserva não encontrada',
      });
    }

    // Validar quarto
    if (!reserva.quarto_numero) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Quarto não associado à reserva',
      });
    }

    // Chamar API Yamamotto
    const hotelLogId = reserva.hotel_id || hotelId;
    const operacao = await estenderValidadeCartao({
      numeroQuarto: reserva.quarto_numero,
      dataCheckin: reserva.data_checkin.toISOString(),
      dataCheckout: reserva.data_checkout.toISOString(),
      hotelId: gravadorHotelId,
    });

    // Registrar log da operação
    await registrarLogReserva({
      hotelId: hotelLogId,
      reservaId: reserva.id,
      tipo: TIPOS_LOG_RESERVA.ESTENDER_CARTAO,
      titulo: `Validade do cartão estendida (quarto ${reserva.quarto_numero})`,
      descricao: `Nova data de saída: ${reserva.data_checkout}. Operação: ${operacao.operationId}`,
      metadados: { operationId: operacao.operationId, status: operacao.status },
    });

    return res.json({
      sucesso: true,
      mensagem: 'Cartão estendido com sucesso',
      dados: {
        reservaId: reserva.id,
        operationId: operacao.operationId,
        status: operacao.status,
        quartoNumero: reserva.quarto_numero,
        novaDataCheckout: reserva.data_checkout,
      },
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao estender cartão:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro ao estender cartão',
      erro: erro.message,
    });
  }
}

/**
 * Consultar status de uma operação
 * GET /hotel/:hotelId/liberar-quarto/status/:operationId
 */
export async function consultarStatusQuarto(req, res) {
  try {
    const { operationId } = req.params;

    if (!operationId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'operationId é obrigatório',
      });
    }

    const status = await consultarStatusOperacao(operationId);
    const emissao = await buscarEmissaoCredencialPorOperationId(operationId);

    if (emissao) {
      await atualizarStatusEmissaoCredencial({
        operationId,
        statusOperacao: status.status,
        cardSnr: status.cardSnr || null,
      });

      const reservaAtualizada = await finalizarCheckoutDaReservaSeNecessario(emissao, status.status);

      if (reservaAtualizada) {
        return res.json({
          sucesso: true,
          dados: {
            operationId: status.operationId,
            requestId: status.requestId,
            type: status.type,
            status: status.status,
            message: status.message,
            cardSnr: status.cardSnr,
            room: status.room,
            createdAtUtc: status.createdAtUtc,
            updatedAtUtc: status.updatedAtUtc,
            reserva: reservaAtualizada,
          },
        });
      }
    }

    return res.json({
      sucesso: true,
      dados: {
        operationId: status.operationId,
        requestId: status.requestId,
        type: status.type,
        status: status.status,
        message: status.message,
        cardSnr: status.cardSnr,
        room: status.room,
        createdAtUtc: status.createdAtUtc,
        updatedAtUtc: status.updatedAtUtc,
      },
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao consultar status:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro ao consultar status',
      erro: erro.message,
    });
  }
}

/**
 * Listar todas as operações pendentes de uma reserva
 * GET /hotel/:hotelId/liberar-quarto/reserva/:reservaId
 */
export async function listarOperacoesReserva(req, res) {
  try {
    const { hotelId, reservaId } = req.params;

    // Buscar logs de operações da reserva
    const resultado = await queryWithParams(
      `SELECT 
        id,
        reserva_id,
        tipo,
        titulo,
        descricao,
        metadados,
        criado_em
       FROM reserva_evento_log
       WHERE reserva_id = @reservaId 
         AND tipo IN ('liberar_quarto', 'invalidar_quarto', 'estender_cartao')
       ORDER BY criado_em DESC`,
      { reservaId }
    );

    return res.json({
      sucesso: true,
      dados: resultado.recordset || [],
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao listar operações:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro ao listar operações',
      erro: erro.message,
    });
  }
}

export default {
  liberarQuartoCheckin,
  invalidarQuartoCheckout,
  recadastrarCartaoQuarto,
  estenderCartaoQuarto,
  consultarStatusQuarto,
  listarOperacoesReserva,
  emitirCartaoAdicionalQuarto,
  lerCartaoQuarto,
  registrarCartaoPerdidoQuarto,
  atualizarSnrOperacao,
  agenteBuscarProxima,
  agenteHeartbeat,
  agenteEnviarResultado,
};

// ─── Cartão Adicional ─────────────────────────────────────────────────────────

/**
 * Emitir cartão adicional sem invalidar os anteriores
 * POST /hotel/:hotelId/liberar-quarto/additional
 */
export async function emitirCartaoAdicionalQuarto(req, res) {
  try {
    const { hotelId } = req.params;
    const { reservaId, quantity = 1 } = req.body;
    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || 'master';
    const gravadorWaitMs = Number(process.env.YAMAMOTTO_WAIT_MS || 5000);
    const quantidadeCartoes = Math.max(1, Number(quantity || 1) || 1);

    if (!reservaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'reservaId é obrigatório' });
    }

    const resultadoReserva = await queryWithParams(
      `SELECT r.id, r.hospede_id, r.quarto_id, h.hotel_id,
              r.data_checkin, r.data_checkout, q.numero as quarto_numero, h.nome as hospede_nome
       FROM reserva r
       LEFT JOIN quarto q ON r.quarto_id = q.id
       LEFT JOIN hospede h ON r.hospede_id = h.id
       WHERE r.id = @reservaId`,
      { reservaId }
    );

    const reserva = resultadoReserva.recordset?.[0];
    if (!reserva) return res.status(404).json({ sucesso: false, mensagem: 'Reserva não encontrada' });
    if (!reserva.quarto_numero) return res.status(400).json({ sucesso: false, mensagem: 'Quarto não associado à reserva' });

    const hotelLogId = reserva.hotel_id || hotelId;
    const operacao = await emitirCartaoAdicional({
      numeroQuarto: reserva.quarto_numero,
      dataCheckin: reserva.data_checkin.toISOString(),
      dataCheckout: reserva.data_checkout.toISOString(),
      hotelId: gravadorHotelId,
      waitMs: gravadorWaitMs,
      quantidade: quantidadeCartoes,
    });

    const validadeInicioSql = formatarDataHoraLocalSql(reserva.data_checkin);
    const validadeFimSql = formatarDataHoraLocalSql(reserva.data_checkout);

    await registrarEmissaoCredencial({
      reservaId: reserva.id,
      hospedeId: reserva.hospede_id,
      quartoId: reserva.quarto_id,
      quartoNumero: reserva.quarto_numero,
      hotelRef: hotelLogId,
      requestId: operacao.requestId || null,
      operationId: operacao.operationId,
      validadeInicio: validadeInicioSql,
      validadeFim: validadeFimSql,
      quantidadeCartoes,
      tipoOperacao: 'additional',
      statusOperacao: operacao.status,
      dados: { request: { reservaId: reserva.id, numeroQuarto: reserva.quarto_numero, quantidade: quantidadeCartoes }, response: operacao },
    });

    await registrarLogReserva({
      hotelId: hotelLogId,
      reservaId: reserva.id,
      tipo: TIPOS_LOG_RESERVA.LIBERAR_QUARTO,
      titulo: `Cartão adicional emitido (quarto ${reserva.quarto_numero})`,
      descricao: `Cartão adicional sem invalidar anteriores. Operação: ${operacao.operationId}`,
      metadados: { operationId: operacao.operationId, status: operacao.status, quantidade: quantidadeCartoes },
    });

    return res.json({
      sucesso: true,
      mensagem: 'Cartão adicional emitido com sucesso',
      dados: {
        reservaId: reserva.id,
        operationId: operacao.operationId,
        operationIds: operacao.operationIds || null,
        status: operacao.status,
        quartoNumero: reserva.quarto_numero,
        quantidadeCartoes,
      },
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao emitir cartão adicional:', erro);
    return res.status(500).json({ sucesso: false, mensagem: erro.message || 'Erro ao emitir cartão adicional', erro: erro.message });
  }
}

// ─── Leitura de Cartão ────────────────────────────────────────────────────────

/**
 * Solicitar leitura do cartão no encoder
 * POST /hotel/:hotelId/liberar-quarto/read-card
 * O resultado final (room, cardSnr) fica disponível em GET /liberar-quarto/status/:operationId
 */
export async function lerCartaoQuarto(req, res) {
  try {
    const { hotelId } = req.params;
    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || 'master';
    const gravadorWaitMs = Number(process.env.YAMAMOTTO_WAIT_MS || 5000);

    const operacao = await solicitarLeituraCartao({
      hotelId: gravadorHotelId,
      waitMs: gravadorWaitMs,
    });

    return res.json({
      sucesso: true,
      mensagem: 'Leitura de cartão solicitada. Consulte o status via operationId para obter room e cardSnr.',
      dados: {
        operationId: operacao.operationId,
        status: operacao.status,
        requestId: operacao.requestId,
      },
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao solicitar leitura de cartão:', erro);
    return res.status(500).json({ sucesso: false, mensagem: erro.message || 'Erro ao solicitar leitura', erro: erro.message });
  }
}

// ─── Cartão Perdido ───────────────────────────────────────────────────────────

/**
 * Fluxo de perda de cartão
 * POST /hotel/:hotelId/liberar-quarto/lost-card
 * Invalida o anterior e emite novo cartão
 */
export async function registrarCartaoPerdidoQuarto(req, res) {
  try {
    const { hotelId } = req.params;
    const { reservaId, previousCardSnr } = req.body;
    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || 'master';
    const gravadorWaitMs = Number(process.env.YAMAMOTTO_WAIT_MS || 5000);

    if (!reservaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'reservaId é obrigatório' });
    }

    const resultadoReserva = await queryWithParams(
      `SELECT r.id, r.hospede_id, r.quarto_id, h.hotel_id,
              r.data_checkin, r.data_checkout, q.numero as quarto_numero, h.nome as hospede_nome
       FROM reserva r
       LEFT JOIN quarto q ON r.quarto_id = q.id
       LEFT JOIN hospede h ON r.hospede_id = h.id
       WHERE r.id = @reservaId`,
      { reservaId }
    );

    const reserva = resultadoReserva.recordset?.[0];
    if (!reserva) return res.status(404).json({ sucesso: false, mensagem: 'Reserva não encontrada' });
    if (!reserva.quarto_numero) return res.status(400).json({ sucesso: false, mensagem: 'Quarto não associado à reserva' });

    const hotelLogId = reserva.hotel_id || hotelId;
    const operacao = await registrarCartaoPerdido({
      numeroQuarto: reserva.quarto_numero,
      dataCheckin: reserva.data_checkin.toISOString(),
      dataCheckout: reserva.data_checkout.toISOString(),
      hotelId: gravadorHotelId,
      waitMs: gravadorWaitMs,
      previousCardSnr: previousCardSnr || undefined,
    });

    const validadeInicioSql = formatarDataHoraLocalSql(reserva.data_checkin);
    const validadeFimSql = formatarDataHoraLocalSql(reserva.data_checkout);

    await registrarEmissaoCredencial({
      reservaId: reserva.id,
      hospedeId: reserva.hospede_id,
      quartoId: reserva.quarto_id,
      quartoNumero: reserva.quarto_numero,
      hotelRef: hotelLogId,
      requestId: operacao.requestId || null,
      operationId: operacao.operationId,
      validadeInicio: validadeInicioSql,
      validadeFim: validadeFimSql,
      quantidadeCartoes: 1,
      tipoOperacao: 'lost-card',
      statusOperacao: operacao.status,
      dados: { request: { reservaId: reserva.id, numeroQuarto: reserva.quarto_numero, previousCardSnr }, response: operacao },
    });

    await registrarLogReserva({
      hotelId: hotelLogId,
      reservaId: reserva.id,
      tipo: TIPOS_LOG_RESERVA.LIBERAR_QUARTO,
      titulo: `Perda de cartão registrada (quarto ${reserva.quarto_numero})`,
      descricao: `Cartão anterior invalidado e novo emitido. Operação: ${operacao.operationId}`,
      metadados: { operationId: operacao.operationId, operationIds: operacao.operationIds, status: operacao.status, previousCardSnr },
    });

    return res.json({
      sucesso: true,
      mensagem: 'Cartão perdido registrado e novo emitido com sucesso',
      dados: {
        reservaId: reserva.id,
        operationId: operacao.operationId,
        operationIds: operacao.operationIds || null,
        status: operacao.status,
        quartoNumero: reserva.quarto_numero,
      },
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao registrar cartão perdido:', erro);
    return res.status(500).json({ sucesso: false, mensagem: erro.message || 'Erro ao registrar cartão perdido', erro: erro.message });
  }
}

// ─── Atualizar SNR ────────────────────────────────────────────────────────────

/**
 * Atualizar SNR do cartão manualmente
 * PATCH /hotel/:hotelId/liberar-quarto/status/:operationId/cardsnr
 */
export async function atualizarSnrOperacao(req, res) {
  try {
    const { operationId } = req.params;
    const { cardSnr } = req.body;

    if (!operationId || !cardSnr) {
      return res.status(400).json({ sucesso: false, mensagem: 'operationId e cardSnr são obrigatórios' });
    }

    const resultado = await atualizarCardSnr(operationId, cardSnr);

    await atualizarStatusEmissaoCredencial({ operationId, cardSnr });

    return res.json({
      sucesso: true,
      mensagem: 'cardSnr atualizado com sucesso',
      dados: resultado,
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao atualizar cardSnr:', erro);
    return res.status(500).json({ sucesso: false, mensagem: erro.message || 'Erro ao atualizar cardSnr', erro: erro.message });
  }
}

// ─── Endpoints do Agente ──────────────────────────────────────────────────────

/**
 * Buscar próxima operação pendente para o agente
 * GET /hotel/:hotelId/liberar-quarto/agent/next
 */
export async function agenteBuscarProxima(req, res) {
  try {
    const { hotelId } = req.params;
    const agentId = req.query.agentId || process.env.YAMAMOTTO_AGENT_ID || 'AGENT-DEFAULT';
    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || hotelId || 'master';

    const operacao = await buscarProximaOperacaoAgente({ agentId, hotelId: gravadorHotelId });

    if (!operacao) {
      return res.status(204).send();
    }

    return res.json({
      sucesso: true,
      dados: operacao,
    });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao buscar próxima operação agente:', erro);
    return res.status(500).json({ sucesso: false, mensagem: erro.message || 'Erro ao buscar operação', erro: erro.message });
  }
}

/**
 * Registrar heartbeat do agente
 * POST /hotel/:hotelId/liberar-quarto/agent/heartbeat
 */
export async function agenteHeartbeat(req, res) {
  try {
    const { hotelId } = req.params;
    const { agentId, machineName } = req.body;
    const gravadorHotelId = process.env.YAMAMOTTO_HOTEL_ID || hotelId || 'master';
    const resolvedAgentId = agentId || process.env.YAMAMOTTO_AGENT_ID || 'AGENT-DEFAULT';

    const resultado = await registrarHeartbeatAgente({
      agentId: resolvedAgentId,
      hotelId: gravadorHotelId,
      machineName: machineName || 'unknown',
    });

    return res.json({ sucesso: true, dados: resultado });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro no heartbeat agente:', erro);
    return res.status(500).json({ sucesso: false, mensagem: erro.message || 'Erro no heartbeat', erro: erro.message });
  }
}

/**
 * Enviar resultado de operação executada pelo agente
 * POST /hotel/:hotelId/liberar-quarto/agent/:operationId/result
 */
export async function agenteEnviarResultado(req, res) {
  try {
    const { operationId } = req.params;
    const { agentId, success, message, cardSnr, room, checkin, checkout } = req.body;

    if (!operationId || agentId === undefined || success === undefined) {
      return res.status(400).json({ sucesso: false, mensagem: 'operationId, agentId e success são obrigatórios' });
    }

    const resultado = await enviarResultadoOperacaoAgente({
      operationId,
      agentId: agentId || process.env.YAMAMOTTO_AGENT_ID || 'AGENT-DEFAULT',
      success: Boolean(success),
      message: message || '',
      cardSnr,
      room,
      checkin,
      checkout,
    });

    const emissao = await buscarEmissaoCredencialPorOperationId(operationId);
    if (emissao) {
      await atualizarStatusEmissaoCredencial({
        operationId,
        statusOperacao: resultado.status || (success ? 'completed' : 'failed'),
        cardSnr: cardSnr || null,
      });
    }

    return res.json({ sucesso: true, dados: resultado });
  } catch (erro) {
    console.error('[LIBERAR-QUARTO] Erro ao enviar resultado agente:', erro);
    return res.status(500).json({ sucesso: false, mensagem: erro.message || 'Erro ao enviar resultado', erro: erro.message });
  }
}
