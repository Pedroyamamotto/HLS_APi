import { queryWithParams } from '../utils/database.js';

function normalizarFotoUrl(valor) {
  if (valor === undefined) return null;
  if (valor === null) return null;
  const url = String(valor).trim();
  return url || null;
}

let colunaFotoUrlGarantida = false;
let tabelaProdutoGarantida = false;

async function garantirTabelaProduto() {
  if (tabelaProdutoGarantida) return;

  await queryWithParams(
    `IF OBJECT_ID('produto', 'U') IS NULL
     BEGIN
       CREATE TABLE produto (
         id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
         nome NVARCHAR(150) NOT NULL,
         categoria NVARCHAR(150) NULL,
         preco_custo DECIMAL(10,2) NOT NULL,
         preco_venda DECIMAL(10,2) NOT NULL,
         foto_url NVARCHAR(500) NULL
       );
     END
     ELSE
     BEGIN
       IF COL_LENGTH('produto', 'foto_url') IS NULL
         ALTER TABLE produto ADD foto_url NVARCHAR(500) NULL;

       IF COL_LENGTH('produto', 'foto_url') IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM sys.columns
           WHERE object_id = OBJECT_ID('produto')
             AND name = 'foto_url'
             AND system_type_id <> 231
         )
         ALTER TABLE produto ALTER COLUMN foto_url NVARCHAR(500) NULL;
     END`,
    {}
  );

  tabelaProdutoGarantida = true;
}

async function garantirColunaFotoUrlProduto() {
  if (colunaFotoUrlGarantida) return;

  await queryWithParams(
    `IF OBJECT_ID('produto', 'U') IS NOT NULL
     BEGIN
       IF COL_LENGTH('produto', 'foto_url') IS NULL
         ALTER TABLE produto ADD foto_url NVARCHAR(500) NULL;

       IF COL_LENGTH('produto', 'foto_url') IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM sys.columns
           WHERE object_id = OBJECT_ID('produto')
             AND name = 'foto_url'
             AND system_type_id <> 231
         )
         ALTER TABLE produto ALTER COLUMN foto_url NVARCHAR(500) NULL;
     END`,
    {}
  );

  colunaFotoUrlGarantida = true;
}

function normalizarNumeroEntrada(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : NaN;
  }

  if (typeof valor === 'string') {
    const limpo = valor.trim().replace(',', '.');
    if (!limpo) return null;
    return Number(limpo);
  }

  return Number(valor);
}

async function validarNomeProdutoUnico({ nome, ignorarId = null }) {
  const params = { nome };
  let sql = `SELECT TOP 1 id
             FROM produto
             WHERE LOWER(nome) = LOWER(@nome)`;

  if (ignorarId) {
    sql += ' AND id <> @ignorarId';
    params.ignorarId = ignorarId;
  }

  const resultado = await queryWithParams(sql, params);

  if (resultado.recordset.length > 0) {
    throw new Error('Registro duplicado: já existe produto com este nome');
  }
}

export async function listarProdutos({ categoria }) {
  await garantirTabelaProduto();
  await garantirColunaFotoUrlProduto();

  const filtros = [];
  const params = {};

  if (categoria) {
    filtros.push('LOWER(categoria) = LOWER(@categoria)');
    params.categoria = String(categoria).trim();
  }

  const whereClause = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

  const resultado = await queryWithParams(
    `SELECT
        id,
        nome,
        categoria,
        preco_custo,
        preco_venda,
        foto_url
     FROM produto
     ${whereClause}
     ORDER BY nome`,
    params
  );

  return resultado.recordset;
}

