import {
  atualizarTransacaoLiquidezFinanceira,
  criarTransacaoLiquidezFinanceira,
  deletarTransacaoLiquidezFinanceira,
  listarTransacoesFinanceiras,
  obterArquivoTransacaoLiquidezFinanceira,
  obterFaturamentoExtrasFinanceiro,
  obterFaturamentoQuartosFinanceiro,
  obterGestaoLiquidezFinanceira,
  obterLucroLiquidoFinanceiro,
  obterOcupacaoMediaFinanceira,
  obterReceitaTotalFinanceira,
  obterRevparFinanceiro,
} from '../../services/financeiroService.js';

function naoEncontrado(erro) {
  return erro?.message?.toLowerCase().includes('não encontrad') || erro?.message?.toLowerCase().includes('nao encontrad');
}

function erroObrigatorio(erro) {
  return erro?.message?.includes('Campo obrigatório') || erro?.message?.includes('Campos obrigatórios');
}

function erroNenhumCampo(erro) {
  return erro?.message?.includes('Nenhum campo');
}

function erroData(erro) {
  return erro?.message?.toLowerCase().includes('data inválida') || erro?.message?.toLowerCase().includes('data inicial não pode');
}

function erroArquivo(erro) {
  return erro?.message?.toLowerCase().includes('arquivo inválido');
}

function erroArquivoNaoEncontrado(erro) {
  return erro?.message?.toLowerCase().includes('arquivo não encontrado') || erro?.message?.toLowerCase().includes('arquivo nao encontrado');
}

function obterArquivo(req) {
  if (req.file) return req.file;
  if (!req.files) return null;

  const colecoes = [req.files.arquivo, req.files.file, req.files.anexo].filter(Boolean);
  return colecoes.flat()[0] || null;
}

function obterFiltros(req) {
  return {
    dataInicio: req.query.dataInicio ?? req.query.data_inicio,
    dataFim: req.query.dataFim ?? req.query.data_fim,
    andarId: req.query.andarId ?? req.query.andar_id,
    limit: req.query.limit,
  };
}

