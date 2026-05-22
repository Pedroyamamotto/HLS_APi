SET NOCOUNT ON;

IF COL_LENGTH('usuario', 'tipo_usuario') IS NULL
BEGIN
  ALTER TABLE [usuario]
  ADD tipo_usuario NVARCHAR(20) NOT NULL
    CONSTRAINT DF_usuario_tipo_usuario DEFAULT 'normal' WITH VALUES;
END;

GO

UPDATE [usuario]
SET tipo_usuario = 'normal'
WHERE tipo_usuario IS NULL OR LTRIM(RTRIM(tipo_usuario)) = '';

SELECT 'tipo_usuario checked/created' AS resultado;