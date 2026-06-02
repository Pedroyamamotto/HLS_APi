SET NOCOUNT ON;

IF COL_LENGTH('hotel_integracao_card_encoder', 'integration_api_key') IS NOT NULL
BEGIN
  ALTER TABLE hotel_integracao_card_encoder
    DROP COLUMN integration_api_key;
END