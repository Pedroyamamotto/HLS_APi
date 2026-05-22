-- Script de Correção: Reservas com Valor Dividido por 10
-- 
-- Este script identifica e corrige reservas que têm valor anormalmente baixo
-- (possívelmente divididas por 10 erronea mente)
-- 
-- ⚠️ BACKUP DO BANCO ANTES DE EXECUTAR!

-- 1. IDENTIFICAR RESERVAS COM POSSÍVEL ERRO (simulação)
SELECT 
  r.id,
  r.codigo,
  r.valor AS valor_atual,
  c.preco_diaria,
  DATEDIFF(DAY, r.data_checkin, r.data_checkout) AS noites,
  (DATEDIFF(DAY, r.data_checkin, r.data_checkout) * c.preco_diaria) AS valor_esperado,
  r.valor * 10 AS valor_corrigido,
  h.nome AS hospede_nome,
  q.numero AS quarto_numero
FROM reserva r
LEFT JOIN quarto q ON r.quarto_id = q.id
LEFT JOIN categoria_quarto c ON q.categoria_id = c.id
LEFT JOIN hospede h ON r.hospede_id = h.id
WHERE c.preco_diaria > 0
  AND r.valor > 0
  AND r.valor < (c.preco_diaria / 10)  -- Detecta valores anormalmente pequenos
ORDER BY r.data_checkin DESC;

-- 2. CORRIGIR VALORES (EXECUTE COM CUIDADO)
-- Descomente e execute APENAS após confirmar a análise acima!
/*
UPDATE reserva
SET valor = valor * 10
WHERE id IN (
  SELECT r.id
  FROM reserva r
  LEFT JOIN quarto q ON r.quarto_id = q.id
  LEFT JOIN categoria_quarto c ON q.categoria_id = c.id
  WHERE c.preco_diaria > 0
    AND r.valor > 0
    AND r.valor < (c.preco_diaria / 10)
);

-- Log das correções
PRINT 'Reservas corrigidas com sucesso';
*/

-- 3. VERIFICAR CONSUMO + RESERVA (após correção)
SELECT 
  r.id,
  r.codigo,
  r.valor AS valor_base,
  COALESCE(SUM(cl.valor_total), 0) AS total_consumo,
  (r.valor + COALESCE(SUM(cl.valor_total), 0)) AS total_com_consumo,
  h.nome AS hospede,
  q.numero AS quarto
FROM reserva r
LEFT JOIN hospede h ON r.hospede_id = h.id
LEFT JOIN quarto q ON r.quarto_id = q.id
LEFT JOIN consumo_lancamento cl ON r.id = cl.reserva_id
GROUP BY r.id, r.codigo, r.valor, h.nome, q.numero
ORDER BY r.data_checkin DESC;
