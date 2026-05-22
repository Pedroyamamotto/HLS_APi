SET NOCOUNT ON;

IF OBJECT_ID('hotel_integracao_card_encoder', 'U') IS NULL
BEGIN
  CREATE TABLE hotel_integracao_card_encoder (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    hotel_id UNIQUEIDENTIFIER NOT NULL,
    encoder_hotel_id NVARCHAR(120) NOT NULL,
    wait_ms INT NOT NULL,
    criado_em DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    atualizado_em DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_hotel_integracao_card_encoder_hotel UNIQUE (hotel_id),
    CONSTRAINT FK_hotel_integracao_card_encoder_hotel FOREIGN KEY (hotel_id)
      REFERENCES hotel(id)
      ON DELETE CASCADE,
    CONSTRAINT CK_hotel_integracao_card_encoder_wait_ms CHECK (wait_ms > 0)
  );

  CREATE INDEX IX_hotel_integracao_card_encoder_hotel
    ON hotel_integracao_card_encoder (hotel_id);
END
