import { query, queryWithParams } from '../utils/database.js';

let tabelaLogsGarantida = false;

export async function ensureQuartoLogTable() {
  if (tabelaLogsGarantida) return;

  await query(`
    IF OBJECT_ID('quarto_log', 'U') IS NULL
    BEGIN
      CREATE TABLE quarto_log (
        id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        hotel_id UNIQUEIDENTIFIER NOT NULL,
        quarto_id UNIQUEIDENTIFIER NOT NULL,
        reserva_id UNIQUEIDENTIFIER NULL,
        hospede_id UNIQUEIDENTIFIER NULL,
        tipo NVARCHAR(40) NOT NULL,
        acao NVARCHAR(120) NOT NULL,
        descricao NVARCHAR(500) NULL,
        valor DECIMAL(18, 2) NULL,
        metadata_json NVARCHAR(MAX) NULL,
        realizado_em DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );

      CREATE INDEX IX_quarto_log_quarto_data ON quarto_log (quarto_id, realizado_em DESC);
      CREATE INDEX IX_quarto_log_hotel_data ON quarto_log (hotel_id, realizado_em DESC);
    END
  `);

  tabelaLogsGarantida = true;
}

function normalizarMetadata(metadata) {
  if (!metadata) return null;
  if (typeof metadata === 'string') return metadata;
  return JSON.stringify(metadata);
}

export async function registrarLogQuarto({
  hotelId,
  quartoId,
  reservaId = null,
  hospedeId = null,
  tipo,
  acao,
  descricao = null,
  valor = null,
  metadata = null,
  realizadoEm = null,
}) {
  if (!hotelId || !quartoId || !tipo || !acao) {
    throw new Error('Campos obrigatórios para log: hotelId, quartoId, tipo e acao');
  }

  await ensureQuartoLogTable();

  const metadataJson = normalizarMetadata(metadata);

  const resultado = await queryWithParams(
    `INSERT INTO quarto_log (
        hotel_id,
        quarto_id,
        reserva_id,
        hospede_id,
        tipo,
        acao,
        descricao,
        valor,
        metadata_json,
        realizado_em
     )
     OUTPUT INSERTED.*
     VALUES (
       @hotelId,
       @quartoId,
       @reservaId,
       @hospedeId,
       @tipo,
       @acao,
       @descricao,
       @valor,
       @metadataJson,
       COALESCE(@realizadoEm, SYSUTCDATETIME())
     )`,
    {
      hotelId,
      quartoId,
      reservaId,
      hospedeId,
      tipo,
      acao,
      descricao,
      valor,
      metadataJson,
      realizadoEm,
    },
  );

  return resultado.recordset[0];
}

export async function listarLogsQuarto({ hotelId, quartoId, limit = 100, tipo = null }) {
  await ensureQuartoLogTable();

  const limite = Math.min(Math.max(Number(limit) || 100, 1), 500);

  const resultado = await queryWithParams(
    `SELECT TOP (@limit)
        ql.id,
        ql.hotel_id,
        ql.quarto_id,
        ql.reserva_id,
        ql.hospede_id,
        ql.tipo,
        ql.acao,
        ql.descricao,
        ql.valor,
        ql.metadata_json,
        ql.realizado_em,
        q.numero AS quarto_numero,
        r.codigo AS reserva_codigo,
        h.nome AS hospede_nome
     FROM quarto_log ql
     INNER JOIN quarto q ON q.id = ql.quarto_id
     LEFT JOIN reserva r ON r.id = ql.reserva_id
     LEFT JOIN hospede h ON h.id = ql.hospede_id
     WHERE ql.hotel_id = @hotelId
       AND ql.quarto_id = @quartoId
       AND (@tipo IS NULL OR ql.tipo = @tipo)
     ORDER BY ql.realizado_em DESC, ql.id DESC`,
    {
      hotelId,
      quartoId,
      limit: limite,
      tipo,
    },
  );

  return resultado.recordset.map((item) => ({
    ...item,
    metadata: item.metadata_json ? tentarJson(item.metadata_json) : null,
  }));
}

function tentarJson(valor) {
  try {
    return JSON.parse(valor);
  } catch {
    return valor;
  }
}
