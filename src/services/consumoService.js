import { queryWithParams } from '../utils/database.js';
import { listarProdutos } from './produtoService.js';
import { registrarLogReserva, TIPOS_LOG_RESERVA } from './reservaLogsService.js';

let tabelaGarantida = false;

async function garantirTabelaConsumo() {
  if (tabelaGarantida) return;

  await queryWithParams(`
    IF OBJECT_ID('consumo_lancamento', 'U') IS NULL
    BEGIN
      CREATE TABLE consumo_lancamento (
        id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        hotel_id UNIQUEIDENTIFIER NOT NULL,
        hospede_id UNIQUEIDENTIFIER NOT NULL,
        reserva_id UNIQUEIDENTIFIER NULL,
        produto_id UNIQUEIDENTIFIER NOT NULL,
        quantidade INT NOT NULL,
        valor_unitario DECIMAL(18, 2) NOT NULL,
        valor_total DECIMAL(18, 2) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END
    ELSE
    BEGIN
      IF COL_LENGTH('consumo_lancamento', 'reserva_id') IS NULL
        ALTER TABLE consumo_lancamento ADD reserva_id UNIQUEIDENTIFIER NULL;

      IF COL_LENGTH('consumo_lancamento', 'created_at') IS NULL
        ALTER TABLE consumo_lancamento ADD created_at DATETIME2 NOT NULL CONSTRAINT DF_consumo_lancamento_created_at DEFAULT SYSUTCDATETIME();
    END
  `);

  tabelaGarantida = true;
}

async function validarHotelExiste(hotelId) {
  const resultado = await queryWithParams(
    `SELECT TOP 1 id FROM hotel WHERE id = @hotelId`,
    { hotelId },
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }
}

async function validarHospedeDoHotel({ hotelId, hospedeId }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1 id, nome
     FROM hospede
     WHERE id = @hospedeId
       AND hotel_id = @hotelId`,
    { hotelId, hospedeId },
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  return resultado.recordset[0];
}

async function validarProdutoExiste(produtoId) {
  const resultado = await queryWithParams(
    `SELECT TOP 1 id, nome, categoria, preco_venda
     FROM produto
     WHERE id = @produtoId`,
    { produtoId },
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Produto não encontrado');
  }

  return resultado.recordset[0];
}

async function obterReservaAtual({ hotelId, hospedeId }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        r.id,
        r.quarto_id,
        r.codigo,
        r.valor,
        r.data_checkout,
        r.status,
        q.numero AS quarto_numero
     FROM reserva r
     INNER JOIN hospede h ON h.id = r.hospede_id
     LEFT JOIN quarto q ON q.id = r.quarto_id
     WHERE r.hospede_id = @hospedeId
       AND h.hotel_id = @hotelId
     ORDER BY
       CASE
         WHEN LOWER(r.status) IN ('confirmada', 'check-in', 'ocupado')
          AND CONVERT(date, GETDATE()) BETWEEN CONVERT(date, r.data_checkin) AND CONVERT(date, r.data_checkout)
         THEN 0
         ELSE 1
       END,
       r.data_checkin DESC,
       r.data_checkout DESC`,
    { hotelId, hospedeId },
  );

  return resultado.recordset[0] || null;
}

async function atualizarValorReservaComConsumo({ reservaId, valorAcrescimo }) {
  if (!reservaId || !Number.isFinite(valorAcrescimo) || valorAcrescimo <= 0) {
    return null;
  }

  const resultado = await queryWithParams(
    `IF COL_LENGTH('reserva', 'valor') IS NOT NULL
     BEGIN
       UPDATE reserva
       SET valor = COALESCE(valor, 0) + @valorAcrescimo
       OUTPUT INSERTED.valor AS valor_atualizado
       WHERE id = @reservaId;
     END
     ELSE
     BEGIN
       SELECT CAST(NULL AS DECIMAL(10,2)) AS valor_atualizado;
     END`,
    {
      reservaId,
      valorAcrescimo,
    },
  );

  if (!resultado.recordset?.length) {
    return null;
  }

  const valorAtualizado = resultado.recordset[0]?.valor_atualizado;
  if (valorAtualizado === null || valorAtualizado === undefined) {
    return null;
  }

  return Number(valorAtualizado);
}

