import {
  criarProduto,
  deletarProduto,
  listarProdutos,
  obterProdutoPorId,
  atualizarProduto,
} from '../../services/produtoService.js';

function naoEncontrado(erro) {
  return erro?.message?.toLowerCase().includes('não encontrad') || erro?.message?.toLowerCase().includes('nao encontrad');
}

function erroNenhumCampo(erro) {
  return erro?.message?.includes('Nenhum campo');
}

function erroObrigatorio(erro) {
  return erro?.message?.includes('Campo obrigatório');
}

function erroDuplicado(erro) {
  return erro?.message?.toLowerCase().includes('duplicado');
}

export async function listProdutos(req, res) {
  try {
    const dados = await listarProdutos({ categoria: req.query.categoria });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar produtos:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao listar produtos' });
  }
}

export async function getProduto(req, res) {
  try {
    const dados = await obterProdutoPorId({ produtoId: req.params.produtoId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar produto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar produto' });
  }
}

export async function createProduto(req, res) {
  try {
    const dados = await criarProduto({
      nome: req.body.nome ?? req.body.Nome ?? req.body.productName ?? req.body.product_name,
      categoria: req.body.categoria ?? req.body.Categoria ?? req.body.category ?? req.body.productCategory ?? req.body.product_category,
      precoCusto: req.body.preco_custo ?? req.body.precoCusto ?? req.body.costPrice ?? req.body.cost_price,
      precoVenda: req.body.preco_venda ?? req.body.precoVenda ?? req.body.salePrice ?? req.body.sale_price,
    });
    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar produto:', erro?.message);
    if (erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar produto' });
  }
}

export async function updateProduto(req, res) {
  try {
    const dados = await atualizarProduto({
      produtoId: req.params.produtoId,
      nome: req.body.nome ?? req.body.Nome ?? req.body.productName ?? req.body.product_name,
      categoria: req.body.categoria ?? req.body.Categoria ?? req.body.category ?? req.body.productCategory ?? req.body.product_category,
      precoCusto: req.body.preco_custo ?? req.body.precoCusto ?? req.body.costPrice ?? req.body.cost_price,
      precoVenda: req.body.preco_venda ?? req.body.precoVenda ?? req.body.salePrice ?? req.body.sale_price,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar produto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroNenhumCampo(erro) || erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar produto' });
  }
}

export async function removeProduto(req, res) {
  try {
    const dados = await deletarProduto({ produtoId: req.params.produtoId });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Produto deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar produto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao deletar produto' });
  }
}