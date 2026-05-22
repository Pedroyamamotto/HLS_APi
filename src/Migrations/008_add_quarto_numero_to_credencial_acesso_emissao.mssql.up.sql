SET NOCOUNT ON;

IF OBJECT_ID('credencial_acesso_emissao', 'U') IS NOT NULL
   AND COL_LENGTH('credencial_acesso_emissao', 'quarto_numero') IS NULL
BEGIN
  ALTER TABLE credencial_acesso_emissao
  ADD quarto_numero NVARCHAR(50) NULL;
END
