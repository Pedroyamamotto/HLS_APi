SET NOCOUNT ON;

-- Insere uma assinatura e uma licença de teste adaptada ao schema atual (PKs são UNIQUEIDENTIFIER)
DECLARE @assinatura_ids TABLE (id UNIQUEIDENTIFIER);

INSERT INTO assinatura (data_vencimento, tipo, valor_mensal, status)
OUTPUT INSERTED.id INTO @assinatura_ids(id)
VALUES ('2026-12-31', 'Premium', 99.90, 'ativa');

DECLARE @assinatura_id UNIQUEIDENTIFIER;
SELECT TOP 1 @assinatura_id = id FROM @assinatura_ids;

-- Licença agora com numero_licenca, ativa, e FK assinatura_id
INSERT INTO licenca (validade, chave, empresa_nome, status, numero_licenca, ativa, assinatura_id)
VALUES (
  '2026-12-31',
  'YAM-9XK2-LP8Q-7ZMN',
  'Empresa Exemplo LTDA',
  'ativa',
  'HLS-TEST-0001',
  1,
  @assinatura_id
);

-- Resultados para verificação
SELECT 'Assinatura inserida:' AS Info;
SELECT * FROM assinatura WHERE id = @assinatura_id;
SELECT 'Licença inserida:' AS Info;
SELECT * FROM licenca WHERE numero_licenca = 'HLS-TEST-0001';
