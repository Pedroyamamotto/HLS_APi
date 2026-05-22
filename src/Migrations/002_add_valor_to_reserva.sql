-- Migration: Adicionar campo valor à tabela reserva
-- Data: 12 de maio de 2026

-- MSSQL
ALTER TABLE reserva
ADD valor DECIMAL(10,2) NULL;

-- PostgreSQL (comentado para referência)
-- ALTER TABLE reserva
-- ADD COLUMN valor DECIMAL(10,2) NULL;