export async function obterProdutoPorId({ produtoId }) {
  await garantirTabelaProduto();
  await garantirColunaFotoUrlProduto();

  const resultado = await queryWithParams(
    `SELECT TOP 1
        id,
        nome,
        categoria,
        preco_custo,
        preco_venda,
        foto_url
     FROM produto
     WHERE id = @produtoId`,
    { produtoId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Produto não encontrado');
  }

  return resultado.recordset[0];
}

export async function criarProduto({ nome, categoria = null, precoCusto, precoVenda, fotoUrl }) {
  await garantirTabelaProduto();
  await garantirColunaFotoUrlProduto();

  if (!nome) {
    throw new Error('Campo obrigatório: nome');
  }

  const precoCustoNumero = normalizarNumeroEntrada(precoCusto);
  if (!Number.isFinite(precoCustoNumero)) {
    throw new Error('Campo obrigatório: preco_custo');
  }

  const precoVendaNumero = normalizarNumeroEntrada(precoVenda);
  if (!Number.isFinite(precoVendaNumero)) {
    throw new Error('Campo obrigatório: preco_venda');
  }

  const nomeNormalizado = String(nome).trim();
  const categoriaNormalizada = categoria === undefined ? null : (categoria === null ? null : String(categoria).trim());

  await validarNomeProdutoUnico({ nome: nomeNormalizado });

  const resultado = await queryWithParams(
    `INSERT INTO produto (nome, categoria, preco_custo, preco_venda, foto_url)
     OUTPUT INSERTED.id, INSERTED.nome, INSERTED.categoria, INSERTED.preco_custo, INSERTED.preco_venda, INSERTED.foto_url
     VALUES (@nome, @categoria, @precoCusto, @precoVenda, @fotoUrl)`,
    {
      nome: nomeNormalizado,
      categoria: categoriaNormalizada,
      precoCusto: precoCustoNumero,
      precoVenda: precoVendaNumero,
      fotoUrl: normalizarFotoUrl(fotoUrl),
    }
  );

  return resultado.recordset[0];
}

export async function atualizarProduto({ produtoId, nome, categoria, precoCusto, precoVenda, fotoUrl }) {
  await garantirTabelaProduto();
  await garantirColunaFotoUrlProduto();

  const produto = await queryWithParams(
    `SELECT TOP 1 id FROM produto WHERE id = @produtoId`,
    { produtoId }
  );

  if (produto.recordset.length === 0) {
    throw new Error('Produto não encontrado');
  }

  const campos = [];
  const params = { produtoId };

  if (nome !== undefined) {
    const nomeNormalizado = String(nome).trim();
    await validarNomeProdutoUnico({ nome: nomeNormalizado, ignorarId: produtoId });
    campos.push('nome = @nome');
    params.nome = nomeNormalizado;
  }

  if (categoria !== undefined) {
    campos.push('categoria = @categoria');
    params.categoria = categoria === null ? null : String(categoria).trim();
  }

  if (precoCusto !== undefined) {
    const precoCustoNumero = normalizarNumeroEntrada(precoCusto);
    if (!Number.isFinite(precoCustoNumero)) {
      throw new Error('Campo obrigatório: preco_custo');
    }
    campos.push('preco_custo = @precoCusto');
    params.precoCusto = precoCustoNumero;
  }

  if (precoVenda !== undefined) {
    const precoVendaNumero = normalizarNumeroEntrada(precoVenda);
    if (!Number.isFinite(precoVendaNumero)) {
      throw new Error('Campo obrigatório: preco_venda');
    }
    campos.push('preco_venda = @precoVenda');
    params.precoVenda = precoVendaNumero;
  }

  if (fotoUrl !== undefined) {
    campos.push('foto_url = @fotoUrl');
    params.fotoUrl = normalizarFotoUrl(fotoUrl);
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE produto
     SET ${campos.join(', ')}
     OUTPUT INSERTED.id, INSERTED.nome, INSERTED.categoria, INSERTED.preco_custo, INSERTED.preco_venda, INSERTED.foto_url
     WHERE id = @produtoId`,
    params
  );

  return resultado.recordset[0];
}

export async function deletarProduto({ produtoId }) {
  await garantirTabelaProduto();
  const resultado = await queryWithParams(
    `DELETE FROM produto
     OUTPUT DELETED.id, DELETED.nome
     WHERE id = @produtoId`,
    { produtoId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Produto não encontrado');
  }

  return resultado.recordset[0];
}