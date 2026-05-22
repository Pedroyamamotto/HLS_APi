SET NOCOUNT ON;

IF COL_LENGTH('usuario', 'telefone') IS NULL
BEGIN
  ALTER TABLE [usuario]
  ADD telefone NVARCHAR(20) NULL;
END;

GO

UPDATE [usuario]
SET telefone = NULL
WHERE telefone IS NULL;

SELECT 'telefone checked/created' AS resultado;