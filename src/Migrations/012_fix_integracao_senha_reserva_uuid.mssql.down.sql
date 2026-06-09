IF EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_integracao_senha_reserva_reserva'
)
BEGIN
  ALTER TABLE integracao_senha_reserva DROP CONSTRAINT FK_integracao_senha_reserva_reserva;
END;
GO

IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'integracao_senha_reserva'
    AND COLUMN_NAME = 'reserva_id'
    AND DATA_TYPE = 'uniqueidentifier'
)
BEGIN
  IF EXISTS (SELECT 1 FROM integracao_senha_reserva)
  BEGIN
    THROW 50002, 'Nao foi possivel reverter integracao_senha_reserva.reserva_id automaticamente porque a tabela possui dados.', 1;
  END;

  ALTER TABLE integracao_senha_reserva DROP COLUMN reserva_id;
  ALTER TABLE integracao_senha_reserva ADD reserva_id INT NOT NULL;
END;
GO

IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_integracao_senha_reserva_reserva_status'
    AND object_id = OBJECT_ID('integracao_senha_reserva')
)
BEGIN
  DROP INDEX IX_integracao_senha_reserva_reserva_status ON integracao_senha_reserva;
END;
GO