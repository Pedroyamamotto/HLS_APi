IF COL_LENGTH('hospede', 'hotel_id') IS NULL
BEGIN
  ALTER TABLE hospede ADD hotel_id UNIQUEIDENTIFIER NULL;

  ALTER TABLE hospede
    ADD CONSTRAINT FK_hospede_hotel
    FOREIGN KEY (hotel_id) REFERENCES hotel(id) ON DELETE CASCADE;

  CREATE INDEX IX_hospede_hotel_id ON hospede(hotel_id);
END
GO

-- Se existir somente 1 hotel cadastrado, faz backfill automático para dados antigos
IF (SELECT COUNT(1) FROM hotel) = 1
BEGIN
  UPDATE hospede
  SET hotel_id = (SELECT TOP 1 id FROM hotel)
  WHERE hotel_id IS NULL;
END
GO
