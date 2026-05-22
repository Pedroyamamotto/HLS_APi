import { queryWithParams } from '../utils/database.js';
import { registrarLogReserva, TIPOS_LOG_RESERVA } from './reservaLogsService.js';
import { registrarPagamentoCheckoutFinanceiro } from './financeiroService.js';

// Listar todas as reservas
export async function listarReservas() {
  const resultado = await queryWithParams(
    `SELECT 
      r.id,
      r.hospede_id,
      r.quarto_id,
      r.data_checkin,
      r.data_checkout,
      r.qtd_adultos,
      r.qtd_criancas,
      r.valor,
      r.codigo,
      r.status,
      r.canal,
      h.nome as hospede_nome,
      h.email as hospede_email,
      h.cpf as hospede_cpf,
      q.numero as quarto_numero,
      a.numero as andar_numero,
      a.nome as andar_nome,
      q.categoria_id,
      cat.descricao as categoria_descricao
     FROM reserva r
     LEFT JOIN hospede h ON r.hospede_id = h.id
     LEFT JOIN quarto q ON r.quarto_id = q.id
         LEFT JOIN andar a ON q.andar_id = a.id
     LEFT JOIN categoria_quarto cat ON q.categoria_id = cat.id
     ORDER BY r.data_checkin DESC`,
    {}
  );

  return resultado.recordset;
}

// Listar reservas por hotel
export async function listarReservasPorHotel({ hotelId }) {
  const resultado = await queryWithParams(
    `SELECT 
      r.id,
      r.hospede_id,
      r.quarto_id,
      r.data_checkin,
      r.data_checkout,
      r.qtd_adultos,
      r.qtd_criancas,
      r.valor,
      r.codigo,
      r.status,
      r.canal,
      h.nome as hospede_nome,
      h.email as hospede_email,
      h.cpf as hospede_cpf,
      q.numero as quarto_numero,
      a.numero as andar_numero,
      a.nome as andar_nome,
      q.categoria_id,
      cat.descricao as categoria_descricao
     FROM reserva r
     LEFT JOIN hospede h ON r.hospede_id = h.id
     LEFT JOIN quarto q ON r.quarto_id = q.id
         LEFT JOIN andar a ON q.andar_id = a.id
     LEFT JOIN categoria_quarto cat ON q.categoria_id = cat.id
     WHERE h.hotel_id = @hotelId
     ORDER BY r.data_checkin DESC`,
    { hotelId }
  );

  return resultado.recordset;
}

// Obter reserva por ID
export async function obterReservaPorId({ id }) {
  const resultado = await queryWithParams(
    `SELECT 
      r.id,
      r.hospede_id,
      r.quarto_id,
      r.data_checkin,
      r.data_checkout,
      r.qtd_adultos,
      r.qtd_criancas,
      r.valor,
      r.codigo,
      r.status,
      r.canal,
      h.nome as hospede_nome,
      h.email as hospede_email,
      h.cpf as hospede_cpf,
      h.hotel_id,
      q.numero as quarto_numero,
      a.numero as andar_numero,
      a.nome as andar_nome,
      q.categoria_id,
      cat.descricao as categoria_descricao
     FROM reserva r
     LEFT JOIN hospede h ON r.hospede_id = h.id
     LEFT JOIN quarto q ON r.quarto_id = q.id
         LEFT JOIN andar a ON q.andar_id = a.id
     LEFT JOIN categoria_quarto cat ON q.categoria_id = cat.id
     WHERE r.id = @id`,
    { id }
  );

  if (!resultado.recordset || resultado.recordset.length === 0) {
    throw new Error('Reserva não encontrada');
  }

  return resultado.recordset[0];
}

