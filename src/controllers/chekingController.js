import { criarOperacao } from '../services/yamamottoService.js';
import { queryWithParams } from '../utils/database.js';
import { registrarEmissaoCredencial, formatarDataHoraLocalSql } from '../services/credencialAcessoEmissaoService.js';

/**
 * POST /cheking/config/Chave
 * Recebe o payload do gravador e encaminha para a API Yamamotto (/operations/issue)
 */
export async function criarChave(req, res) {
  try {
    const body = req.body || {};

    // Campos esperados: requestId, room, checkin, checkout, hotelId, waitMs, quantity, reservaId
    if (!body.reservaId && !body.room) return res.status(400).json({ sucesso: false, mensagem: 'room ou reservaId é obrigatório' });
    if (!body.reservaId && !body.checkin) return res.status(400).json({ sucesso: false, mensagem: 'checkin é obrigatório' });
    if (!body.reservaId && !body.checkout) return res.status(400).json({ sucesso: false, mensagem: 'checkout é obrigatório' });
    if (!body.hotelId) return res.status(400).json({ sucesso: false, mensagem: 'hotelId é obrigatório' });

    const reservaEscolhida = body.reservaId
      ? await carregarReservaPorId(body.reservaId)
      : null;

    const room = reservaEscolhida?.quarto_numero || body.room;
    const dataCheckin = new Date(reservaEscolhida?.data_checkin || body.checkin);
    const dataCheckout = new Date(reservaEscolhida?.data_checkout || body.checkout);
    const dataCheckinSql = formatarDataHoraLocalSql(dataCheckin);
    const dataCheckoutSql = formatarDataHoraLocalSql(dataCheckout);
    const quantidadeCartoes = Number(body.quantity || 1);

    const payload = {
      requestId: body.requestId,
      room,
      checkin: dataCheckin.toISOString(),
      checkout: dataCheckout.toISOString(),
      hotelId: body.hotelId,
      waitMs: body.waitMs || 5000,
    };

    if (body.quantity) payload.quantity = Number(body.quantity);

    const resposta = await criarOperacao('issue', payload);

    const reservaEncontrada = await localizarReservaPorQuartoEDatas({
      room,
      dataCheckinSql,
      dataCheckoutSql,
    });

    await registrarEmissaoCredencial({
      reservaId: reservaEscolhida?.id || reservaEncontrada?.id || null,
      hospedeId: reservaEscolhida?.hospede_id || reservaEncontrada?.hospede_id || null,
      quartoId: reservaEscolhida?.quarto_id || reservaEncontrada?.quarto_id || null,
      quartoNumero: room,
      hotelRef: body.hotelId,
      requestId: body.requestId || null,
      operationId: resposta.operationId || null,
      operationIds: resposta.operationIds || [],
      validadeInicio: dataCheckinSql,
      validadeFim: dataCheckoutSql,
      quantidadeCartoes,
      tipoOperacao: 'issue',
      statusOperacao: resposta.status || 'accepted',
      dados: {
        request: body,
        response: resposta,
      },
    });

    return res.status(201).json({ sucesso: true, dados: resposta });
  } catch (erro) {
    console.error('[CHEKING] Erro criarChave:', erro);
    return res.status(500).json({ sucesso: false, mensagem: erro.message || 'Erro ao criar chave' });
  }
}

async function carregarReservaPorId(reservaId) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        r.id,
        r.hospede_id,
        r.quarto_id,
        r.data_checkin,
        r.data_checkout,
        q.numero AS quarto_numero
     FROM reserva r
     INNER JOIN quarto q ON q.id = r.quarto_id
     WHERE r.id = @reservaId`,
    { reservaId },
  );

  return resultado.recordset?.[0] || null;
}

async function localizarReservaPorQuartoEDatas({ room, dataCheckinSql, dataCheckoutSql }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        r.id,
        r.hospede_id,
        r.quarto_id,
        r.data_checkin,
        r.data_checkout,
        q.numero AS quarto_numero
     FROM reserva r
     INNER JOIN quarto q ON q.id = r.quarto_id
     WHERE q.numero = @room
       AND r.data_checkin = @dataCheckin
       AND r.data_checkout = @dataCheckout
     ORDER BY r.data_checkin DESC`,
    {
      room,
      dataCheckin: dataCheckinSql,
      dataCheckout: dataCheckoutSql,
    },
  );

  if (resultado.recordset?.length) return resultado.recordset[0];

  const fallback = await queryWithParams(
    `SELECT TOP 1
        r.id,
        r.hospede_id,
        r.quarto_id,
        r.data_checkin,
        r.data_checkout,
        q.numero AS quarto_numero
     FROM reserva r
     INNER JOIN quarto q ON q.id = r.quarto_id
     WHERE q.numero = @room
     ORDER BY r.data_checkin DESC`,
    { room },
  );

  return fallback.recordset?.[0] || null;
}

export default { criarChave };
