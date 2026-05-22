import { queryWithParams } from '../utils/database.js';

let tabelaGarantida = false;

export function formatarDataHoraLocalSql(valor) {
  const data = valor instanceof Date ? valor : new Date(valor);
  const partes = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(data);

  const obter = (tipo) => partes.find((parte) => parte.type === tipo)?.value || '00';
  return `${obter('year')}-${obter('month')}-${obter('day')} ${obter('hour')}:${obter('minute')}:${obter('second')}`;
}

export async function garantirTabelaCredencialAcessoEmissao() {
  if (tabelaGarantida) return;

  await queryWithParams(`
    IF OBJECT_ID('credencial_acesso_emissao', 'U') IS NULL
    BEGIN
      CREATE TABLE credencial_acesso_emissao (
        id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        reserva_id UNIQUEIDENTIFIER NULL REFERENCES reserva(id) ON DELETE CASCADE,
        hospede_id UNIQUEIDENTIFIER NULL REFERENCES hospede(id) ON DELETE SET NULL,
        quarto_id UNIQUEIDENTIFIER NULL REFERENCES quarto(id) ON DELETE SET NULL,
        quarto_numero NVARCHAR(50) NOT NULL,
        hotel_ref NVARCHAR(50) NOT NULL,
        request_id NVARCHAR(100) NULL,
        operation_id UNIQUEIDENTIFIER NULL,
        operation_ids_json NVARCHAR(MAX) NULL,
        validade_inicio DATETIME2 NOT NULL,
        validade_fim DATETIME2 NOT NULL,
        quantidade_cartoes INT NOT NULL DEFAULT 1,
        tipo_operacao NVARCHAR(20) NOT NULL,
        status_operacao NVARCHAR(20) NOT NULL,
        card_snr NVARCHAR(50) NULL,
        dados_json NVARCHAR(MAX) NULL,
        criado_em DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );

      CREATE INDEX IX_credencial_acesso_emissao_reserva_criado_em
        ON credencial_acesso_emissao (reserva_id, criado_em DESC);

      CREATE INDEX IX_credencial_acesso_emissao_quarto_criado_em
        ON credencial_acesso_emissao (quarto_id, criado_em DESC);

      CREATE INDEX IX_credencial_acesso_emissao_hotel_ref_criado_em
        ON credencial_acesso_emissao (hotel_ref, criado_em DESC);
    END

    IF COL_LENGTH('credencial_acesso_emissao', 'quarto_numero') IS NULL
    BEGIN
      ALTER TABLE credencial_acesso_emissao
      ADD quarto_numero NVARCHAR(50) NULL;
    END
  `);

  tabelaGarantida = true;
}

export async function registrarEmissaoCredencial({
  reservaId = null,
  hospedeId = null,
  quartoId = null,
  quartoNumero = null,
  hotelRef,
  requestId = null,
  operationId = null,
  operationIds = [],
  validadeInicio,
  validadeFim,
  quantidadeCartoes = 1,
  tipoOperacao = 'issue',
  statusOperacao = 'accepted',
  cardSnr = null,
  dados = null,
}) {
  await garantirTabelaCredencialAcessoEmissao();

  const validadeInicioSql = formatarDataHoraLocalSql(validadeInicio);
  const validadeFimSql = formatarDataHoraLocalSql(validadeFim);

  const resultado = await queryWithParams(
    `INSERT INTO credencial_acesso_emissao (
        reserva_id,
        hospede_id,
        quarto_id,
        quarto_numero,
        hotel_ref,
        request_id,
        operation_id,
        operation_ids_json,
        validade_inicio,
        validade_fim,
        quantidade_cartoes,
        tipo_operacao,
        status_operacao,
        card_snr,
        dados_json
     )
     OUTPUT INSERTED.id,
            INSERTED.reserva_id,
            INSERTED.hospede_id,
            INSERTED.quarto_id,
            INSERTED.quarto_numero,
            INSERTED.hotel_ref,
            INSERTED.request_id,
            INSERTED.operation_id,
            INSERTED.operation_ids_json,
            INSERTED.validade_inicio,
            INSERTED.validade_fim,
            INSERTED.quantidade_cartoes,
            INSERTED.tipo_operacao,
            INSERTED.status_operacao,
            INSERTED.card_snr,
            INSERTED.dados_json,
            INSERTED.criado_em
     VALUES (
       @reservaId,
       @hospedeId,
       @quartoId,
      @quartoNumero,
       @hotelRef,
       @requestId,
       @operationId,
       @operationIdsJson,
       @validadeInicio,
       @validadeFim,
       @quantidadeCartoes,
       @tipoOperacao,
       @statusOperacao,
       @cardSnr,
       @dadosJson
     )`,
    {
      reservaId,
      hospedeId,
      quartoId,
      quartoNumero,
      hotelRef,
      requestId,
      operationId,
      operationIdsJson: operationIds.length ? JSON.stringify(operationIds) : null,
      validadeInicio: validadeInicioSql,
      validadeFim: validadeFimSql,
      quantidadeCartoes: Number(quantidadeCartoes) || 1,
      tipoOperacao,
      statusOperacao,
      cardSnr,
      dadosJson: dados ? JSON.stringify(dados) : null,
    },
  );

  return resultado.recordset[0];
}

export async function buscarEmissaoCredencialPorOperationId(operationId) {
  await garantirTabelaCredencialAcessoEmissao();

  const resultado = await queryWithParams(
    `SELECT TOP 1
        id,
        reserva_id,
        hospede_id,
        quarto_id,
        quarto_numero,
        hotel_ref,
        request_id,
        operation_id,
        operation_ids_json,
        validade_inicio,
        validade_fim,
        quantidade_cartoes,
        tipo_operacao,
        status_operacao,
        card_snr,
        dados_json,
        criado_em
     FROM credencial_acesso_emissao
     WHERE operation_id = @operationId
     ORDER BY criado_em DESC`,
    { operationId },
  );

  return resultado.recordset?.[0] || null;
}

export async function atualizarStatusEmissaoCredencial({ operationId, statusOperacao, cardSnr = null }) {
  await garantirTabelaCredencialAcessoEmissao();

  const resultado = await queryWithParams(
    `UPDATE credencial_acesso_emissao
     SET status_operacao = @statusOperacao,
         card_snr = COALESCE(@cardSnr, card_snr)
     OUTPUT INSERTED.id,
            INSERTED.reserva_id,
            INSERTED.hospede_id,
            INSERTED.quarto_id,
            INSERTED.quarto_numero,
            INSERTED.hotel_ref,
            INSERTED.request_id,
            INSERTED.operation_id,
            INSERTED.operation_ids_json,
            INSERTED.validade_inicio,
            INSERTED.validade_fim,
            INSERTED.quantidade_cartoes,
            INSERTED.tipo_operacao,
            INSERTED.status_operacao,
            INSERTED.card_snr,
            INSERTED.dados_json,
            INSERTED.criado_em
     WHERE operation_id = @operationId`,
    {
      operationId,
      statusOperacao,
      cardSnr,
    },
  );

  return resultado.recordset?.[0] || null;
}
