-- Migração 004: Histórico de Governança (limpeza e manutenção)
-- Registra cada execução de checklist de limpeza ou manutenção de quarto.

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'historico_governanca'
)
BEGIN
  CREATE TABLE historico_governanca (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    hotel_id       UNIQUEIDENTIFIER NOT NULL,
    quarto_id      UNIQUEIDENTIFIER NOT NULL,
    tipo           NVARCHAR(20)     NOT NULL,           -- 'limpeza' | 'manutencao'
    realizado_em   DATETIME2        NOT NULL DEFAULT GETDATE(),
    usuario_id     UNIQUEIDENTIFIER NULL,               -- quem executou
    checklist_json NVARCHAR(MAX)    NULL,               -- snapshot JSON do checklist
    observacoes    NVARCHAR(500)    NULL,

    CONSTRAINT FK_histgov_hotel   FOREIGN KEY (hotel_id)  REFERENCES hotel(id),
    CONSTRAINT FK_histgov_quarto  FOREIGN KEY (quarto_id) REFERENCES quarto(id)
  );

  CREATE INDEX IX_histgov_quarto ON historico_governanca (quarto_id, realizado_em DESC);
  CREATE INDEX IX_histgov_hotel  ON historico_governanca (hotel_id,  realizado_em DESC);

  PRINT 'Tabela historico_governanca criada.';
END
ELSE
BEGIN
  PRINT 'Tabela historico_governanca já existe — nenhuma alteração feita.';
END

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'historico_governanca_item'
)
BEGIN
  CREATE TABLE historico_governanca_item (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    historico_id  INT             NOT NULL,
    ordem         INT             NULL,
    item          NVARCHAR(200)   NOT NULL,
    concluido     BIT             NOT NULL DEFAULT 0,
    observacao    NVARCHAR(500)   NULL,

    CONSTRAINT FK_histgovitem_hist FOREIGN KEY (historico_id)
      REFERENCES historico_governanca(id) ON DELETE CASCADE
  );

  CREATE INDEX IX_histgovitem_hist
    ON historico_governanca_item (historico_id, ordem ASC, id ASC);

  PRINT 'Tabela historico_governanca_item criada.';
END
ELSE
BEGIN
  PRINT 'Tabela historico_governanca_item já existe — nenhuma alteração feita.';
END