async function validarQuartoDisponivel({ hotelId, quartoId, dataCheckin, dataCheckout }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        r.id,
        r.status,
        r.data_checkin,
        r.data_checkout,
        q.numero
     FROM reserva r
     INNER JOIN quarto q ON q.id = r.quarto_id
     INNER JOIN andar a ON a.id = q.andar_id
     WHERE a.hotel_id = @hotelId
       AND r.quarto_id = @quartoId
       AND LOWER(r.status) NOT IN ('cancelada', 'cancelado', 'finalizado', 'finalizada')
       AND r.data_checkin < @dataCheckout
       AND r.data_checkout > @dataCheckin`,
    {
      hotelId,
      quartoId,
      dataCheckin: new Date(dataCheckin),
      dataCheckout: new Date(dataCheckout),
    }
  );

  if (resultado.recordset.length > 0) {
    throw new Error('Quarto já está reservado para este período');
  }
}

async function validarQuartoDisponivelNaEdicao({ hotelId, quartoId, dataCheckin, dataCheckout, reservationId }) {
  const resultado = await queryWithParams(
    `SELECT
        r.id,
        r.hospede_id,
        r.status,
        r.data_checkin,
        r.data_checkout,
        q.numero
     FROM reserva r
     INNER JOIN quarto q ON q.id = r.quarto_id
     INNER JOIN andar a ON a.id = q.andar_id
     WHERE a.hotel_id = @hotelId
       AND r.quarto_id = @quartoId
       AND r.id <> @reservationId
       AND LOWER(r.status) NOT IN ('cancelada', 'cancelado', 'finalizado', 'finalizada')
       AND r.data_checkin < @dataCheckout
       AND r.data_checkout > @dataCheckin`,
    {
      hotelId,
      quartoId,
      reservationId,
      dataCheckin: new Date(dataCheckin),
      dataCheckout: new Date(dataCheckout),
    }
  );

  if (resultado.recordset.length > 0) {
    throw new Error('Quarto já está reservado para este período');
  }
}

function dataSomenteDia(valor) {
  if (!valor) return null;
  return new Date(valor).toISOString().slice(0, 10);
}

function conflitosSaoDuplicidadeDaReservaAtual(conflitos, reservaAtual) {
  if (!conflitos?.length || !reservaAtual) return false;

  const checkinAtual = dataSomenteDia(reservaAtual.data_checkin);
  const checkoutAtual = dataSomenteDia(reservaAtual.data_checkout);

  return conflitos.every((conflito) => {
    const mesmoHospede = conflito.hospede_id === reservaAtual.hospede_id;
    const mesmoPeriodoOriginal =
      dataSomenteDia(conflito.data_checkin) === checkinAtual &&
      dataSomenteDia(conflito.data_checkout) === checkoutAtual;

    return mesmoHospede && mesmoPeriodoOriginal;
  });
}

async function atualizarStatusQuarto({ hotelId, quartoId, status = 'ocupado' }) {
  const resultado = await queryWithParams(
    `UPDATE quarto
     SET status = @status
     OUTPUT INSERTED.id, INSERTED.status
     WHERE id = @quartoId
       AND EXISTS (
         SELECT 1
         FROM andar a
         WHERE a.id = quarto.andar_id
           AND a.hotel_id = @hotelId
       )`,
    {
      hotelId,
      quartoId,
      status,
    }
  );

  if (!resultado.recordset || resultado.recordset.length === 0) {
    throw new Error('Quarto não encontrado no hotel informado');
  }

  return resultado.recordset[0];
}

async function sincronizarStatusQuartoComReservasAtivas({ hotelId, quartoId }) {
  const reservasAtivas = await queryWithParams(
    `SELECT COUNT(1) AS total
     FROM reserva
     WHERE quarto_id = @quartoId
       AND LOWER(status) NOT IN ('cancelada', 'cancelado', 'finalizado', 'finalizada', 'check-out', 'no-show')`,
    { quartoId }
  );

  const totalAtivas = Number(reservasAtivas.recordset?.[0]?.total || 0);
  const novoStatus = totalAtivas > 0 ? 'ocupado' : 'livre';

  await atualizarStatusQuarto({ hotelId, quartoId, status: novoStatus });
}

/**
 * Normaliza o valor da reserva: detecta conversões erradas (divisão/multiplicação por 10/100)
 * e opcionalmente calcula automaticamente baseado na diária do quarto.
 * 
 * Casos tratados:
 * - Se valor < diária por 10x ou mais, multiplica por 10 (corrige divisão acidental)
 * - Se valor ≤ 0, calcula automaticamente (diasNoites × preco_diaria)
 * - Se valor é válido (> 0), retorna como está
 */
async function normalizarValorReserva({ valor, quartoId, dataCheckin, dataCheckout }) {
  let valorNormalizado = Number(valor);
  
  // Se valor está indefinido ou é 0, calcular automaticamente
  if (!Number.isFinite(valorNormalizado) || valorNormalizado <= 0) {
    const quarto = await queryWithParams(
      `SELECT TOP 1 
        c.preco_diaria
       FROM quarto q
       LEFT JOIN categoria_quarto c ON q.categoria_id = c.id
       WHERE q.id = @quartoId`,
      { quartoId }
    );

    if (quarto.recordset?.length === 0 || !quarto.recordset[0]?.preco_diaria) {
      // Se não conseguir obter preço, retornar 0 (sem erro - validação será feita depois)
      return 0;
    }

    const precoDiaria = Number(quarto.recordset[0].preco_diaria);
    const dataInicio = new Date(dataCheckin);
    const dataFim = new Date(dataCheckout);
    const diasNoites = Math.max(
      Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24)),
      1
    );

    valorNormalizado = Number((diasNoites * precoDiaria).toFixed(2));
    console.log(
      `[normalizarValorReserva] Cálculo automático: ${diasNoites} noites × R$${precoDiaria} = R$${valorNormalizado}`
    );
    return valorNormalizado;
  }

  // Verificar se valor está anormalmente pequeno (possível divisão por 10)
  const quarto = await queryWithParams(
    `SELECT TOP 1 
      c.preco_diaria
     FROM quarto q
     LEFT JOIN categoria_quarto c ON q.categoria_id = c.id
     WHERE q.id = @quartoId`,
    { quartoId }
  );

  if (quarto.recordset?.length > 0 && quarto.recordset[0]?.preco_diaria) {
    const precoDiaria = Number(quarto.recordset[0].preco_diaria);
    
    // Se valor < diária/10, pode ser que foi dividido por 10 erro
    // Ex: 36 reais (3 × 12) dividido por 10 = 3,60
    if (valorNormalizado > 0 && valorNormalizado < precoDiaria / 10 && precoDiaria > 10) {
      const valorCorrigido = Number((valorNormalizado * 10).toFixed(2));
      console.warn(
        `[normalizarValorReserva] ⚠️ Valor anormalmente baixo detectado: R$${valorNormalizado} vs diária R$${precoDiaria}. Corrigindo para R$${valorCorrigido} (×10).`
      );
      return valorCorrigido;
    }
  }

  return valorNormalizado;
}

// Criar reserva
export async function criarReserva({
  hotelId,
  hospedeId,
  quartoId,
  dataCheckin,
  dataCheckout,
  valor,
  qtdAdultos = 1,
  qtdCriancas = 0,
  canal = 'website',
  status = 'confirmada',
}) {
  if (!hotelId || !hospedeId || !quartoId || !dataCheckin || !dataCheckout) {
    throw new Error('Campos obrigatórios: hotelId, hospede_id, quarto_id, data_checkin, data_checkout');
  }

  await validarQuartoDisponivel({ hotelId, quartoId, dataCheckin, dataCheckout });

  // Normalizar/validar valor (detecta e corrige divisões erradas)
  const valorNormalizado = await normalizarValorReserva({
    valor,
    quartoId,
    dataCheckin,
    dataCheckout,
  });

  if (!Number.isFinite(valorNormalizado) || valorNormalizado <= 0) {
    throw new Error('Valor da reserva deve ser maior que 0 (não foi possível calcular automaticamente)');
  }

  // Gerar código único para a reserva
  const codigo = `RES-${Date.now()}`;

  const resultado = await queryWithParams(
    `INSERT INTO reserva (hospede_id, quarto_id, data_checkin, data_checkout, qtd_adultos, qtd_criancas, valor, codigo, status, canal)
     OUTPUT INSERTED.id, INSERTED.hospede_id, INSERTED.quarto_id, INSERTED.data_checkin, INSERTED.data_checkout, INSERTED.qtd_adultos, INSERTED.qtd_criancas, INSERTED.valor, INSERTED.codigo, INSERTED.status, INSERTED.canal
     VALUES (@hospedeId, @quartoId, @dataCheckin, @dataCheckout, @qtdAdultos, @qtdCriancas, @valor, @codigo, @status, @canal)`,
    {
      hospedeId,
      quartoId,
      dataCheckin: new Date(dataCheckin),
      dataCheckout: new Date(dataCheckout),
      qtdAdultos: parseInt(qtdAdultos) || 1,
      qtdCriancas: parseInt(qtdCriancas) || 0,
      valor: valorNormalizado,
      codigo,
      status,
      canal,
    }
  );

  if (!resultado.recordset || resultado.recordset.length === 0) {
    throw new Error('Erro ao criar reserva');
  }

  await sincronizarStatusQuartoComReservasAtivas({ hotelId, quartoId });

  try {
    await registrarLogReserva({
      hotelId,
      reservaId: resultado.recordset[0].id,
      quartoId,
      hospedeId,
      tipo: TIPOS_LOG_RESERVA.RESERVA_CRIADA,
      titulo: 'Reserva criada',
      descricao: `Reserva ${codigo} criada para o quarto informado.`,
      referenciaTipo: 'reserva',
      referenciaId: resultado.recordset[0].id,
      dados: {
        codigo,
        status,
        data_checkin: resultado.recordset[0].data_checkin,
        data_checkout: resultado.recordset[0].data_checkout,
      },
    });
  } catch (erroLog) {
    console.warn('Aviso ao registrar log de reserva criada:', erroLog?.message);
  }

  return resultado.recordset[0];
}

// Atualizar reserva
export async function atualizarReserva({
  id,
  hotelId,
  hospedeId,
  quartoId,
  dataCheckin,
  dataCheckout,
  valor,
  qtdAdultos,
  qtdCriancas,
  status,
  canal,
}) {
  const reservaAtual = await obterReservaPorId({ id });
  const camposAtualizacao = [];
  const params = { id };

  // Determinar valores finais para normalização
  const quartoIdFinal = quartoId || reservaAtual.quarto_id;
  const dataCheckinFinal = dataCheckin ? new Date(dataCheckin) : new Date(reservaAtual.data_checkin);
  const dataCheckoutFinal = dataCheckout ? new Date(dataCheckout) : new Date(reservaAtual.data_checkout);
  const datasAlteradas = dataCheckin !== undefined || dataCheckout !== undefined;

  if (hospedeId !== undefined) {
    camposAtualizacao.push('hospede_id = @hospedeId');
    params.hospedeId = hospedeId;
  }
  if (quartoId !== undefined) {
    camposAtualizacao.push('quarto_id = @quartoId');
    params.quartoId = quartoId;
  }
  if (dataCheckin !== undefined) {
    camposAtualizacao.push('data_checkin = @dataCheckin');
    params.dataCheckin = dataCheckinFinal;
  }
  if (dataCheckout !== undefined) {
    camposAtualizacao.push('data_checkout = @dataCheckout');
    params.dataCheckout = dataCheckoutFinal;
  }
  
  // Se datas foram alteradas e valor NÃO foi fornecido, recalcular automaticamente
  if (datasAlteradas && valor === undefined) {
    const valorRecalculado = await normalizarValorReserva({
      valor: 0, // Força cálculo automático
      quartoId: quartoIdFinal,
      dataCheckin: dataCheckinFinal,
      dataCheckout: dataCheckoutFinal,
    });
    if (Number.isFinite(valorRecalculado) && valorRecalculado > 0) {
      camposAtualizacao.push('valor = @valor');
      params.valor = valorRecalculado;
      console.log(
        `[atualizarReserva] Preço recalculado automaticamente ao atualizar datas: R$ ${valorRecalculado}`
      );
    }
  } else if (valor !== undefined) {
    // Se valor foi fornecido, normalizar/validar (detecta e corrige divisões erradas)
    const valorNormalizado = await normalizarValorReserva({
      valor,
      quartoId: quartoIdFinal,
      dataCheckin: dataCheckinFinal,
      dataCheckout: dataCheckoutFinal,
    });
    if (!Number.isFinite(valorNormalizado) || valorNormalizado <= 0) {
      throw new Error('Valor da reserva deve ser maior que 0');
    }
    camposAtualizacao.push('valor = @valor');
    params.valor = valorNormalizado;
  }
  if (qtdAdultos !== undefined) {
    camposAtualizacao.push('qtd_adultos = @qtdAdultos');
    params.qtdAdultos = parseInt(qtdAdultos);
  }
  if (qtdCriancas !== undefined) {
    camposAtualizacao.push('qtd_criancas = @qtdCriancas');
    params.qtdCriancas = parseInt(qtdCriancas);
  }
  if (status !== undefined) {
    camposAtualizacao.push('status = @status');
    params.status = status;
  }
  if (canal !== undefined) {
    camposAtualizacao.push('canal = @canal');
    params.canal = canal;
  }

  if (camposAtualizacao.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const quartoAnteriorId = reservaAtual.quarto_id;
  const hotelAnteriorId = reservaAtual.hotel_id;
  const hotelIdEfetivo = hotelId ?? reservaAtual.hotel_id;
  const quartoIdEfetivo = quartoId ?? reservaAtual.quarto_id;
  const dataCheckinEfetiva = dataCheckin ?? reservaAtual.data_checkin;
  const dataCheckoutEfetiva = dataCheckout ?? reservaAtual.data_checkout;

  if (hotelIdEfetivo && quartoIdEfetivo && dataCheckinEfetiva && dataCheckoutEfetiva) {
    const conflitos = await queryWithParams(
      `SELECT
          r.id,
          r.hospede_id,
          r.status,
          r.data_checkin,
          r.data_checkout,
          q.numero
       FROM reserva r
       INNER JOIN quarto q ON q.id = r.quarto_id
       INNER JOIN andar a ON a.id = q.andar_id
       WHERE a.hotel_id = @hotelId
         AND r.quarto_id = @quartoId
         AND r.id <> @reservationId
         AND LOWER(r.status) NOT IN ('cancelada', 'cancelado', 'finalizado', 'finalizada')
         AND r.data_checkin < @dataCheckout
         AND r.data_checkout > @dataCheckin`,
      {
        hotelId: hotelIdEfetivo,
        quartoId: quartoIdEfetivo,
        reservationId: id,
        dataCheckin: new Date(dataCheckinEfetiva),
        dataCheckout: new Date(dataCheckoutEfetiva),
      }
    );

    if (
      conflitos.recordset.length > 0 &&
      !conflitosSaoDuplicidadeDaReservaAtual(conflitos.recordset, reservaAtual)
    ) {
      throw new Error('Quarto já está reservado para este período');
    }
  }

  const resultado = await queryWithParams(
    `UPDATE reserva 
     SET ${camposAtualizacao.join(', ')}
     OUTPUT INSERTED.id, INSERTED.hospede_id, INSERTED.quarto_id, INSERTED.data_checkin, INSERTED.data_checkout, INSERTED.qtd_adultos, INSERTED.qtd_criancas, INSERTED.valor, INSERTED.codigo, INSERTED.status, INSERTED.canal
     WHERE id = @id`,
    params
  );

  if (!resultado.recordset || resultado.recordset.length === 0) {
    throw new Error('Reserva não encontrada');
  }

  if (hotelIdEfetivo && quartoIdEfetivo) {
    await sincronizarStatusQuartoComReservasAtivas({ hotelId: hotelIdEfetivo, quartoId: quartoIdEfetivo });
  }

  if (hotelAnteriorId && quartoAnteriorId && quartoAnteriorId !== quartoIdEfetivo) {
    await sincronizarStatusQuartoComReservasAtivas({ hotelId: hotelAnteriorId, quartoId: quartoAnteriorId });
  }

  return resultado.recordset[0];
}

// Deletar reserva
export async function deletarReserva({ id }) {
  // Primeiro verificar se existe
  const reservaAtual = await obterReservaPorId({ id });

  const resultado = await queryWithParams(
    `DELETE FROM reserva
     OUTPUT DELETED.id, DELETED.codigo
     WHERE id = @id`,
    { id }
  );

  if (!resultado.recordset || resultado.recordset.length === 0) {
    throw new Error('Reserva não encontrada');
  }

  if (reservaAtual.hotel_id && reservaAtual.quarto_id) {
    await sincronizarStatusQuartoComReservasAtivas({
      hotelId: reservaAtual.hotel_id,
      quartoId: reservaAtual.quarto_id,
    });
  }

  return resultado.recordset[0];
}

// Listar reservas por hóspede
export async function listarReservasPorHospede({ hospedeId }) {
  const resultado = await queryWithParams(
    `SELECT 
      r.id,
      r.hospede_id,
      r.quarto_id,
      r.data_checkin,
      r.data_checkout,
      r.qtd_adultos,
      r.qtd_criancas,
      r.valor,
      r.codigo,
      r.status,
      r.canal,
      q.numero as quarto_numero,
      a.numero as andar_numero,
      a.nome as andar_nome,
      q.categoria_id,
      cat.descricao as categoria_descricao
     FROM reserva r
     LEFT JOIN quarto q ON r.quarto_id = q.id
         LEFT JOIN andar a ON q.andar_id = a.id
     LEFT JOIN categoria_quarto cat ON q.categoria_id = cat.id
     WHERE r.hospede_id = @hospedeId
     ORDER BY r.data_checkin DESC`,
    { hospedeId }
  );

  return resultado.recordset;
}

// Atualizar status da reserva
export async function atualizarStatusReserva({ id, status }) {
  const statusValidos = ['confirmada', 'check-in', 'check-out', 'cancelada', 'cancelado', 'finalizada', 'finalizado', 'no-show'];

  if (!statusValidos.includes(status.toLowerCase())) {
    throw new Error(`Status inválido. Valores permitidos: ${statusValidos.join(', ')}`);
  }

  const reservaAtual = await obterReservaPorId({ id });

  const resultado = await queryWithParams(
    `UPDATE reserva 
     SET status = @status
     OUTPUT INSERTED.id, INSERTED.hospede_id, INSERTED.quarto_id, INSERTED.data_checkin, INSERTED.data_checkout, INSERTED.qtd_adultos, INSERTED.qtd_criancas, INSERTED.valor, INSERTED.codigo, INSERTED.status, INSERTED.canal
     WHERE id = @id`,
    { id, status }
  );

  if (!resultado.recordset || resultado.recordset.length === 0) {
    throw new Error('Reserva não encontrada');
  }

  if (reservaAtual.hotel_id && reservaAtual.quarto_id) {
    await sincronizarStatusQuartoComReservasAtivas({
      hotelId: reservaAtual.hotel_id,
      quartoId: reservaAtual.quarto_id,
    });
  }

  const statusAnterior = String(reservaAtual.status || '').toLowerCase();
  const statusNovo = String(resultado.recordset[0].status || '').toLowerCase();

  try {
    let tipo = TIPOS_LOG_RESERVA.STATUS_RESERVA;
    let titulo = 'Status da reserva atualizado';

    if (statusNovo === 'check-in') {
      tipo = TIPOS_LOG_RESERVA.CHECKIN;
      titulo = 'Check-in realizado';
    } else if (['check-out', 'finalizada', 'finalizado'].includes(statusNovo)) {
      tipo = TIPOS_LOG_RESERVA.CHECKOUT;
      titulo = 'Check-out realizado';
    }

    await registrarLogReserva({
      hotelId: reservaAtual.hotel_id,
      reservaId: resultado.recordset[0].id,
      quartoId: reservaAtual.quarto_id,
      hospedeId: resultado.recordset[0].hospede_id,
      tipo,
      titulo,
      descricao: `Status alterado de ${statusAnterior || 'indefinido'} para ${statusNovo}.`,
      referenciaTipo: 'reserva_status',
      referenciaId: resultado.recordset[0].id,
      dados: {
        status_anterior: reservaAtual.status,
        status_novo: resultado.recordset[0].status,
      },
    });
  } catch (erroLog) {
    console.warn('Aviso ao registrar log de status da reserva:', erroLog?.message);
  }

  let pagamentoFinanceiro = null;

  if (['check-out', 'finalizada', 'finalizado'].includes(statusNovo)) {
    pagamentoFinanceiro = await registrarPagamentoCheckoutFinanceiro({
      reservaId: resultado.recordset[0].id,
      dataPagamento: new Date(),
    });
  }

  return {
    ...resultado.recordset[0],
    pagamento_financeiro: pagamentoFinanceiro,
  };
}
