SET NOCOUNT ON;

IF COL_LENGTH('usuario', 'hotel_id') IS NULL
BEGIN
  ALTER TABLE [usuario]
    ADD hotel_id UNIQUEIDENTIFIER NULL;

  PRINT 'Coluna usuario.hotel_id adicionada.';
END
ELSE
BEGIN
  PRINT 'Coluna usuario.hotel_id ja existe.';
END;

IF NOT EXISTS (
  SELECT 1
    FROM sys.foreign_keys
   WHERE name = 'FK_usuario_hotel'
)
BEGIN
  ALTER TABLE [usuario]
    ADD CONSTRAINT FK_usuario_hotel
        FOREIGN KEY (hotel_id)
        REFERENCES hotel(id)
        ON DELETE SET NULL;

  PRINT 'FK FK_usuario_hotel criada.';
END
ELSE
BEGIN
  PRINT 'FK FK_usuario_hotel ja existe.';
END;

EXEC sp_executesql N'
;WITH hotel_padrao AS (
  SELECT
    assinatura_id,
    MIN(id) AS hotel_id
  FROM hotel
  WHERE assinatura_id IS NOT NULL
  GROUP BY assinatura_id
)
UPDATE u
   SET u.hotel_id = hp.hotel_id
  FROM [usuario] u
  JOIN hotel_padrao hp
    ON hp.assinatura_id = u.assinatura_id
 WHERE u.hotel_id IS NULL
   AND u.assinatura_id IS NOT NULL;
';

PRINT 'Backfill de usuario.hotel_id concluido.';

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_usuario_hotel_id'
    AND object_id = OBJECT_ID('usuario')
)
BEGIN
  EXEC sp_executesql N'CREATE INDEX IX_usuario_hotel_id ON [usuario](hotel_id);';
  PRINT 'Indice IX_usuario_hotel_id criado.';
END
ELSE
BEGIN
  PRINT 'Indice IX_usuario_hotel_id ja existe.';
END;
