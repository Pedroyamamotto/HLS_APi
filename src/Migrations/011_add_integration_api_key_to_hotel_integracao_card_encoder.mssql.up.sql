SET NOCOUNT ON;

IF COL_LENGTH('hotel_integracao_card_encoder', 'integration_api_key') IS NULL
BEGIN
  ALTER TABLE hotel_integracao_card_encoder
    ADD integration_api_key NVARCHAR(255) NULL;
END