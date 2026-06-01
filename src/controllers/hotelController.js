import {
  atualizarHotel,
  criarHotel,
  deletarHotel,
  listarHoteis,
  obterHotelPorId,
  vincularHotelComLisensa,
  obterPoliticaDoHotel,
  criarPoliticaParaHotel,
  atualizarPoliticaDoHotel,
  deletarPoliticaDoHotel,
  listarRefeicoesDoHotel,
  criarRefeicaoDoHotel,
  atualizarRefeicaoDoHotel,
  deletarRefeicaoDoHotel,
  marcarPresencaHospedeNaRefeicao,
  obterPoliciesTimingDoHotel,
  salvarPoliciesTimingDoHotel,
  obterIntegracaoCardEncoderDoHotel,
  salvarIntegracaoCardEncoderDoHotel,
} from '../services/hotelService.js';

// helpers
function naoEncontrado(erro) {
  return erro?.message?.toLowerCase().includes('nao encontrad') ||
    erro?.message?.toLowerCase().includes('n�o encontrad');
}

function erroNenhumCampo(erro) {
  return erro?.message?.includes('Nenhum campo');
}

function conflito(erro) {
  return erro?.message?.toLowerCase().includes('j� registrada') ||
    erro?.message?.toLowerCase().includes('ja registrada');
}

