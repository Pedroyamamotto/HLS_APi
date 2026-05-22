IF OBJECT_ID('usuario', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('usuario', 'foto_url') IS NULL
    ALTER TABLE [usuario] ADD foto_url NVARCHAR(MAX) NULL;
END

IF OBJECT_ID('categoria_quarto', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('categoria_quarto', 'foto_url') IS NULL
    ALTER TABLE categoria_quarto ADD foto_url NVARCHAR(MAX) NULL;
END

IF OBJECT_ID('quarto', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('quarto', 'fotos_json') IS NULL
    ALTER TABLE quarto ADD fotos_json NVARCHAR(MAX) NULL;
END
