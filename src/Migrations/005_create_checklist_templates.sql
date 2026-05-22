-- Migração 005: Templates de checklist por hotel (limpeza/manutencao)

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'checklist_template_secao'
)
BEGIN
  CREATE TABLE checklist_template_secao (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    hotel_id  UNIQUEIDENTIFIER NOT NULL,
    tipo      NVARCHAR(20)     NOT NULL,
    titulo    NVARCHAR(120)    NOT NULL,
    ordem     INT              NOT NULL DEFAULT 0,

    CONSTRAINT FK_checktpl_hotel FOREIGN KEY (hotel_id) REFERENCES hotel(id)
  );

  CREATE INDEX IX_checktpl_hotel_tipo
    ON checklist_template_secao (hotel_id, tipo, ordem ASC, id ASC);

  PRINT 'Tabela checklist_template_secao criada.';
END
ELSE
BEGIN
  PRINT 'Tabela checklist_template_secao já existe — nenhuma alteração feita.';
END

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'checklist_template_item'
)
BEGIN
  CREATE TABLE checklist_template_item (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    secao_id  INT            NOT NULL,
    texto     NVARCHAR(200)  NOT NULL,
    ordem     INT            NOT NULL DEFAULT 0,

    CONSTRAINT FK_checktpl_item_secao FOREIGN KEY (secao_id)
      REFERENCES checklist_template_secao(id) ON DELETE CASCADE
  );

  CREATE INDEX IX_checktpl_item_secao
    ON checklist_template_item (secao_id, ordem ASC, id ASC);

  PRINT 'Tabela checklist_template_item criada.';
END
ELSE
BEGIN
  PRINT 'Tabela checklist_template_item já existe — nenhuma alteração feita.';
END