function extrairFotoUrl(req) {
  const bodyCandidates = [
    req.body?.foto_url,
    req.body?.fotoUrl,
    req.body?.FotoUrl,
    req.body?.image_url,
    req.body?.imageUrl,
    req.body?.logo_url,
    req.body?.logoUrl,
  ];

  for (const value of bodyCandidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const file =
    req.file ||
    req.files?.foto?.[0] ||
    req.files?.imagem?.[0] ||
    req.files?.arquivo?.[0] ||
    req.files?.logo?.[0] ||
    req.files?.fotoHotel?.[0] ||
    req.files?.image?.[0] ||
    req.files?.imagemHotel?.[0];

  if (!file) return undefined;

  if (file.buffer) {
    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/png';
    return `data:${mimeType};base64,${base64}`;
  }

  return undefined;
}

// HOTEL CRUD
export async function listHotels(req, res) {
  try {
    const dados = await listarHoteis();
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar hoteis:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao listar hoteis' });
  }
}

export async function getHotel(req, res) {
  try {
    const dados = await obterHotelPorId({ id: req.params.id });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar hotel:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar hotel' });
  }
}

export async function createHotel(req, res) {
  try {
    const nome = req.body.nome ?? req.body.Nome;
    const moedaLocal = req.body.moeda_local ?? req.body.MoedaLocal;
    const endereco = req.body.endereco ?? req.body.Endereco ?? null;
    const assinaturaId = req.body.assinatura_id ?? req.body.AssinaturaId ?? null;
    const politicaId = req.body.politica_id ?? req.body.PoliticaId ?? null;
    const fotoUrl = extrairFotoUrl(req);

    if (!nome || !moedaLocal) {
      return res.status(400).json({ erro: 'Campos obrigatorios: nome, moeda_local' });
    }

    const dados = await criarHotel({
      nome,
      moedaLocal,
      endereco,
      assinaturaId,
      politicaId,
      fotoUrl,
    });

    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar hotel:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao criar hotel' });
  }
}

export async function updateHotel(req, res) {
  try {
    const dados = await atualizarHotel({
      id: req.params.id,
      nome: req.body.nome ?? req.body.Nome ?? req.body.NomeHotel,
      moedaLocal: req.body.moeda_local ?? req.body.MoedaLocal,
      endereco: req.body.endereco ?? req.body.Endereco,
      assinaturaId: req.body.assinatura_id ?? req.body.AssinaturaId,
      politicaId: req.body.politica_id ?? req.body.PoliticaId,
      fotoUrl: extrairFotoUrl(req),
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar hotel:', erro);
    // Em ambiente de desenvolvimento, retorne a mensagem e stack completa para diagnóstico
    if (process.env.NODE_ENV !== 'production') {
      const payload = {
        erro: erro?.message || 'Erro desconhecido',
        stack: erro?.stack || null,
      };
      if (erroNenhumCampo(erro)) return res.status(400).json(payload);
      if (naoEncontrado(erro)) return res.status(404).json(payload);
      return res.status(500).json(payload);
    }

    if (erroNenhumCampo(erro)) return res.status(400).json({ erro: erro.message });
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar hotel' });
  }
}

export async function removeHotel(req, res) {
  try {
    const dados = await deletarHotel({ id: req.params.id });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Hotel deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar hotel:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao deletar hotel' });
  }
}

export async function linkHotelToLisensa(req, res) {
  try {
    const hotelId = req.params.id;
    const numeroLicensa = req.body.numero_licenca ?? req.body.numeroLicensa;

    if (!numeroLicensa) {
      return res.status(400).json({ erro: 'numero_licenca e obrigatorio' });
    }

    const dados = await vincularHotelComLisensa({
      hotelId,
      numeroLicensa,
      dataVencimentoAssinatura: req.body.data_vencimento_assinatura,
      tipoAssinatura: req.body.tipo_assinatura ?? 'Premium',
      valorMensal: req.body.valor_mensal ?? 0,
      statusAssinatura: req.body.status_assinatura ?? 'ativo',
    });

    return res.status(200).json({ sucesso: true, mensagem: 'Hotel vinculado com sucesso', dados });
  } catch (erro) {
    console.error('Erro ao vincular hotel:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erro?.message?.includes('assinaturas diferentes')) {
      return res.status(409).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao vincular hotel' });
  }
}

// POLITICA CRUD
export async function getPolitica(req, res) {
  try {
    const dados = await obterPoliticaDoHotel({ hotelId: req.params.id });
    if (!dados) return res.status(404).json({ erro: 'Politica nao encontrada para este hotel' });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar politica:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar politica' });
  }
}

export async function createPolitica(req, res) {
  try {
    const dados = await criarPoliticaParaHotel({
      hotelId: req.params.id,
      politicaCancelamento: req.body.politica_cancelamento ?? null,
      horarioCheckIn: req.body.horario_check_in ?? null,
      horarioCheckOut: req.body.horario_check_out ?? null,
      carenciaMinutos: req.body.carencia_minutos ?? null,
    });

    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar politica:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erro?.message?.includes('ja possui')) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar politica' });
  }
}

export async function updatePolitica(req, res) {
  try {
    const dados = await atualizarPoliticaDoHotel({
      hotelId: req.params.id,
      politicaCancelamento: req.body.politica_cancelamento,
      horarioCheckIn: req.body.horario_check_in,
      horarioCheckOut: req.body.horario_check_out,
      carenciaMinutos: req.body.carencia_minutos,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar politica:', erro?.message);
    if (erroNenhumCampo(erro)) return res.status(400).json({ erro: erro.message });
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erro?.message?.includes('nao possui politica') || erro?.message?.includes('n�o possui pol�tica')) {
      return res.status(404).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao atualizar politica' });
  }
}

export async function deletePolitica(req, res) {
  try {
    const dados = await deletarPoliticaDoHotel({ hotelId: req.params.id });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao deletar politica:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erro?.message?.includes('nao possui politica') || erro?.message?.includes('n�o possui pol�tica')) {
      return res.status(404).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao deletar politica' });
  }
}

export async function listRefeicoes(req, res) {
  try {
    const dados = await listarRefeicoesDoHotel({ hotelId: req.params.id });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar refeicoes:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar refeicoes' });
  }
}

export async function createRefeicao(req, res) {
  try {
    const dados = await criarRefeicaoDoHotel({
      hotelId: req.params.id,
      nome: req.body.nome,
      horarioInicio: req.body.horario_inicio ?? null,
      horarioFim: req.body.horario_fim ?? null,
      habilitada: req.body.habilitada,
    });

    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao criar refeicao:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erro?.message?.includes('J� existe')) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar refeicao' });
  }
}

export async function updateRefeicao(req, res) {
  try {
    console.log('[updateRefeicao] hotelId=%s refeicaoId=%s body=%j', req.params.id, req.params.refeicaoId, req.body);

    const dados = await atualizarRefeicaoDoHotel({
      hotelId: req.params.id,
      refeicaoId: req.params.refeicaoId,
      nome: req.body.nome,
      horarioInicio: req.body.horario_inicio,
      horarioFim: req.body.horario_fim,
      habilitada: req.body.habilitada,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao atualizar refeicao:', erro?.message);
    if (naoEncontrado(erro) || erro?.message?.includes('Refei��o n�o encontrada')) {
      return res.status(404).json({ erro: erro.message });
    }
    if (erroNenhumCampo(erro)) return res.status(400).json({ erro: erro.message });
    if (erro?.message?.includes('J� existe')) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar refeicao' });
  }
}

export async function deleteRefeicao(req, res) {
  try {
    console.log('[deleteRefeicao] hotelId=%s refeicaoId=%s', req.params.id, req.params.refeicaoId);

    const dados = await deletarRefeicaoDoHotel({
      hotelId: req.params.id,
      refeicaoId: req.params.refeicaoId,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao deletar refeicao:', erro?.message);
    if (naoEncontrado(erro) || erro?.message?.includes('Refei��o n�o encontrada')) {
      return res.status(404).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao deletar refeicao' });
  }
}

export async function markRefeicaoPresence(req, res) {
  try {
    const hospedeId = req.body.hospede_id ?? req.body.hospedeId;
    const reservaId = req.body.reserva_id ?? req.body.reservaId;

    if (!hospedeId) {
      return res.status(400).json({ erro: 'Campo obrigatorio: hospede_id' });
    }

    if (!reservaId) {
      return res.status(400).json({ erro: 'Campo obrigatorio: reserva_id' });
    }

    const presente = req.body.presente === undefined
      ? true
      : (
          req.body.presente === true ||
          req.body.presente === 'true' ||
          req.body.presente === 1 ||
          req.body.presente === '1'
        );

    const dados = await marcarPresencaHospedeNaRefeicao({
      hotelId: req.params.id,
      refeicaoId: req.params.refeicaoId,
      hospedeId,
      reservaId,
      presente,
      data: req.body.data ?? null,
    });

    return res.status(201).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao marcar presenca na refeicao:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (conflito(erro)) return res.status(409).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao marcar presenca na refeicao' });
  }
}

export async function getPoliciesTiming(req, res) {
  try {
    const dados = await obterPoliciesTimingDoHotel({ hotelId: req.params.id });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar policies timing:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar policies timing' });
  }
}

export async function savePoliciesTiming(req, res) {
  try {
    const dados = await salvarPoliciesTimingDoHotel({
      hotelId: req.params.id,
      politica: req.body.politica,
      refeicoes: req.body.refeicoes,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao salvar policies timing:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroNenhumCampo(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao salvar policies timing' });
  }
}

export async function getCardEncoderIntegration(req, res) {
  try {
    const dados = await obterIntegracaoCardEncoderDoHotel({ hotelId: req.params.id });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar integra��o card encoder:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar integra��o card encoder' });
  }
}

export async function saveCardEncoderIntegration(req, res) {
  try {
    const dados = await salvarIntegracaoCardEncoderDoHotel({
      hotelId: req.params.id,
      encoderHotelId: req.body.hotelId,
      waitMs: req.body.waitMs,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao salvar integra��o card encoder:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erro?.message?.includes('obrigat�rio') || erro?.message?.includes('maior que zero')) {
      return res.status(400).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao salvar integra��o card encoder' });
  }
}