async function reduzirValorReservaComConsumo({ reservaId, valorReducao }) {
  if (!reservaId || !Number.isFinite(valorReducao) || valorReducao <= 0) {
    return null;
  }

  const resultado = await queryWithParams(
    `IF COL_LENGTH('reserva', 'valor') IS NOT NULL
     BEGIN
       UPDATE reserva
       SET valor = COALESCE(valor, 0) - @valorReducao
       OUTPUT INSERTED.valor AS valor_atualizado
       WHERE id = @reservaId;
     END
     ELSE
     BEGIN
       SELECT CAST(NULL AS DECIMAL(10,2)) AS valor_atualizado;
     END`,
    {
      reservaId,
      valorReducao,
    },
  );

  if (!resultado.recordset?.length) {
    return null;
  }

  const valorAtualizado = resultado.recordset[0]?.valor_atualizado;
  if (valorAtualizado === null || valorAtualizado === undefined) {
    return null;
  }

  return Number(valorAtualizado);
}

async function listarLancamentosDoHospede({ hotelId, hospedeId, limit = 6 }) {
  const limiteNormalizado = Math.min(Math.max(Number(limit) || 6, 1), 20);

  const resultado = await queryWithParams(
    `SELECT TOP (@limit)
        cl.id,
        cl.hotel_id,
        cl.hospede_id,
        cl.reserva_id,
        cl.produto_id,
        cl.quantidade,
        cl.valor_unitario,
        cl.valor_total,
        cl.created_at,
        p.nome AS produto_nome,
        p.categoria AS produto_categoria,
        h.nome AS hospede_nome,
        r.codigo AS reserva_codigo,
        q.numero AS quarto_numero
     FROM consumo_lancamento cl
     INNER JOIN hospede h ON h.id = cl.hospede_id
     INNER JOIN produto p ON p.id = cl.produto_id
     LEFT JOIN reserva r ON r.id = cl.reserva_id
     LEFT JOIN quarto q ON q.id = r.quarto_id
     WHERE cl.hotel_id = @hotelId
       AND cl.hospede_id = @hospedeId
     ORDER BY cl.created_at DESC, cl.id DESC`,
    { hotelId, hospedeId, limit: limiteNormalizado },
  );

  return resultado.recordset;
}

async function obterSaldoHospede({ hotelId, hospedeId }) {
  const resultado = await queryWithParams(
    `SELECT COALESCE(SUM(valor_total), 0) AS saldo
     FROM consumo_lancamento
     WHERE hotel_id = @hotelId
       AND hospede_id = @hospedeId`,
    { hotelId, hospedeId },
  );

  return Number(resultado.recordset[0]?.saldo || 0);
}

export async function listarCatalogoConsumo({ categoria }) {
  const resultado = await listarProdutos({ categoria });

  return resultado.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    categoria: produto.categoria || 'Geral',
    preco_venda: produto.preco_venda,
  }));
}

