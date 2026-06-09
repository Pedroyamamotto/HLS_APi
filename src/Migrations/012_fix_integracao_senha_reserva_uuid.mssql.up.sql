IF OBJECT_ID('integracao_senha_reserva', 'U') IS NULL
BEGIN
  CREATE TABLE integracao_senha_reserva (
    id INT IDENTITY(1,1) PRIMARY KEY,
    reserva_id UNIQUEIDENTIFIER NOT NULL,
    quarto_id INT NOT NULL,
    fechadura_id INT NOT NULL,
    lock_id VARCHAR(100) NOT NULL,
    senha_id VARCHAR(100) NULL,
    nome VARCHAR(255) NULL,
    senha VARCHAR(100) NULL,
    inicio DATETIME NOT NULL,
    fim DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ativa',
    dados_json NVARCHAR(MAX) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    invalidada_em DATETIME NULL
  );
END;
GO

IF COL_LENGTH('integracao_senha_reserva', 'status') IS NULL
BEGIN
  ALTER TABLE integracao_senha_reserva
  ADD status VARCHAR(30) NOT NULL CONSTRAINT DF_integracao_senha_reserva_status DEFAULT 'ativa';
END;
GO

IF COL_LENGTH('integracao_senha_reserva', 'created_at') IS NULL
BEGIN
  ALTER TABLE integracao_senha_reserva
  ADD created_at DATETIME NOT NULL CONSTRAINT DF_integracao_senha_reserva_created_at DEFAULT GETDATE();
END;
GO

IF COL_LENGTH('integracao_senha_reserva', 'invalidada_em') IS NULL
BEGIN
  ALTER TABLE integracao_senha_reserva
  ADD invalidada_em DATETIME NULL;
END;
GO

IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'integracao_senha_reserva'
    AND COLUMN_NAME = 'reserva_id'
    AND DATA_TYPE <> 'uniqueidentifier'
)
BEGIN
  IF EXISTS (SELECT 1 FROM integracao_senha_reserva)
  BEGIN
    THROW 50001, 'Nao foi possivel migrar integracao_senha_reserva.reserva_id automaticamente porque a tabela possui dados.', 1;
  END;

  IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_integracao_senha_reserva_reserva_status'
      AND object_id = OBJECT_ID('integracao_senha_reserva')
  )
  BEGIN
    DROP INDEX IX_integracao_senha_reserva_reserva_status ON integracao_senha_reserva;
  END;

  IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_integracao_senha_reserva_reserva'
  )
  BEGIN
    ALTER TABLE integracao_senha_reserva DROP CONSTRAINT FK_integracao_senha_reserva_reserva;
  END;

  ALTER TABLE integracao_senha_reserva DROP COLUMN reserva_id;
  ALTER TABLE integracao_senha_reserva ADD reserva_id UNIQUEIDENTIFIER NOT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_integracao_senha_reserva_reserva'
)
BEGIN
  ALTER TABLE integracao_senha_reserva WITH NOCHECK
  ADD CONSTRAINT FK_integracao_senha_reserva_reserva
  FOREIGN KEY (reserva_id) REFERENCES reserva(id);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_integracao_senha_reserva_reserva_status'
    AND object_id = OBJECT_ID('integracao_senha_reserva')
)
BEGIN
  CREATE INDEX IX_integracao_senha_reserva_reserva_status
    ON integracao_senha_reserva (reserva_id, status, created_at DESC);
END;
GO