IF OBJECT_ID('quarto', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('quarto', 'fotos_json') IS NOT NULL
    ALTER TABLE quarto DROP COLUMN fotos_json;
END

IF OBJECT_ID('categoria_quarto', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('categoria_quarto', 'foto_url') IS NOT NULL
    ALTER TABLE categoria_quarto DROP COLUMN foto_url;
END

IF OBJECT_ID('usuario', 'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('usuario', 'foto_url') IS NOT NULL
    ALTER TABLE [usuario] DROP COLUMN foto_url;
END
