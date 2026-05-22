import {
  atualizarAndar,
  atualizarCategoriaQuarto,
  atualizarQuarto,
  criarAndar,
  criarCategoriaQuarto,
  criarQuarto,
  deletarAndar,
  deletarCategoriaQuarto,
  deletarQuarto,
  listarAndares,
  listarCategoriasQuarto,
  listarQuartos,
  obterAndarPorId,
  obterArquiteturaHotel,
  obterCategoriaQuartoPorId,
  obterQuartoPorId,
  restaurarStatusQuarto,
} from '../../services/estruturaService.js';

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

function erroConflitoFk(erro) {
  const mensagem = String(erro?.message || '').toLowerCase();
  return mensagem.includes('reference constraint') || mensagem.includes('foreign key');
}

export async function getArquiteturaHotel(req, res) {
  try {
    const dados = await obterArquiteturaHotel({ hotelId: req.params.hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar arquitetura do hotel:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar arquitetura do hotel' });
  }
}

export async function listAndares(req, res) {
  try {
    const dados = await listarAndares({ hotelId: req.params.hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar andares:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar andares' });
  }
}

export async function getAndar(req, res) {
  try {
    const dados = await obterAndarPorId({
      hotelId: req.params.hotelId,
      andarId: req.params.andarId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar andar:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar andar' });
  }
}

export async function createAndar(req, res) {
  try {
    const dados = await criarAndar({
      hotelId: req.params.hotelId,
      numero: req.body.numero ?? req.body.Numero,
      nome: req.body.nome ?? req.body.Nome ?? null,
    });
    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar andar:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar andar' });
  }
}

export async function updateAndar(req, res) {
  try {
    const dados = await atualizarAndar({
      hotelId: req.params.hotelId,
      andarId: req.params.andarId,
      numero: req.body.numero,
      nome: req.body.nome,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar andar:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroNenhumCampo(erro) || erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar andar' });
  }
}

export async function removeAndar(req, res) {
  try {
    const dados = await deletarAndar({
      hotelId: req.params.hotelId,
      andarId: req.params.andarId,
    });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Andar removido com sucesso' });
  } catch (erro) {
    console.error('Erro ao remover andar:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroConflitoFk(erro)) return res.status(409).json({ erro: 'Não é possível remover o andar com quartos vinculados' });
    return res.status(500).json({ erro: 'Erro ao remover andar' });
  }
}

export async function listCategorias(req, res) {
  try {
    const dados = await listarCategoriasQuarto({ hotelId: req.params.hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar categorias:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar categorias de quarto' });
  }
}

export async function getCategoria(req, res) {
  try {
    const dados = await obterCategoriaQuartoPorId({
      hotelId: req.params.hotelId,
      categoriaId: req.params.categoriaId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar categoria:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar categoria de quarto' });
  }
}

export async function createCategoria(req, res) {
  try {
    const nome = req.body.nome
      ?? req.body.Nome
      ?? req.body.nomeCategoria
      ?? req.body.nome_categoria
      ?? req.body.categoryName
      ?? req.body.category_name
      ?? req.body.category
      ?? req.body.title
      ?? req.body.titulo;
    const descricao = req.body.descricao ?? req.body.Descricao ?? req.body.internalDescription ?? req.body.internal_description ?? null;
    const capacidade = req.body.capacidade ?? req.body.Capacidade ?? req.body.maxOccupancy ?? req.body.max_occupancy;
    const precoDiaria = req.body.preco_diaria ?? req.body.PrecoDiaria ?? req.body.precoDiaria ?? req.body.dailyRate ?? req.body.daily_rate;
    const fotoUrl = req.body.foto_url ?? req.body.fotoUrl;

    const dados = await criarCategoriaQuarto({
      hotelId: req.params.hotelId,
      nome,
      descricao,
      capacidade,
      precoDiaria,
      fotoUrl,
    });
    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar categoria:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar categoria de quarto' });
  }
}

export async function updateCategoria(req, res) {
  try {
    const nome = req.body.nome
      ?? req.body.Nome
      ?? req.body.nomeCategoria
      ?? req.body.nome_categoria
      ?? req.body.categoryName
      ?? req.body.category_name
      ?? req.body.category
      ?? req.body.title
      ?? req.body.titulo;
    const descricao = req.body.descricao ?? req.body.internalDescription ?? req.body.internal_description;
    const capacidade = req.body.capacidade ?? req.body.maxOccupancy ?? req.body.max_occupancy;
    const precoDiaria = req.body.preco_diaria ?? req.body.precoDiaria ?? req.body.dailyRate ?? req.body.daily_rate;
    const fotoUrl = req.body.foto_url ?? req.body.fotoUrl;

    const dados = await atualizarCategoriaQuarto({
      hotelId: req.params.hotelId,
      categoriaId: req.params.categoriaId,
      nome,
      descricao,
      capacidade,
      precoDiaria,
      fotoUrl,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar categoria:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroNenhumCampo(erro) || erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar categoria de quarto' });
  }
}

export async function removeCategoria(req, res) {
  try {
    const dados = await deletarCategoriaQuarto({
      hotelId: req.params.hotelId,
      categoriaId: req.params.categoriaId,
    });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Categoria removida com sucesso' });
  } catch (erro) {
    console.error('Erro ao remover categoria:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroConflitoFk(erro)) return res.status(409).json({ erro: 'Não é possível remover categoria com quartos vinculados' });
    return res.status(500).json({ erro: 'Erro ao remover categoria de quarto' });
  }
}

export async function listQuartos(req, res) {
  try {
    const dados = await listarQuartos({
      hotelId: req.params.hotelId,
      andarId: req.query.andar_id,
      categoriaId: req.query.categoria_id,
      status: req.query.status,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar quartos:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar quartos' });
  }
}

export async function getQuarto(req, res) {
  try {
    const dados = await obterQuartoPorId({
      hotelId: req.params.hotelId,
      quartoId: req.params.quartoId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar quarto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar quarto' });
  }
}

export async function createQuarto(req, res) {
  try {
    const dados = await criarQuarto({
      hotelId: req.params.hotelId,
      andarId: req.body.andar_id ?? req.body.andarId,
      categoriaId: req.body.categoria_id ?? req.body.categoriaId,
      numero: req.body.numero ?? req.body.Numero,
      descricao: req.body.descricao ?? req.body.Descricao ?? null,
      capacidade: req.body.capacidade,
      quantidadeCamas: req.body.quantidade_camas ?? req.body.quantidadeCamas ?? null,
      status: req.body.status ?? 'livre',
      fotos: req.body.fotos,
    });
    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar quarto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar quarto' });
  }
}

export async function updateQuarto(req, res) {
  try {
    const dados = await atualizarQuarto({
      hotelId: req.params.hotelId,
      quartoId: req.params.quartoId,
      andarId: req.body.andar_id,
      categoriaId: req.body.categoria_id,
      numero: req.body.numero,
      descricao: req.body.descricao,
      capacidade: req.body.capacidade,
      quantidadeCamas: req.body.quantidade_camas,
      status: req.body.status,
      statusAnterior: req.body.status_anterior ?? req.body.statusAnterior,
      motivoManutencao: req.body.motivo_manutencao ?? req.body.motivoManutencao,
      categoriaManutencao: req.body.categoria_manutencao ?? req.body.categoriaManutencao,
      descricaoManutencao: req.body.descricao_manutencao ?? req.body.descricaoManutencao,
      fotos: req.body.fotos,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar quarto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroNenhumCampo(erro) || erroObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar quarto' });
  }
}

export async function removeQuarto(req, res) {
  try {
    const dados = await deletarQuarto({
      hotelId: req.params.hotelId,
      quartoId: req.params.quartoId,
    });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Quarto removido com sucesso' });
  } catch (erro) {
    console.error('Erro ao remover quarto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao remover quarto' });
  }
}

export async function restaurarQuarto(req, res) {
  try {
    const dados = await restaurarStatusQuarto({
      hotelId: req.params.hotelId,
      quartoId: req.params.quartoId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao restaurar status do quarto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao restaurar status do quarto' });
  }
}
