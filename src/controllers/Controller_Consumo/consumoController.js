import {
  criarLancamentoConsumo,
  listarCatalogoConsumo,
  listarHospedesConsumo,
  obterResumoLancamentoConsumo,
  obterValorHospedeConsumo,
  removerLancamentoConsumo,
} from '../../services/consumoService.js';

function naoEncontrado(erro) {
  return erro?.message?.toLowerCase().includes('não encontrad') || erro?.message?.toLowerCase().includes('nao encontrad');
}

function erroObrigatorio(erro) {
  return erro?.message?.includes('Campo obrigatório') || erro?.message?.includes('Campos obrigatórios');
}

function erroDuplicado(erro) {
  return erro?.message?.toLowerCase().includes('duplicado');
}

export async function getCatalogoConsumo(req, res) {
  try {
    const dados = await listarCatalogoConsumo({ categoria: req.query.categoria });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar catalogo de consumo:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao listar catalogo de consumo' });
  }
}

export async function getHospedesConsumo(req, res) {
  try {
    const dados = await listarHospedesConsumo({
      hotelId: req.params.hotelId,
      nome: req.query.nome,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar hospedes para consumo:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar hospedes para consumo' });
  }
}

export async function getResumoHospedeConsumo(req, res) {
  try {
    const dados = await obterResumoLancamentoConsumo({
      hotelId: req.params.hotelId,
      hospedeId: req.params.hospedeId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter resumo de consumo:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter resumo de consumo' });
  }
}

export async function getValorHospedeConsumo(req, res) {
  try {
    const dados = await obterValorHospedeConsumo({
      hotelId: req.params.hotelId,
      hospedeId: req.params.hospedeId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter valor de consumo:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter valor de consumo' });
  }
}

export async function postLancamentoConsumo(req, res) {
  try {
    const dados = await criarLancamentoConsumo({
      hotelId: req.params.hotelId,
      hospedeId: req.body.hospedeId ?? req.body.hospede_id,
      produtoId: req.body.produtoId ?? req.body.produto_id,
      quantidade: req.body.quantidade ?? 1,
    });
    return res.status(201).json({ sucesso: true, dados, mensagem: 'Lançamento registrado com sucesso' });
  } catch (erro) {
    console.error('Erro ao registrar lançamento de consumo:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao registrar lançamento de consumo' });
  }
}

export async function deleteLancamentoConsumo(req, res) {
  try {
    const dados = await removerLancamentoConsumo({
      hotelId: req.params.hotelId,
      lancamentoId: req.params.lancamentoId,
    });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Lançamento removido com sucesso' });
  } catch (erro) {
    console.error('Erro ao remover lançamento de consumo:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao remover lançamento de consumo' });
  }
}
