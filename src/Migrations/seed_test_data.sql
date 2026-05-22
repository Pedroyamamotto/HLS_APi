-- Script para inserir dados de teste no banco
-- Execute isto após rodar: npm run migrations -- --update

-- 1. Inserir uma Assinatura de teste
INSERT INTO Assinatura (Nome, Descricao, Ativa)
VALUES ('Teste Premium', 'Assinatura de teste para desenvolvimento', 1);

-- Pegar o ID da assinatura (será 1 se for a primeira)
DECLARE @AssinaturaId INT = (SELECT TOP 1 Id FROM Assinatura ORDER BY Id DESC);

-- 2. Inserir uma Licensa de teste
INSERT INTO Licenca (NumeroLicenca, Assinatura_Id, Ativa)
VALUES ('HLS-TEST-0001', @AssinaturaId, 1);

-- Resultado: Agora você pode usar "HLS-TEST-0001" no endpoint de register

-- Para verificar se foi criado:
SELECT 'Assinaturas Criadas:' AS Info;
SELECT * FROM Assinatura WHERE Nome LIKE '%Teste%';

SELECT 'Licenças Criadas:' AS Info;
SELECT * FROM Licenca WHERE NumeroLicenca LIKE '%TEST%';

-- Se precisar deletar e recriar:
-- DELETE FROM Licenca WHERE NumeroLicenca LIKE '%TEST%';
-- DELETE FROM Assinatura WHERE Nome LIKE '%Teste%';
