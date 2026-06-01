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
         foto_url NVARCHAR(MAX) NULL
       );
     END
     ELSE
     BEGIN
       IF COL_LENGTH('produto', 'foto_url') IS NULL
         ALTER TABLE produto ADD foto_url NVARCHAR(MAX) NULL;

       IF COL_LENGTH('produto', 'foto_url') IS NOT NULL
         ALTER TABLE produto ALTER COLUMN foto_url NVARCHAR(MAX) NULL;
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
         ALTER TABLE produto ADD foto_url NVARCHAR(MAX) NULL;

       IF COL_LENGTH('produto', 'foto_url') IS NOT NULL
         ALTER TABLE produto ALTER COLUMN foto_url NVARCHAR(MAX) NULL;
     END`,
    {}
  );

  colunaFotoUrlGarantida = true;
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

  const whereClause = filtros.length > 0
    ? `WHERE ${filtros.join(' AND ')}`
    : '';

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

export async function criarProduto({
  nome,
  categoria = null,
  precoCusto,
  precoVenda,
  fotoUrl
}) {

  await garantirTabelaProduto();
  await garantirColunaFotoUrlProduto();

  const resultado = await queryWithParams(
    `INSERT INTO produto (
        nome,
        categoria,
        preco_custo,
        preco_venda,
        foto_url
     )
     OUTPUT
        INSERTED.id,
        INSERTED.nome,
        INSERTED.categoria,
        INSERTED.preco_custo,
        INSERTED.preco_venda,
        INSERTED.foto_url
     VALUES (
        @nome,
        @categoria,
        @precoCusto,
        @precoVenda,
        @fotoUrl
     )`,
    {
      nome,
      categoria,
      precoCusto,
      precoVenda,
      fotoUrl: normalizarFotoUrl(fotoUrl),
    }
  );

  return resultado.recordset[0];
}

export async function atualizarProduto({
  produtoId,
  nome,
  categoria,
  precoCusto,
  precoVenda,
  fotoUrl
}) {

  await garantirTabelaProduto();
  await garantirColunaFotoUrlProduto();

  const campos = [];
  const params = { produtoId };

  if (nome !== undefined) {
    campos.push('nome = @nome');
    params.nome = nome;
  }

  if (categoria !== undefined) {
    campos.push('categoria = @categoria');
    params.categoria = categoria;
  }

  if (precoCusto !== undefined) {
    campos.push('preco_custo = @precoCusto');
    params.precoCusto = precoCusto;
  }

  if (precoVenda !== undefined) {
    campos.push('preco_venda = @precoVenda');
    params.precoVenda = precoVenda;
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
     OUTPUT
        INSERTED.id,
        INSERTED.nome,
        INSERTED.categoria,
        INSERTED.preco_custo,
        INSERTED.preco_venda,
        INSERTED.foto_url
     WHERE id = @produtoId`,
    params
  );

  return resultado.recordset[0];
}

export async function deletarProduto({ produtoId }) {
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
