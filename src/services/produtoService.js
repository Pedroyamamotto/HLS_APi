import { queryWithParams } from '../utils/database.js';

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
        preco_venda
     FROM produto
     ${whereClause}
     ORDER BY nome`,
    params
  );

  return resultado.recordset;
}

export async function obterProdutoPorId({ produtoId }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        id,
        nome,
        categoria,
        preco_custo,
        preco_venda
     FROM produto
     WHERE id = @produtoId`,
    { produtoId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Produto não encontrado');
  }

  return resultado.recordset[0];
}

export async function criarProduto({ nome, categoria = null, precoCusto, precoVenda }) {
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
    `INSERT INTO produto (nome, categoria, preco_custo, preco_venda)
     OUTPUT INSERTED.id, INSERTED.nome, INSERTED.categoria, INSERTED.preco_custo, INSERTED.preco_venda
     VALUES (@nome, @categoria, @precoCusto, @precoVenda)`,
    {
      nome: nomeNormalizado,
      categoria: categoriaNormalizada,
      precoCusto: precoCustoNumero,
      precoVenda: precoVendaNumero,
    }
  );

  return resultado.recordset[0];
}

export async function atualizarProduto({ produtoId, nome, categoria, precoCusto, precoVenda }) {
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

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE produto
     SET ${campos.join(', ')}
     OUTPUT INSERTED.id, INSERTED.nome, INSERTED.categoria, INSERTED.preco_custo, INSERTED.preco_venda
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