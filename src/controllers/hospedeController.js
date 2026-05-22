import {
  atualizarDependente,
  atualizarHospede,
  criarDependente,
  criarHospede,
  deletarDependente,
  deletarHospede,
  atualizarPresencaRefeicaoHospede,
  listarDependentes,
  listarPresencasRefeicoesHospede,
  listarHospedes,
  obterHospedePorId,
} from '../services/hospedeService.js';

function naoEncontrado(erro) {
  return erro?.message?.toLowerCase().includes('não encontrado')
    || erro?.message?.toLowerCase().includes('nao encontrado');
}

function erroCampoObrigatorio(erro) {
  return erro?.message?.toLowerCase().includes('obrigatório')
    || erro?.message?.toLowerCase().includes('obrigatorio');
}

function erroSemCampo(erro) {
  return erro?.message?.includes('Nenhum campo');
}

function erroDadosInvalidos(erro) {
  return erro?.message?.toLowerCase().includes('dados inválidos')
    || erro?.message?.toLowerCase().includes('dados invalidos');
}

function erroDuplicado(erro) {
  return erro?.message?.toLowerCase().includes('registro duplicado');
}

function parseBoolean(valor, defaultValue = true) {
  if (valor === undefined) return defaultValue;
  if (valor === true || valor === 'true' || valor === 1 || valor === '1') return true;
  if (valor === false || valor === 'false' || valor === 0 || valor === '0') return false;
  return defaultValue;
}

export async function listHospedes(req, res) {
  try {
    const dados = await listarHospedes({
      hotelId: req.params.hotelId,
      nome: req.query.nome,
      email: req.query.email,
      documento: req.query.documento,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({ sucesso: true, ...dados });
  } catch (erro) {
    console.error('Erro ao listar hospedes:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao listar hospedes' });
  }
}

export async function getHospede(req, res) {
  try {
    const dados = await obterHospedePorId({ id: req.params.id, hotelId: req.params.hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar hospede:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar hospede' });
  }
}

export async function createHospede(req, res) {
  try {
    const dados = await criarHospede({
      hotelId: req.params.hotelId,
      nome: req.body.nome ?? req.body.Nome,
      email: req.body.email ?? req.body.Email ?? null,
      telefone: req.body.telefone ?? req.body.Telefone ?? null,
      cpf: req.body.cpf ?? req.body.CPF,
      passaporte: req.body.passaporte ?? req.body.Passaporte,
      documento: req.body.documento ?? req.body.Documento,
      nacionalidade: req.body.nacionalidade ?? req.body.Nacionalidade ?? null,
      endereco: req.body.endereco ?? req.body.Endereco ?? null,
      dataNascimento: req.body.data_nascimento ?? req.body.dataNascimento ?? null,
    });

    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar hospede:', erro?.message);
    if (erroCampoObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDadosInvalidos(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar hospede' });
  }
}

export async function updateHospede(req, res) {
  try {
    const dados = await atualizarHospede({
      id: req.params.id,
      hotelId: req.params.hotelId,
      nome: req.body.nome ?? req.body.Nome,
      email: req.body.email ?? req.body.Email,
      telefone: req.body.telefone ?? req.body.Telefone,
      cpf: req.body.cpf ?? req.body.CPF,
      passaporte: req.body.passaporte ?? req.body.Passaporte,
      documento: req.body.documento ?? req.body.Documento,
      nacionalidade: req.body.nacionalidade ?? req.body.Nacionalidade,
      endereco: req.body.endereco ?? req.body.Endereco,
      dataNascimento: req.body.data_nascimento ?? req.body.dataNascimento,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar hospede:', erro?.message);
    if (erroSemCampo(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDadosInvalidos(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar hospede' });
  }
}

export async function removeHospede(req, res) {
  try {
    const dados = await deletarHospede({ id: req.params.id, hotelId: req.params.hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao deletar hospede:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao deletar hospede' });
  }
}

export async function listDependentes(req, res) {
  try {
    const dados = await listarDependentes({ hospedeId: req.params.id, hotelId: req.params.hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar dependentes:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar dependentes' });
  }
}

export async function createDependente(req, res) {
  try {
    const dados = await criarDependente({
      hospedeId: req.params.id,
      hotelId: req.params.hotelId,
      nome: req.body.nome ?? req.body.Nome,
      documento: req.body.documento ?? req.body.Documento ?? null,
    });

    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar dependente:', erro?.message);
    if (erroCampoObrigatorio(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDadosInvalidos(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar dependente' });
  }
}

export async function updateDependente(req, res) {
  try {
    const dados = await atualizarDependente({
      hospedeId: req.params.id,
      hotelId: req.params.hotelId,
      dependenteId: req.params.dependenteId,
      nome: req.body.nome ?? req.body.Nome,
      documento: req.body.documento ?? req.body.Documento,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar dependente:', erro?.message);
    if (erroSemCampo(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDadosInvalidos(erro)) return res.status(400).json({ erro: erro.message });
    if (erroDuplicado(erro)) return res.status(409).json({ erro: erro.message });
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar dependente' });
  }
}

export async function removeDependente(req, res) {
  try {
    const dados = await deletarDependente({
      hospedeId: req.params.id,
      hotelId: req.params.hotelId,
      dependenteId: req.params.dependenteId,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao deletar dependente:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao deletar dependente' });
  }
}

export async function listRefeicoesParticipadas(req, res) {
  try {
    const dados = await listarPresencasRefeicoesHospede({ hospedeId: req.params.id, hotelId: req.params.hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar presencas de refeicoes:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar presencas de refeicoes' });
  }
}

export async function updateRefeicaoPresenca(req, res) {
  try {
    const dados = await atualizarPresencaRefeicaoHospede({
      hospedeId: req.params.id,
      hotelId: req.params.hotelId,
      pedidoConsumoId: req.params.pedidoConsumoId,
      presente: parseBoolean(req.body.presente, true),
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar presenca de refeicao:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar presenca de refeicao' });
  }
}