export async function listarHospedesConsumo({ hotelId, nome, page = 1, limit = 200 }) {
  await validarHotelExiste(hotelId);

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const offset = (pageNumber - 1) * pageSize;

  const filtros = ['h.hotel_id = @hotelId'];
  const params = { hotelId, offset, pageSize };

  if (nome) {
    filtros.push('h.nome LIKE @nome');
    params.nome = `%${nome}%`;
  }

  const whereClause = `WHERE ${filtros.join(' AND ')}`;

  const resultado = await queryWithParams(
    `SELECT
        h.id,
        h.nome,
        h.email,
        h.telefone,
        h.cpf,
        h.passaporte,
        q.numero AS quarto_numero,
        r.codigo AS reserva_codigo,
        r.valor AS reserva_valor,
        r.data_checkout,
        r.status AS reserva_status
     FROM hospede h
     LEFT JOIN (
       SELECT
         r1.hospede_id,
         r1.codigo,
         r1.valor,
         r1.data_checkout,
         r1.status,
         q1.numero,
         ROW_NUMBER() OVER (
           PARTITION BY r1.hospede_id
           ORDER BY
             CASE
               WHEN LOWER(r1.status) IN ('confirmada', 'check-in', 'ocupado')
                AND CONVERT(date, GETDATE()) BETWEEN CONVERT(date, r1.data_checkin) AND CONVERT(date, r1.data_checkout)
               THEN 0
               ELSE 1
             END,
             r1.data_checkin DESC,
             r1.data_checkout DESC
         ) AS rn
       FROM reserva r1
       LEFT JOIN quarto q1 ON q1.id = r1.quarto_id
       INNER JOIN hospede h1 ON h1.id = r1.hospede_id
       WHERE h1.hotel_id = @hotelId
     ) r ON r.hospede_id = h.id AND r.rn = 1
     LEFT JOIN quarto q ON q.numero = r.numero
     ${whereClause}
     ORDER BY h.nome
     OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
    params,
  );

  return resultado.recordset;
}

export async function obterResumoLancamentoConsumo({ hotelId, hospedeId }) {
  await validarHotelExiste(hotelId);
  const hospede = await validarHospedeDoHotel({ hotelId, hospedeId });
  const reservaAtual = await obterReservaAtual({ hotelId, hospedeId });
  const lancamentosRecentes = await listarLancamentosDoHospede({ hotelId, hospedeId, limit: 6 });
  const saldo = await obterSaldoHospede({ hotelId, hospedeId });

  return {
    hospede: {
      id: hospede.id,
      nome: hospede.nome,
    },
    reservaAtual,
    lancamentosRecentes,
    saldo,
  };
}

export async function obterValorHospedeConsumo({ hotelId, hospedeId }) {
  await validarHotelExiste(hotelId);
  const hospede = await validarHospedeDoHotel({ hotelId, hospedeId });
  const reservaAtual = await obterReservaAtual({ hotelId, hospedeId });
  const saldo = await obterSaldoHospede({ hotelId, hospedeId });

  return {
    hospede: {
      id: hospede.id,
      nome: hospede.nome,
    },
    saldo,
    reservaAtual: reservaAtual
      ? {
          id: reservaAtual.id,
          codigo: reservaAtual.codigo,
          valor: reservaAtual.valor ?? 0,
          data_checkout: reservaAtual.data_checkout,
          status: reservaAtual.status,
          quarto_numero: reservaAtual.quarto_numero,
        }
      : null,
  };
}

export async function criarLancamentoConsumo({ hotelId, hospedeId, produtoId, quantidade = 1 }) {
  await garantirTabelaConsumo();
  await validarHotelExiste(hotelId);
  const hospede = await validarHospedeDoHotel({ hotelId, hospedeId });
  const produto = await validarProdutoExiste(produtoId);

  const quantidadeNormalizada = Math.max(parseInt(quantidade, 10) || 1, 1);
  const valorUnitario = Number(produto.preco_venda || 0);

  if (!Number.isFinite(valorUnitario) || valorUnitario <= 0) {
    throw new Error('Produto sem valor de venda válido');
  }

  const reservaAtual = await obterReservaAtual({ hotelId, hospedeId });
  const valorTotal = Number((valorUnitario * quantidadeNormalizada).toFixed(2));

  const inserido = await queryWithParams(
    `INSERT INTO consumo_lancamento (
        hotel_id,
        hospede_id,
        reserva_id,
        produto_id,
        quantidade,
        valor_unitario,
        valor_total
     )
     OUTPUT INSERTED.id
     VALUES (@hotelId, @hospedeId, @reservaId, @produtoId, @quantidade, @valorUnitario, @valorTotal)`,
    {
      hotelId,
      hospedeId,
      reservaId: reservaAtual?.id || null,
      produtoId,
      quantidade: quantidadeNormalizada,
      valorUnitario,
      valorTotal,
    },
  );

  const lancamentoId = inserido.recordset[0]?.id;

  const valorReservaAtualizado = await atualizarValorReservaComConsumo({
    reservaId: reservaAtual?.id || null,
    valorAcrescimo: valorTotal,
  });

  const detalhe = await queryWithParams(
    `SELECT TOP 1
        cl.id,
        cl.hotel_id,
        cl.hospede_id,
        cl.reserva_id,
        cl.produto_id,
        cl.quantidade,
        cl.valor_unitario,
        cl.valor_total,
        cl.created_at,
        p.nome AS produto_nome,
        p.categoria AS produto_categoria,
        h.nome AS hospede_nome,
        r.codigo AS reserva_codigo,
        r.quarto_id,
        r.valor AS reserva_valor,
        q.numero AS quarto_numero,
        r.data_checkout
     FROM consumo_lancamento cl
     INNER JOIN hospede h ON h.id = cl.hospede_id
     INNER JOIN produto p ON p.id = cl.produto_id
     LEFT JOIN reserva r ON r.id = cl.reserva_id
     LEFT JOIN quarto q ON q.id = r.quarto_id
     WHERE cl.id = @lancamentoId
       AND cl.hotel_id = @hotelId
       AND cl.hospede_id = @hospedeId`,
    { lancamentoId, hotelId, hospedeId },
  );

  if (detalhe.recordset.length === 0) {
    throw new Error('Falha ao registrar lançamento');
  }

  const saldo = await obterSaldoHospede({ hotelId, hospedeId });
  const lancamentosRecentes = await listarLancamentosDoHospede({ hotelId, hospedeId, limit: 6 });

  try {
    await registrarLogReserva({
      hotelId,
      reservaId: reservaAtual?.id || detalhe.recordset[0].reserva_id || null,
      quartoId: reservaAtual?.quarto_id || detalhe.recordset[0].quarto_id || null,
      hospedeId,
      tipo: TIPOS_LOG_RESERVA.LANCAMENTO_CONSUMO,
      titulo: 'Lançamento de consumo',
      descricao: `${detalhe.recordset[0].produto_nome} adicionado ao consumo.`,
      referenciaTipo: 'consumo_lancamento',
      referenciaId: lancamentoId,
      dados: {
        produto_id: produtoId,
        produto_nome: detalhe.recordset[0].produto_nome,
        quantidade: quantidadeNormalizada,
        valor_total: valorTotal,
      },
    });
  } catch (erroLog) {
    console.warn('Aviso ao registrar log de lançamento de consumo:', erroLog?.message);
  }

  return {
    ...detalhe.recordset[0],
    hospede_nome: hospede.nome,
    reserva_codigo: reservaAtual?.codigo || detalhe.recordset[0].reserva_codigo || null,
    reserva_valor: valorReservaAtualizado ?? detalhe.recordset[0].reserva_valor ?? reservaAtual?.valor ?? null,
    quarto_numero: reservaAtual?.quarto_numero || detalhe.recordset[0].quarto_numero || null,
    saldo,
    lancamentosRecentes,
  };
}

export async function removerLancamentoConsumo({ hotelId, lancamentoId }) {
  await garantirTabelaConsumo();
  await validarHotelExiste(hotelId);

  const lancamento = await queryWithParams(
    `SELECT TOP 1
        cl.id,
        cl.hotel_id,
        cl.hospede_id,
        cl.reserva_id,
      r.quarto_id,
        cl.produto_id,
        cl.quantidade,
        cl.valor_unitario,
        cl.valor_total,
        cl.created_at,
        p.nome AS produto_nome,
        p.categoria AS produto_categoria,
        h.nome AS hospede_nome,
        r.codigo AS reserva_codigo,
        r.valor AS reserva_valor,
        q.numero AS quarto_numero,
        r.data_checkout
     FROM consumo_lancamento cl
     INNER JOIN hospede h ON h.id = cl.hospede_id
     INNER JOIN produto p ON p.id = cl.produto_id
     LEFT JOIN reserva r ON r.id = cl.reserva_id
     LEFT JOIN quarto q ON q.id = r.quarto_id
     WHERE cl.id = @lancamentoId
       AND cl.hotel_id = @hotelId`,
    { lancamentoId, hotelId },
  );

  if (!lancamento.recordset?.length) {
    throw new Error('Lançamento não encontrado');
  }

  const alvo = lancamento.recordset[0];

  const removido = await queryWithParams(
    `DELETE FROM consumo_lancamento
     OUTPUT DELETED.id
     WHERE id = @lancamentoId
       AND hotel_id = @hotelId`,
    { lancamentoId, hotelId },
  );

  if (!removido.recordset?.length) {
    throw new Error('Falha ao remover lançamento');
  }

  const reservaValorAtualizado = await reduzirValorReservaComConsumo({
    reservaId: alvo.reserva_id || null,
    valorReducao: Number(alvo.valor_total || 0),
  });

  const saldo = await obterSaldoHospede({ hotelId, hospedeId: alvo.hospede_id });
  const lancamentosRecentes = await listarLancamentosDoHospede({ hotelId, hospedeId: alvo.hospede_id, limit: 6 });

  try {
    await registrarLogReserva({
      hotelId,
      reservaId: alvo.reserva_id || null,
      quartoId: alvo.quarto_id || null,
      hospedeId: alvo.hospede_id,
      tipo: TIPOS_LOG_RESERVA.CONSUMO_REMOVIDO,
      titulo: 'Consumo removido',
      descricao: `${alvo.produto_nome} removido do consumo.`,
      referenciaTipo: 'consumo_lancamento',
      referenciaId: alvo.id,
      dados: {
        produto_id: alvo.produto_id,
        produto_nome: alvo.produto_nome,
        quantidade: alvo.quantidade,
        valor_total: alvo.valor_total,
      },
    });
  } catch (erroLog) {
    console.warn('Aviso ao registrar log de remoção de consumo:', erroLog?.message);
  }

  return {
    ...alvo,
    removido: true,
    reserva_valor: reservaValorAtualizado ?? alvo.reserva_valor ?? null,
    saldo,
    lancamentosRecentes,
  };
}