export async function getTransacoesFinanceiras(req, res) {
  try {
    const dados = await listarTransacoesFinanceiras({
      hotelId: req.params.hotelId,
      limit: req.query.limit,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar transações financeiras:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar transações financeiras' });
  }
}

export async function getReceitaTotalFinanceira(req, res) {
  try {
    const filtros = obterFiltros(req);
    const dados = await obterReceitaTotalFinanceira({
      hotelId: req.params.hotelId,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter receita total financeira:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroData(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter receita total financeira' });
  }
}

export async function getRevparFinanceiro(req, res) {
  try {
    const filtros = obterFiltros(req);
    const dados = await obterRevparFinanceiro({
      hotelId: req.params.hotelId,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      andarId: filtros.andarId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter RevPAR:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroData(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter RevPAR' });
  }
}

export async function getOcupacaoMediaFinanceira(req, res) {
  try {
    const filtros = obterFiltros(req);
    const dados = await obterOcupacaoMediaFinanceira({
      hotelId: req.params.hotelId,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      andarId: filtros.andarId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter ocupação média:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroData(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter ocupação média' });
  }
}

export async function getLucroLiquidoFinanceiro(req, res) {
  try {
    const filtros = obterFiltros(req);
    const dados = await obterLucroLiquidoFinanceiro({
      hotelId: req.params.hotelId,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter lucro líquido:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroData(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter lucro líquido' });
  }
}

export async function getFaturamentoQuartosFinanceiro(req, res) {
  try {
    const filtros = obterFiltros(req);
    const dados = await obterFaturamentoQuartosFinanceiro({
      hotelId: req.params.hotelId,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      andarId: filtros.andarId,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter faturamento de quartos:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroData(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter faturamento de quartos' });
  }
}

export async function getGestaoLiquidezFinanceira(req, res) {
  try {
    const dados = await obterGestaoLiquidezFinanceira({
      hotelId: req.params.hotelId,
      limit: req.query.limit,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter gestão de liquidez:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter gestão de liquidez' });
  }
}

export async function postGestaoLiquidezFinanceira(req, res) {
  try {
    const arquivo = obterArquivo(req);
    const dados = await criarTransacaoLiquidezFinanceira({
      hotelId: req.params.hotelId,
      fornecedor: req.body.fornecedor ?? req.body.supplier,
      tipoDocumento: req.body.tipoDocumento ?? req.body.tipo_documento ?? req.body.documentType,
      documentoNumber: req.body.documentoNumber ?? req.body.document_number ?? req.body.documento,
      vencimento: req.body.vencimento ?? req.body.dueDate,
      categoria: req.body.categoria ?? req.body.category,
      notaInterna: req.body.notaInterna ?? req.body.nota_interna ?? req.body.internalNotes,
      valor: req.body.valor ?? req.body.amount,
      tipo: req.body.tipo ?? req.body.transactionType,
      status: req.body.status,
      arquivo,
    });
    return res.status(201).json({ sucesso: true, dados, mensagem: 'Transação de liquidez criada com sucesso' });
  } catch (erro) {
    console.error('Erro ao criar transação de liquidez:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroObrigatorio(erro) || erroData(erro) || erroArquivo(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar transação de liquidez' });
  }
}

export async function patchGestaoLiquidezFinanceira(req, res) {
  try {
    const arquivo = obterArquivo(req);
    const dados = await atualizarTransacaoLiquidezFinanceira({
      hotelId: req.params.hotelId,
      transacaoId: req.params.transacaoId,
      fornecedor: req.body.fornecedor ?? req.body.supplier,
      tipoDocumento: req.body.tipoDocumento ?? req.body.tipo_documento ?? req.body.documentType,
      documentoNumber: req.body.documentoNumber ?? req.body.document_number ?? req.body.documento,
      vencimento: req.body.vencimento ?? req.body.dueDate,
      categoria: req.body.categoria ?? req.body.category,
      notaInterna: req.body.notaInterna ?? req.body.nota_interna ?? req.body.internalNotes,
      valor: req.body.valor ?? req.body.amount,
      tipo: req.body.tipo ?? req.body.transactionType,
      status: req.body.status,
      arquivo: arquivo || (req.body.removerArquivo === 'true' || req.body.removerArquivo === true ? null : undefined),
    });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Transação de liquidez atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar transação de liquidez:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroNenhumCampo(erro) || erroData(erro) || erroArquivo(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar transação de liquidez' });
  }
}

export async function deleteGestaoLiquidezFinanceira(req, res) {
  try {
    const dados = await deletarTransacaoLiquidezFinanceira({
      hotelId: req.params.hotelId,
      transacaoId: req.params.transacaoId,
    });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Transação de liquidez removida com sucesso' });
  } catch (erro) {
    console.error('Erro ao remover transação de liquidez:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao remover transação de liquidez' });
  }
}

export async function getFaturamentoExtrasFinanceiro(req, res) {
  try {
    const filtros = obterFiltros(req);
    const dados = await obterFaturamentoExtrasFinanceiro({
      hotelId: req.params.hotelId,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
    });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter faturamento com extras:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    if (erroData(erro)) return res.status(400).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao obter faturamento com extras' });
  }
}

export async function getGestaoLiquidezArquivoFinanceira(req, res) {
  try {
    const arquivo = await obterArquivoTransacaoLiquidezFinanceira({
      hotelId: req.params.hotelId,
      transacaoId: req.params.transacaoId,
    });

    const nomeSeguro = String(arquivo.nome || 'arquivo.bin').replace(/[\r\n"]/g, '_');
    const nomeUtf8 = encodeURIComponent(nomeSeguro);

    res.setHeader('Content-Type', arquivo.tipo || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeSeguro}"; filename*=UTF-8''${nomeUtf8}`);
    return res.status(200).send(arquivo.conteudo);
  } catch (erro) {
    console.error('Erro ao baixar arquivo da transação de liquidez:', erro?.message);
    if (naoEncontrado(erro) || erroArquivoNaoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao baixar arquivo da transação de liquidez' });
  }
}