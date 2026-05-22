import {
  ensureHistoricoTable,
  registrarHistorico,
  listarHistoricoQuarto,
  listarHistoricoHotel,
  resumoUltimosEventos,
  ultimosEventosPorQuarto,
  obterTemplateChecklist,
  salvarTemplateChecklist,
  resetarTemplateChecklist,
  adicionarSecaoChecklist,
  adicionarItemSecao,
} from '../../services/governancaService.js';

// Garante que a tabela exista ao importar o controller
ensureHistoricoTable().catch((err) =>
  console.error('[governanca] Erro ao garantir tabela historico_governanca:', err?.message)
);

function naoEncontrado(erro) {
  const m = String(erro?.message ?? '').toLowerCase();
  return m.includes('não encontrad') || m.includes('nao encontrad');
}

function erroValidacao(erro) {
  const m = String(erro?.message ?? '').toLowerCase();
  return m.includes('inválido') || m.includes('invalido') || m.includes('obrigatório');
}

/**
 * POST /hotel/:hotelId/quartos/:quartoId/historico-governanca
 * Body: { tipo, checklist, observacoes?, usuario_id? }
 */
export async function criarHistorico(req, res) {
  try {
    const { hotelId, quartoId } = req.params;
    const { tipo, checklist, observacoes, usuario_id } = req.body;

    if (!tipo) {
      return res.status(400).json({ erro: 'Campo obrigatório: tipo (limpeza | manutencao).' });
    }

    const registro = await registrarHistorico({
      hotelId,
      quartoId,
      tipo,
      usuarioId: usuario_id ?? null,
      checklistJson: checklist ?? null,
      observacoes: observacoes ?? null,
    });

    return res.status(201).json({ sucesso: true, dados: registro });
  } catch (erro) {
    console.error('[governanca] Erro ao registrar histórico:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroValidacao(erro))  return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao registrar histórico de governança.' });
  }
}

/**
 * GET /hotel/:hotelId/quartos/:quartoId/historico-governanca
 * Query: limit (opcional, padrão 50)
 */
export async function getHistoricoQuarto(req, res) {
  try {
    const { hotelId, quartoId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const dados = await listarHistoricoQuarto({ hotelId, quartoId, limit });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('[governanca] Erro ao listar histórico do quarto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar histórico do quarto.' });
  }
}

/**
 * GET /hotel/:hotelId/quartos/:quartoId/historico-governanca/ultimos
 * Retorna as últimas ocorrências de limpeza e manutenção do quarto com checklist.
 */
export async function getUltimosEventosQuarto(req, res) {
  try {
    const { hotelId, quartoId } = req.params;
    const dados = await ultimosEventosPorQuarto({ hotelId, quartoId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('[governanca] Erro ao listar últimos eventos do quarto:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar últimos eventos do quarto.' });
  }
}

/**
 * GET /hotel/:hotelId/historico-governanca
 * Query: tipo (limpeza|manutencao, opcional), limit (opcional, padrão 100)
 */
export async function getHistoricoHotel(req, res) {
  try {
    const { hotelId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const tipo  = req.query.tipo ?? null;

    const dados = await listarHistoricoHotel({ hotelId, tipo, limit });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('[governanca] Erro ao listar histórico do hotel:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao buscar histórico do hotel.' });
  }
}

/**
 * GET /hotel/:hotelId/historico-governanca/resumo
 * Retorna última limpeza e manutenção de cada quarto.
 */
export async function getResumoEventos(req, res) {
  try {
    const { hotelId } = req.params;
    const dados = await resumoUltimosEventos({ hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('[governanca] Erro ao buscar resumo de eventos:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao buscar resumo de eventos.' });
  }
}

/**
 * GET /hotel/:hotelId/checklist-config?tipo=limpeza|manutencao
 */
export async function getChecklistConfig(req, res) {
  try {
    const { hotelId } = req.params;
    const { tipo } = req.query;

    if (!tipo) {
      return res.status(400).json({ erro: 'Campo obrigatório: tipo (limpeza | manutencao).' });
    }

    const dados = await obterTemplateChecklist({ hotelId, tipo });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('[governanca] Erro ao buscar checklist config:', erro?.message);
    if (erroValidacao(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar configuração de checklist.' });
  }
}

/**
 * PUT /hotel/:hotelId/checklist-config
 * Body: { tipo, secoes } ou { tipo, sections }
 */
export async function putChecklistConfig(req, res) {
  try {
    const { hotelId } = req.params;
    const { tipo, secoes, sections } = req.body ?? {};

    if (!tipo) {
      return res.status(400).json({ erro: 'Campo obrigatório: tipo (limpeza | manutencao).' });
    }

    const dados = await salvarTemplateChecklist({
      hotelId,
      tipo,
      secoes: secoes ?? sections ?? [],
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('[governanca] Erro ao salvar checklist config:', erro?.message);
    if (erroValidacao(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao salvar configuração de checklist.' });
  }
}

/**
 * DELETE /hotel/:hotelId/checklist-config?tipo=limpeza|manutencao
 */
export async function deleteChecklistConfig(req, res) {
  try {
    const { hotelId } = req.params;
    const { tipo } = req.query;

    if (!tipo) {
      return res.status(400).json({ erro: 'Campo obrigatório: tipo (limpeza | manutencao).' });
    }

    const dados = await resetarTemplateChecklist({ hotelId, tipo });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('[governanca] Erro ao resetar checklist config:', erro?.message);
    if (erroValidacao(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao resetar configuração de checklist.' });
  }
}

/**
 * POST /hotel/:hotelId/checklist-config/secoes
 * Body: { tipo, titulo }
 */
export async function postChecklistSecao(req, res) {
  try {
    const { hotelId } = req.params;
    const { tipo, titulo } = req.body ?? {};

    if (!tipo) {
      return res.status(400).json({ erro: 'Campo obrigatório: tipo (limpeza | manutencao).' });
    }

    if (!titulo) {
      return res.status(400).json({ erro: 'Campo obrigatório: titulo.' });
    }

    const secao = await adicionarSecaoChecklist({ hotelId, tipo, titulo });
    return res.status(201).json({ sucesso: true, dados: secao });
  } catch (erro) {
    console.error('[governanca] Erro ao criar seção de checklist:', erro?.message);
    if (erroValidacao(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar seção de checklist.' });
  }
}

/**
 * POST /hotel/:hotelId/checklist-config/secoes/:secaoId/itens
 * Body: { tipo, texto }
 */
export async function postChecklistItem(req, res) {
  try {
    const { hotelId, secaoId } = req.params;
    const { tipo, texto } = req.body ?? {};

    if (!tipo) {
      return res.status(400).json({ erro: 'Campo obrigatório: tipo (limpeza | manutencao).' });
    }

    if (!texto) {
      return res.status(400).json({ erro: 'Campo obrigatório: texto.' });
    }

    const item = await adicionarItemSecao({ hotelId, tipo, secaoId, texto });
    return res.status(201).json({ sucesso: true, dados: item });
  } catch (erro) {
    console.error('[governanca] Erro ao criar item de checklist:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroValidacao(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar item de checklist.' });
  }
}
