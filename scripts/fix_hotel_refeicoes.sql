-- Migration: cria tabela de configuracao de refeicoes por hotel (idempotente)
-- SQL Server (MSSQL)

IF OBJECT_ID('hotel_refeicao', 'U') IS NULL
BEGIN
  CREATE TABLE hotel_refeicao (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    hotel_id UNIQUEIDENTIFIER NOT NULL,
    nome NVARCHAR(100) NOT NULL,
    horario_inicio TIME NULL,
    horario_fim TIME NULL,
    habilitada BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_hotel_refeicao_hotel FOREIGN KEY (hotel_id) REFERENCES hotel(id) ON DELETE CASCADE,
    CONSTRAINT UQ_hotel_refeicao_hotel_nome UNIQUE (hotel_id, nome)
  );

  CREATE INDEX IX_hotel_refeicao_hotel_id ON hotel_refeicao(hotel_id);
  PRINT 'Tabela hotel_refeicao criada com sucesso';
END
ELSE
BEGIN
  PRINT 'Tabela hotel_refeicao ja existe';
END
