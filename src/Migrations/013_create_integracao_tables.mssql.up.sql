SET NOCOUNT ON;

-- Tabela principal de integrações por hotel
IF OBJECT_ID('integracao', 'U') IS NULL
BEGIN
  CREATE TABLE integracao (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    hotel_id        INT NOT NULL,
    nome            VARCHAR(100) NOT NULL,
    ativa           BIT NOT NULL DEFAULT 0,
    api_base        VARCHAR(500) NULL,
    client_id       VARCHAR(500) NULL,
    client_secret   VARCHAR(500) NULL,
    account         VARCHAR(500) NULL,
    password        VARCHAR(500) NULL,
    access_token    NVARCHAR(MAX) NULL,
    refresh_token   NVARCHAR(MAX) NULL,
    token_type      VARCHAR(100) NULL,
    token_expira_em DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_integracao_hotel_nome UNIQUE (hotel_id, nome)
  );

  CREATE INDEX IX_integracao_hotel_id ON integracao (hotel_id);
  PRINT 'Tabela integracao criada.';
END
ELSE
  PRINT 'Tabela integracao ja existe.';
GO

-- Tabela de fechaduras vinculadas a hotéis via integração
IF OBJECT_ID('integracao_fechadura', 'U') IS NULL
BEGIN
  CREATE TABLE integracao_fechadura (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    integracao_id     INT NULL,
    hotel_id          INT NOT NULL,
    quarto_id         INT NULL,
    lock_id           VARCHAR(100) NOT NULL,
    nome              VARCHAR(255) NULL,
    alias             VARCHAR(255) NULL,
    mac               VARCHAR(100) NULL,
    andar_nome        VARCHAR(100) NULL,
    gateway_conectado BIT NULL DEFAULT 0,
    bateria           INT NULL,
    ativa             BIT NOT NULL DEFAULT 1,
    dados_json        NVARCHAR(MAX) NULL,
    created_at        DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_integracao_fechadura_hotel_lock UNIQUE (hotel_id, lock_id)
  );

  CREATE INDEX IX_integracao_fechadura_hotel_id  ON integracao_fechadura (hotel_id);
  CREATE INDEX IX_integracao_fechadura_quarto_id ON integracao_fechadura (quarto_id);
  PRINT 'Tabela integracao_fechadura criada.';
END
ELSE
  PRINT 'Tabela integracao_fechadura ja existe.';
GO

-- Tabela de histórico de sincronizações
IF OBJECT_ID('integracao_sync_historico', 'U') IS NULL
BEGIN
  CREATE TABLE integracao_sync_historico (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    hotel_id      INT NOT NULL,
    integracao_id INT NULL,
    tipo          VARCHAR(100) NULL,
    mensagem      VARCHAR(500) NULL,
    total         INT NOT NULL DEFAULT 0,
    sucesso       BIT NOT NULL DEFAULT 1,
    erro          NVARCHAR(MAX) NULL,
    dados_json    NVARCHAR(MAX) NULL,
    created_at    DATETIME NOT NULL DEFAULT GETDATE()
  );

  CREATE INDEX IX_integracao_sync_historico_hotel ON integracao_sync_historico (hotel_id, created_at DESC);
  PRINT 'Tabela integracao_sync_historico criada.';
END
ELSE
  PRINT 'Tabela integracao_sync_historico ja existe.';
GO
