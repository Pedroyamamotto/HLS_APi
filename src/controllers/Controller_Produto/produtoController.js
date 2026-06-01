import {
  criarProduto,
  deletarProduto,
  listarProdutos,
  obterProdutoPorId,
  atualizarProduto,
} from '../../services/produtoService.js';

function naoEncontrado(erro) {
  return (
    erro?.message?.toLowerCase().includes('não encontrad') ||
    erro?.message?.toLowerCase().includes('nao encontrad')
  );
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

function extrairFotoUrl(req) {
  const bodyCandidates = [
    req.body?.foto_url,
    req.body?.fotoUrl,
    req.body?.FotoUrl,
    req.body?.image_url,
    req.body?.imageUrl,
    req.body?.imagem,
    req.body?.image,
    req.body?.foto,
  ];

  for (const value of bodyCandidates) {
    if (typeof value === 'string' && value.trim()) {
      const valor = value.trim();

      if (valor.startsWith('data:image/')) {
        return valor;
      }

      if (valor.startsWith('/uploads/') || valor.includes('/uploads/')) {
        return undefined;
      }

      return valor;
    }
  }

  const file =
    req.file ||
    req.files?.foto?.[0] ||
    req.files?.imagem?.[0] ||
    req.files?.arquivo?.[0] ||
    req.files?.imagemProduto?.[0] ||
    req.files?.fotoProduto?.[0] ||
    req.files?.image?.[0];

  if (!file) return undefined;

  if (file.buffer) {
    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/png';

    return `data:${mimeType};base64,${base64}`;
  }

  return undefined;
}

function normalizarProdutoSaida(produto) {
  if (!produto) return produto;

  return {
    ...produto,
    foto_url:
      typeof produto.foto_url === 'string' &&
      produto.foto_url.startsWith('/uploads/')
        ? null
        : produto.foto_url,
  };
}

function normalizarListaProdutosSaida(produtos) {
  if (!Array.isArray(produtos)) return produtos;

  return produtos.map(normalizarProdutoSaida);
}

export async function listProdutos(req, res) {
  try {
    const dados = await listarProdutos({
      categoria: req.query.categoria,
    });

    return res.status(200).json({
      sucesso: true,
      dados: normalizarListaProdutosSaida(dados),
    });
  } catch (erro) {
    console.error('Erro ao listar produtos:', erro?.message);

    return res.status(500).json({
      erro: 'Erro ao listar produtos',
    });
  }
}

export async function getProduto(req, res) {
  try {
    const dados = await obterProdutoPorId({
      produtoId: req.params.produtoId,
    });

    return res.status(200).json({
      sucesso: true,
      dados: normalizarProdutoSaida(dados),
    });
  } catch (erro) {
    console.error('Erro ao buscar produto:', erro?.message);

    if (naoEncontrado(erro)) {
      return res.status(404).json({
        erro: erro.message,
      });
    }

    return res.status(500).json({
      erro: 'Erro ao buscar produto',
    });
  }
}

export async function createProduto(req, res) {
  try {
    const dados = await criarProduto({
      nome:
        req.body.nome ??
        req.body.Nome ??
        req.body.productName ??
        req.body.product_name,

      categoria:
        req.body.categoria ??
        req.body.Categoria ??
        req.body.category ??
        req.body.productCategory ??
        req.body.product_category,

      precoCusto:
        req.body.preco_custo ??
        req.body.precoCusto ??
        req.body.costPrice ??
        req.body.cost_price,

      precoVenda:
        req.body.preco_venda ??
        req.body.precoVenda ??
        req.body.salePrice ??
        req.body.sale_price,

      fotoUrl: extrairFotoUrl(req),
    });

    return res.status(201).json({
      sucesso: true,
      dados: normalizarProdutoSaida(dados),
    });
  } catch (erro) {
    console.error('Erro ao criar produto:', erro?.message);

    if (erroObrigatorio(erro)) {
      return res.status(400).json({
        erro: erro.message,
      });
    }

    if (erroDuplicado(erro)) {
      return res.status(409).json({
        erro: erro.message,
      });
    }

    return res.status(500).json({
      erro: 'Erro ao criar produto',
    });
  }
}

export async function updateProduto(req, res) {
  try {
    const fotoUrlExtraida = extrairFotoUrl(req);

    const dados = await atualizarProduto({
      produtoId: req.params.produtoId,

      nome:
        req.body.nome ??
        req.body.Nome ??
        req.body.productName ??
        req.body.product_name,

      categoria:
        req.body.categoria ??
        req.body.Categoria ??
        req.body.category ??
        req.body.productCategory ??
        req.body.product_category,

      precoCusto:
        req.body.preco_custo ??
        req.body.precoCusto ??
        req.body.costPrice ??
        req.body.cost_price,

      precoVenda:
        req.body.preco_venda ??
        req.body.precoVenda ??
        req.body.salePrice ??
        req.body.sale_price,

      fotoUrl: fotoUrlExtraida,
    });

    return res.status(200).json({
      sucesso: true,
      dados: normalizarProdutoSaida(dados),
    });
  } catch (erro) {
    console.error('Erro ao atualizar produto:', erro?.message);

    if (naoEncontrado(erro)) {
      return res.status(404).json({
        erro: erro.message,
      });
    }

    if (erroNenhumCampo(erro) || erroObrigatorio(erro)) {
      return res.status(400).json({
        erro: erro.message,
      });
    }

    if (erroDuplicado(erro)) {
      return res.status(409).json({
        erro: erro.message,
      });
    }

    return res.status(500).json({
      erro: 'Erro ao atualizar produto',
    });
  }
}

export async function removeProduto(req, res) {
  try {
    const dados = await deletarProduto({
      produtoId: req.params.produtoId,
    });

    return res.status(200).json({
      sucesso: true,
      dados,
      mensagem: 'Produto deletado com sucesso',
    });
  } catch (erro) {
    console.error('Erro ao deletar produto:', erro?.message);

    if (naoEncontrado(erro)) {
      return res.status(404).json({
        erro: erro.message,
      });
    }

    return res.status(500).json({
      erro: 'Erro ao deletar produto',
    });
  }
}