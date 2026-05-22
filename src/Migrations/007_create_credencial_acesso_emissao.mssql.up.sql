SET NOCOUNT ON;

IF OBJECT_ID('credencial_acesso_emissao', 'U') IS NULL
BEGIN
  CREATE TABLE credencial_acesso_emissao (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    reserva_id UNIQUEIDENTIFIER NULL REFERENCES reserva(id) ON DELETE CASCADE,
    hospede_id UNIQUEIDENTIFIER NULL REFERENCES hospede(id) ON DELETE SET NULL,
    quarto_id UNIQUEIDENTIFIER NULL REFERENCES quarto(id) ON DELETE SET NULL,
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
