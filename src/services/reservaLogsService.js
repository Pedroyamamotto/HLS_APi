import { queryWithParams } from '../utils/database.js';

let tabelaLogsGarantida = false;

export const TIPOS_LOG_RESERVA = {
  RESERVA_CRIADA: 'reserva_criada',
  LANCAMENTO_CONSUMO: 'lancamento_consumo',
  CONSUMO_REMOVIDO: 'consumo_removido',
  CHECKIN: 'checkin',
  CHECKOUT: 'checkout',
  LIMPEZA: 'limpeza',
  STATUS_RESERVA: 'status_reserva',
  LIBERAR_QUARTO: 'liberar_quarto',
  INVALIDAR_QUARTO: 'invalidar_quarto',
  ESTENDER_CARTAO: 'estender_cartao',
};

export async function garantirTabelaLogsReserva() {
  if (tabelaLogsGarantida) return;

  await queryWithParams(`
    IF OBJECT_ID('reserva_evento_log', 'U') IS NULL
    BEGIN
      CREATE TABLE reserva_evento_log (
        id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        hotel_id UNIQUEIDENTIFIER NOT NULL,
        reserva_id UNIQUEIDENTIFIER NULL,
        quarto_id UNIQUEIDENTIFIER NULL,
        hospede_id UNIQUEIDENTIFIER NULL,
        tipo NVARCHAR(60) NOT NULL,
        titulo NVARCHAR(140) NOT NULL,
        descricao NVARCHAR(500) NULL,
        referencia_tipo NVARCHAR(60) NULL,
        referencia_id UNIQUEIDENTIFIER NULL,
        dados_json NVARCHAR(MAX) NULL,
        criado_em DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );

      CREATE INDEX IX_reserva_evento_log_hotel_criado_em
        ON reserva_evento_log (hotel_id, criado_em DESC);

      CREATE INDEX IX_reserva_evento_log_reserva_criado_em
        ON reserva_evento_log (reserva_id, criado_em DESC);

      CREATE INDEX IX_reserva_evento_log_quarto_criado_em
        ON reserva_evento_log (quarto_id, criado_em DESC);
    END
  `);

  tabelaLogsGarantida = true;
}

