SET NOCOUNT ON;

IF OBJECT_ID('credencial_acesso_emissao', 'U') IS NOT NULL
   AND COL_LENGTH('credencial_acesso_emissao', 'quarto_numero') IS NOT NULL
BEGIN
  ALTER TABLE credencial_acesso_emissao
  DROP COLUMN quarto_numero;
END
