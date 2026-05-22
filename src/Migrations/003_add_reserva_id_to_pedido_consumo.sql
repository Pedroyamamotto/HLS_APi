-- Adiciona relacionamento de consumo de refeicao com a reserva/estadia
-- Objetivo: separar consumos por estadia, mesmo para o mesmo hospede em visitas futuras.

-- MSSQL
IF COL_LENGTH('pedido_consumo', 'reserva_id') IS NULL
BEGIN
  ALTER TABLE pedido_consumo
  ADD reserva_id UNIQUEIDENTIFIER NULL;
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_pedido_consumo_reserva'
)
BEGIN
  ALTER TABLE pedido_consumo
  ADD CONSTRAINT FK_pedido_consumo_reserva
  FOREIGN KEY (reserva_id)
  REFERENCES reserva(id)
  ON DELETE CASCADE;
END

-- Backfill aproximado para dados legados: associa consumo a reserva do mesmo hospede no intervalo de datas
IF COL_LENGTH('pedido_consumo', 'reserva_id') IS NOT NULL
BEGIN
  EXEC('UPDATE pc
        SET pc.reserva_id = r.id
        FROM pedido_consumo pc
        INNER JOIN reserva r ON r.hospede_id = pc.hospede_id
        WHERE pc.reserva_id IS NULL
          AND pc.[data] >= r.data_checkin
          AND pc.[data] < DATEADD(DAY, 1, r.data_checkout);');
END
