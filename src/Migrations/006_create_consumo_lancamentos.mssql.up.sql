IF OBJECT_ID('consumo_lancamento', 'U') IS NULL
BEGIN
  CREATE TABLE consumo_lancamento (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    hotel_id UNIQUEIDENTIFIER NOT NULL,
    hospede_id UNIQUEIDENTIFIER NOT NULL,
    reserva_id UNIQUEIDENTIFIER NULL,
    produto_id UNIQUEIDENTIFIER NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(18, 2) NOT NULL,
    valor_total DECIMAL(18, 2) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF COL_LENGTH('consumo_lancamento', 'reserva_id') IS NULL
  ALTER TABLE consumo_lancamento ADD reserva_id UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH('consumo_lancamento', 'created_at') IS NULL
  ALTER TABLE consumo_lancamento ADD created_at DATETIME2 NOT NULL CONSTRAINT DF_consumo_lancamento_created_at DEFAULT SYSUTCDATETIME();
GO

CREATE INDEX IX_consumo_lancamento_hotel_hospede_data
  ON consumo_lancamento (hotel_id, hospede_id, created_at DESC);
GO
