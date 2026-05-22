SET NOCOUNT ON;

-- Redistribuicao explicita de usuarios por hotel
-- Ajuste os e-mails abaixo se quiser outro mapeamento
;WITH alvo AS (
  SELECT 'pedros.barretos@yamamotto.com.br' AS email, 'Hotel interface' AS hotel_nome
  UNION ALL SELECT 'pedro.barreto@yamamotto.com.br', 'Hotel interface'
  UNION ALL SELECT 'boasvindas_1778068665385@example.com', 'Hotel teste'
)
UPDATE u
   SET u.hotel_id = h.id
  FROM [usuario] u
  JOIN alvo a ON a.email = u.email
  JOIN hotel h ON h.nome = a.hotel_nome
 WHERE u.assinatura_id = h.assinatura_id;

PRINT 'Redistribuicao concluida.';

SELECT
  h.nome AS hotel,
  COUNT(u.id) AS total_usuarios
FROM hotel h
LEFT JOIN [usuario] u ON u.hotel_id = h.id
GROUP BY h.nome
ORDER BY h.nome;