async function obterReservaAtivaPorQuarto({ hotelId, quartoId }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        r.id,
        r.hospede_id,
        r.quarto_id
     FROM reserva r
     INNER JOIN hospede h ON h.id = r.hospede_id
     WHERE h.hotel_id = @hotelId
       AND r.quarto_id = @quartoId
     ORDER BY
       CASE
         WHEN LOWER(r.status) IN ('confirmada', 'check-in', 'ocupado')
          AND CONVERT(date, GETDATE()) BETWEEN CONVERT(date, r.data_checkin) AND CONVERT(date, r.data_checkout)
         THEN 0
         ELSE 1
       END,
       r.data_checkin DESC,
       r.data_checkout DESC`,
    { hotelId, quartoId },
  );

  return resultado.recordset[0] || null;
}

export async function registrarLogReserva({
  hotelId,
  reservaId = null,
  quartoId = null,
  hospedeId = null,
  tipo,
  titulo,
  descricao = null,
  referenciaTipo = null,
  referenciaId = null,
  dados = null,
}) {
  await garantirTabelaLogsReserva();

  let reservaIdEfetivo = reservaId;
  let quartoIdEfetivo = quartoId;
  let hospedeIdEfetivo = hospedeId;

  if ((!reservaIdEfetivo || !hospedeIdEfetivo) && quartoIdEfetivo) {
    const reservaAtiva = await obterReservaAtivaPorQuarto({ hotelId, quartoId: quartoIdEfetivo });
    if (reservaAtiva) {
      reservaIdEfetivo = reservaIdEfetivo || reservaAtiva.id;
      hospedeIdEfetivo = hospedeIdEfetivo || reservaAtiva.hospede_id;
      quartoIdEfetivo = quartoIdEfetivo || reservaAtiva.quarto_id;
    }
  }

  const dadosJson = dados ? JSON.stringify(dados) : null;

  const resultado = await queryWithParams(
    `INSERT INTO reserva_evento_log (
        hotel_id,
        reserva_id,
        quarto_id,
        hospede_id,
        tipo,
        titulo,
        descricao,
        referencia_tipo,
        referencia_id,
        dados_json
     )
     OUTPUT INSERTED.id, INSERTED.hotel_id, INSERTED.reserva_id, INSERTED.quarto_id, INSERTED.hospede_id,
            INSERTED.tipo, INSERTED.titulo, INSERTED.descricao, INSERTED.referencia_tipo, INSERTED.referencia_id,
            INSERTED.dados_json, INSERTED.criado_em
     VALUES (
       @hotelId,
       @reservaId,
       @quartoId,
       @hospedeId,
       @tipo,
       @titulo,
       @descricao,
       @referenciaTipo,
       @referenciaId,
       @dadosJson
     )`,
    {
      hotelId,
      reservaId: reservaIdEfetivo,
      quartoId: quartoIdEfetivo,
      hospedeId: hospedeIdEfetivo,
      tipo,
      titulo,
      descricao,
      referenciaTipo,
      referenciaId,
      dadosJson,
    },
  );

  return resultado.recordset[0];
}

function parseDadosJson(valor) {
  if (!valor) return null;
  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

export async function listarLogsPorReserva({ hotelId, reservaId, limit = 200 }) {
  await garantirTabelaLogsReserva();

  const limiteNormalizado = Math.min(Math.max(Number(limit) || 200, 1), 500);

  const resultado = await queryWithParams(
    `SELECT TOP (@limit)
        l.id,
        l.hotel_id,
        l.reserva_id,
        l.quarto_id,
        l.hospede_id,
        l.tipo,
        l.titulo,
        l.descricao,
        l.referencia_tipo,
        l.referencia_id,
        l.dados_json,
        l.criado_em,
        r.codigo AS reserva_codigo,
        q.numero AS quarto_numero,
        h.nome AS hospede_nome
     FROM reserva_evento_log l
     LEFT JOIN reserva r ON r.id = l.reserva_id
     LEFT JOIN quarto q ON q.id = l.quarto_id
     LEFT JOIN hospede h ON h.id = l.hospede_id
     WHERE l.hotel_id = @hotelId
       AND l.reserva_id = @reservaId
     ORDER BY l.criado_em DESC`,
    { hotelId, reservaId, limit: limiteNormalizado },
  );

  return resultado.recordset.map((item) => ({
    ...item,
    dados: parseDadosJson(item.dados_json),
  }));
}

export async function listarLogsPorQuarto({ hotelId, quartoId, limit = 200 }) {
  await garantirTabelaLogsReserva();

  const limiteNormalizado = Math.min(Math.max(Number(limit) || 200, 1), 500);

  const resultado = await queryWithParams(
    `SELECT TOP (@limit)
        l.id,
        l.hotel_id,
        l.reserva_id,
        l.quarto_id,
        l.hospede_id,
        l.tipo,
        l.titulo,
        l.descricao,
        l.referencia_tipo,
        l.referencia_id,
        l.dados_json,
        l.criado_em,
        r.codigo AS reserva_codigo,
        q.numero AS quarto_numero,
        h.nome AS hospede_nome
     FROM reserva_evento_log l
     LEFT JOIN reserva r ON r.id = l.reserva_id
     LEFT JOIN quarto q ON q.id = l.quarto_id
     LEFT JOIN hospede h ON h.id = l.hospede_id
     WHERE l.hotel_id = @hotelId
       AND l.quarto_id = @quartoId
     ORDER BY l.criado_em DESC`,
    { hotelId, quartoId, limit: limiteNormalizado },
  );

  return resultado.recordset.map((item) => ({
    ...item,
    dados: parseDadosJson(item.dados_json),
  }));
}