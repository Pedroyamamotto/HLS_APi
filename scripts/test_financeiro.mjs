import axios from 'axios';
import { randomUUID } from 'crypto';
import { queryWithParams } from '../src/utils/database.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PREFIXO = `TESTE-FIN-${Date.now()}`;
const USAR_SERVIDOR_EMBUTIDO = process.env.TEST_FINANCEIRO_SERVIDOR_EMBUTIDO === 'true';

let baseUrlRuntime = BASE_URL;
let httpServerRuntime = null;

function log(etapa, mensagem, extra = null) {
  console.log(`[${etapa}] ${mensagem}`);
  if (extra !== null) {
    console.log(JSON.stringify(extra, null, 2));
  }
}

function assert(condicao, mensagem, detalhes = null) {
  if (!condicao) {
    const erro = new Error(mensagem);
    erro.detalhes = detalhes;
    throw erro;
  }
}

async function ensureConsumoLancamento() {
  await queryWithParams(`
    IF OBJECT_ID('consumo_lancamento', 'U') IS NULL
    BEGIN
      CREATE TABLE consumo_lancamento (
        id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        hotel_id UNIQUEIDENTIFIER NOT NULL,
        hospede_id UNIQUEIDENTIFIER NOT NULL,
        reserva_id UNIQUEIDENTIFIER NULL,
        produto_id UNIQUEIDENTIFIER NOT NULL,
        quantidade INT NOT NULL,
        valor_unitario DECIMAL(18, 2) NOT NULL,
        valor_total DECIMAL(18, 2) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END
  `);
}

async function prepararFixture() {
  const hotelRes = await queryWithParams('SELECT TOP 1 id, nome FROM hotel ORDER BY id');
  assert(hotelRes.recordset.length > 0, 'Nenhum hotel encontrado para montar o teste financeiro');

  const hotel = hotelRes.recordset[0];
  const identificador = randomUUID().slice(0, 8).toUpperCase();
  const agora = new Date();
  const checkin = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 3, 14, 0, 0);
  const checkout = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0);
  const numeroAndar = Math.floor(Math.random() * 8000) + 1000;
  const numeroQuarto = `9${Math.floor(Math.random() * 800 + 100)}`;
  const diaria = 120;
  const quantidadeConsumos = 3;
  const valorUnitarioExtra = 15;
  const valorExtra = quantidadeConsumos * valorUnitarioExtra;
  const valorEstadia = diaria * 3;
  const valorReserva = valorEstadia + valorExtra;

  await ensureConsumoLancamento();

  const andar = await queryWithParams(
    `INSERT INTO andar (hotel_id, numero, nome)
     OUTPUT INSERTED.id, INSERTED.numero
     VALUES (@hotelId, @numero, @nome)`,
    {
      hotelId: hotel.id,
      numero: numeroAndar,
      nome: `${PREFIXO}-ANDAR-${identificador}`,
    },
  );

  const categoria = await queryWithParams(
    `INSERT INTO categoria_quarto (hotel_id, nome, descricao, capacidade, preco_diaria)
     OUTPUT INSERTED.id, INSERTED.nome, INSERTED.preco_diaria
     VALUES (@hotelId, @nome, @descricao, @capacidade, @precoDiaria)`,
    {
      hotelId: hotel.id,
      nome: `${PREFIXO}-CAT-${identificador}`,
      descricao: 'Categoria de teste financeiro',
      capacidade: 2,
      precoDiaria: diaria,
    },
  );

  const quarto = await queryWithParams(
    `INSERT INTO quarto (andar_id, categoria_id, numero, descricao, capacidade, quantidade_camas, status)
     OUTPUT INSERTED.id, INSERTED.numero
     VALUES (@andarId, @categoriaId, @numero, @descricao, @capacidade, @quantidadeCamas, @status)`,
    {
      andarId: andar.recordset[0].id,
      categoriaId: categoria.recordset[0].id,
      numero: numeroQuarto,
      descricao: 'Quarto automatizado de teste financeiro',
      capacidade: 2,
      quantidadeCamas: 1,
      status: 'ocupado',
    },
  );

  const hospede = await queryWithParams(
    `INSERT INTO hospede (hotel_id, nome, email, telefone, cpf, passaporte, nacionalidade, endereco, data_nascimento)
     OUTPUT INSERTED.id, INSERTED.nome
     VALUES (@hotelId, @nome, @email, @telefone, @cpf, @passaporte, @nacionalidade, @endereco, @dataNascimento)`,
    {
      hotelId: hotel.id,
      nome: `${PREFIXO}-HOSPEDE-${identificador}`,
      email: `${PREFIXO.toLowerCase()}-${identificador.toLowerCase()}@example.com`,
      telefone: '5511999999999',
      cpf: `CPF-${identificador}`,
      passaporte: null,
      nacionalidade: 'Brasileiro',
      endereco: 'Endereco de teste',
      dataNascimento: new Date('1990-01-01T00:00:00.000Z'),
    },
  );

  const reservaCodigo = `${PREFIXO}-${identificador}`;
  const reserva = await queryWithParams(
    `INSERT INTO reserva (hospede_id, quarto_id, data_checkin, data_checkout, qtd_adultos, qtd_criancas, valor, codigo, status, canal)
     OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.status
     VALUES (@hospedeId, @quartoId, @dataCheckin, @dataCheckout, @qtdAdultos, @qtdCriancas, @valor, @codigo, @status, @canal)`,
    {
      hospedeId: hospede.recordset[0].id,
      quartoId: quarto.recordset[0].id,
      dataCheckin: checkin,
      dataCheckout: checkout,
      qtdAdultos: 2,
      qtdCriancas: 0,
      valor: valorReserva,
      codigo: reservaCodigo,
      status: 'check-in',
      canal: 'teste_automatizado',
    },
  );

  const produto = await queryWithParams(
    `INSERT INTO produto (nome, categoria, preco_custo, preco_venda)
     OUTPUT INSERTED.id, INSERTED.nome
     VALUES (@nome, @categoria, @precoCusto, @precoVenda)`,
    {
      nome: `${PREFIXO}-PROD-${identificador}`,
      categoria: 'A&B',
      precoCusto: 8,
      precoVenda: valorUnitarioExtra,
    },
  );

  await queryWithParams(
    `INSERT INTO consumo_lancamento (hotel_id, hospede_id, reserva_id, produto_id, quantidade, valor_unitario, valor_total, created_at)
     VALUES (@hotelId, @hospedeId, @reservaId, @produtoId, @quantidade, @valorUnitario, @valorTotal, @createdAt)`,
    {
      hotelId: hotel.id,
      hospedeId: hospede.recordset[0].id,
      reservaId: reserva.recordset[0].id,
      produtoId: produto.recordset[0].id,
      quantidade: quantidadeConsumos,
      valorUnitario: valorUnitarioExtra,
      valorTotal: valorExtra,
      createdAt: new Date(),
    },
  );

  return {
    hotelId: hotel.id,
    hotelNome: hotel.nome,
    andarId: andar.recordset[0].id,
    categoriaId: categoria.recordset[0].id,
    quartoId: quarto.recordset[0].id,
    quartoNumero: quarto.recordset[0].numero,
    hospedeId: hospede.recordset[0].id,
    hospedeNome: hospede.recordset[0].nome,
    reservaId: reserva.recordset[0].id,
    reservaCodigo,
    produtoId: produto.recordset[0].id,
    diaria,
    diasReserva: 3,
    valorEstadia,
    valorExtra,
    valorTotal: valorReserva,
  };
}

async function patchReservaFinalizada(reservaId) {
  const resposta = await axios.patch(
    `${BASE_URL}/reservas/${reservaId}/status`,
    { status: 'finalizado' },
    { timeout: 60000 },
  );
  return resposta.data;
}

async function getJson(url) {
  const resposta = await axios.get(url, { timeout: 60000 });
  return resposta.data;
}

async function iniciarServidorEmbutido() {
  if (!USAR_SERVIDOR_EMBUTIDO) return;

  process.env.PORT = '0';
  const servidor = await import('../src/server/server.js');
  await servidor.startServer(0);
  httpServerRuntime = servidor.httpServer;

  const endereco = httpServerRuntime.address();
  const porta = typeof endereco === 'object' && endereco ? endereco.port : 3000;
  baseUrlRuntime = `http://localhost:${porta}`;
  log('SERVER', `Servidor embutido iniciado em ${baseUrlRuntime}`);
}

async function encerrarServidorEmbutido() {
  if (!httpServerRuntime) return;

  await new Promise((resolve) => {
    httpServerRuntime.close(() => resolve());
  });

  log('SERVER', 'Servidor embutido encerrado');
}

async function postMultipart(url, campos) {
  const form = new FormData();
  Object.entries(campos).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null) {
      form.append(chave, String(valor));
    }
  });

  const resposta = await fetch(url, {
    method: 'POST',
    body: form,
  });

  const json = await resposta.json();
  if (!resposta.ok) {
    throw new Error(`POST ${url} falhou: ${resposta.status} ${JSON.stringify(json)}`);
  }

  return json;
}

async function patchMultipart(url, campos) {
  const form = new FormData();
  Object.entries(campos).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null) {
      form.append(chave, String(valor));
    }
  });

  const resposta = await fetch(url, {
    method: 'PATCH',
    body: form,
  });

  const json = await resposta.json();
  if (!resposta.ok) {
    throw new Error(`PATCH ${url} falhou: ${resposta.status} ${JSON.stringify(json)}`);
  }

  return json;
}

async function deleteEndpoint(url) {
  const resposta = await fetch(url, { method: 'DELETE' });
  const json = await resposta.json();
  if (!resposta.ok) {
    throw new Error(`DELETE ${url} falhou: ${resposta.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function limparFixture(fixture, transacaoLiquidezId = null) {
  if (!fixture) return;

  const prefixLike = `${PREFIXO}%`;

  try {
    if (transacaoLiquidezId) {
      await queryWithParams('DELETE FROM transacao WHERE id = @id', { id: transacaoLiquidezId });
    }

    await queryWithParams(
      `DELETE FROM transacao
       WHERE reserva_id = @reservaId
          OR documento LIKE @prefixo
          OR descricao LIKE @prefixo`,
      {
        reservaId: fixture.reservaId,
        prefixo: `${PREFIXO}%`,
      },
    );

    await queryWithParams('DELETE FROM consumo_lancamento WHERE reserva_id = @reservaId', { reservaId: fixture.reservaId });
    await queryWithParams("IF OBJECT_ID('reserva_evento_log', 'U') IS NOT NULL DELETE FROM reserva_evento_log WHERE reserva_id = @reservaId", { reservaId: fixture.reservaId });
    await queryWithParams('DELETE FROM reserva WHERE id = @id', { id: fixture.reservaId });
    await queryWithParams('DELETE FROM produto WHERE id = @id', { id: fixture.produtoId });
    await queryWithParams('DELETE FROM hospede WHERE id = @id', { id: fixture.hospedeId });
    await queryWithParams('DELETE FROM quarto WHERE id = @id', { id: fixture.quartoId });
    await queryWithParams('DELETE FROM categoria_quarto WHERE id = @id', { id: fixture.categoriaId });
    await queryWithParams('DELETE FROM andar WHERE id = @id', { id: fixture.andarId });
    await queryWithParams('DELETE FROM transacao WHERE fornecedor LIKE @prefixo OR descricao LIKE @prefixo OR documento LIKE @prefixo', { prefixo: prefixLike });
  } catch (erro) {
    console.warn('Aviso ao limpar fixture financeira:', erro.message);
  }
}

async function executar() {
  let fixture = null;
  let transacaoLiquidezId = null;

  try {
    await iniciarServidorEmbutido();

    log('SETUP', 'Preparando fixture financeira no banco');
    fixture = await prepararFixture();
    log('SETUP', 'Fixture criada', fixture);

    log('CHECKOUT', 'Finalizando a reserva via endpoint de status');
    const statusReserva = await axios.patch(
      `${baseUrlRuntime}/reservas/${fixture.reservaId}/status`,
      { status: 'finalizado' },
      { timeout: 60000 },
    ).then((r) => r.data);
    const pagamento = statusReserva?.dados?.pagamento_financeiro;
    if (pagamento) {
      assert(pagamento.valorEstadia === fixture.valorEstadia, 'valorEstadia divergente', { esperado: fixture.valorEstadia, recebido: pagamento.valorEstadia });
      assert(pagamento.valorConsumoExtra === fixture.valorExtra, 'valorConsumoExtra divergente', { esperado: fixture.valorExtra, recebido: pagamento.valorConsumoExtra });
      assert(pagamento.valorTotal === fixture.valorTotal, 'valorTotal divergente', { esperado: fixture.valorTotal, recebido: pagamento.valorTotal });
    } else {
      log('CHECKOUT', 'Aviso: pagamento_financeiro não retornou no payload de /reservas/{id}/status; validação seguirá pelas rotas financeiras');
    }

    log('TRANSACOES', 'Consultando transações financeiras');
    const transacoes = await getJson(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/transacoes?limit=20`);
    const transacoesReserva = (transacoes?.dados || []).filter((item) => item.reservaId === fixture.reservaId);
    assert(transacoesReserva.some((item) => item.categoria === 'HOSPEDAGEM' && item.valor === fixture.valorEstadia), 'Lançamento de hospedagem não encontrado nas transações', transacoesReserva);
    assert(transacoesReserva.some((item) => item.categoria === 'CONSUMO_EXTRA' && item.valor === fixture.valorExtra), 'Lançamento de consumo extra não encontrado nas transações', transacoesReserva);

    log('RECEITA', 'Consultando receita total');
    const receitaTotal = await getJson(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/receitatotal`);
    assert(typeof receitaTotal?.dados?.receitaTotal === 'number', 'receitaTotal deve ser numérica', receitaTotal);

    log('METRICAS', 'Consultando RevPAR, ocupação e lucro líquido');
    const [revpar, ocupacao, lucro] = await Promise.all([
      getJson(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/revpar`),
      getJson(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/ocupacaomedia`),
      getJson(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/lucroliquido`),
    ]);
    assert(typeof revpar?.dados?.revpar === 'number', 'RevPAR inválido', revpar);
    assert(typeof ocupacao?.dados?.ocupacaoMedia === 'number', 'ocupacaoMedia inválida', ocupacao);
    assert(typeof lucro?.dados?.lucroLiquido === 'number', 'lucroLiquido inválido', lucro);

    log('QUARTOS', 'Consultando faturamento de quartos');
    const faturamentoQuartos = await getJson(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/faturamento-quartos`);
    const detalheReserva = (faturamentoQuartos?.dados?.detalhamentoPorEstadia || []).find((item) => item.id === fixture.reservaId);
    assert(!!detalheReserva, 'Detalhamento por estadia não encontrou a reserva do teste', faturamentoQuartos);
    assert(detalheReserva.valorConsumoExtra === fixture.valorExtra, 'Detalhamento com valor de consumo extra divergente', detalheReserva);
    const totalEsperadoDetalhe = Number((detalheReserva.valorDiaria * detalheReserva.noitesNoPeriodo + detalheReserva.valorConsumoExtra).toFixed(2));
    assert(detalheReserva.total === totalEsperadoDetalhe, 'Detalhamento total divergente da fórmula interna', detalheReserva);

    log('EXTRAS', 'Consultando faturamento com extras');
    const faturamentoExtras = await getJson(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/faturamento-extras`);
    assert(faturamentoExtras?.dados?.receitaAB >= fixture.valorExtra, 'Receita A&B deveria refletir o consumo extra do teste', faturamentoExtras);
    assert((faturamentoExtras?.dados?.lancamentos || []).some((item) => item.hospede === fixture.hospedeNome && item.valor === fixture.valorExtra), 'Lançamento de extra não encontrado', faturamentoExtras);

    log('LIQUIDEZ', 'Criando transação manual de liquidez');
    const transacaoCriada = await postMultipart(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/gestao-liquidez`, {
      fornecedor: `${PREFIXO}-FORNECEDOR`,
      tipoDocumento: 'Invoice',
      documentoNumber: `${PREFIXO}-NF-001`,
      vencimento: new Date().toISOString(),
      categoria: 'marketing',
      notaInterna: `${PREFIXO} - lançamento automático de teste`,
      valor: 150,
      tipo: 'despesa',
      status: 'pendente',
    });
    transacaoLiquidezId = transacaoCriada?.dados?.id;
    assert(!!transacaoLiquidezId, 'Não foi possível criar transação de liquidez', transacaoCriada);

    log('LIQUIDEZ', 'Atualizando transação manual de liquidez');
    const transacaoAtualizada = await patchMultipart(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/gestao-liquidez/${transacaoLiquidezId}`, {
      categoria: 'eventos',
      status: 'liquidado',
      valor: 175,
    });
    assert(transacaoAtualizada?.dados?.categoria === 'eventos', 'Categoria da transação não foi atualizada', transacaoAtualizada);
    assert(transacaoAtualizada?.dados?.status === 'liquidado', 'Status da transação não foi atualizado', transacaoAtualizada);
    assert(transacaoAtualizada?.dados?.valor === 175, 'Valor da transação não foi atualizado', transacaoAtualizada);

    log('LIQUIDEZ', 'Consultando painel de gestão de liquidez');
    const gestaoLiquidez = await getJson(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/gestao-liquidez?limit=10`);
    assert(Array.isArray(gestaoLiquidez?.dados?.transacoesRecentes), 'gestao-liquidez deve retornar transacoesRecentes', gestaoLiquidez);
    assert(gestaoLiquidez.dados.transacoesRecentes.some((item) => item.descricao?.includes(PREFIXO) || item.origem?.includes(PREFIXO)), 'Transação manual de liquidez não apareceu na listagem recente', gestaoLiquidez);

    log('LIQUIDEZ', 'Removendo transação manual de liquidez');
    const transacaoRemovida = await deleteEndpoint(`${baseUrlRuntime}/hotel/${fixture.hotelId}/financeiro/gestao-liquidez/${transacaoLiquidezId}`);
    assert(transacaoRemovida?.dados?.id === transacaoLiquidezId, 'DELETE da liquidez não retornou o id esperado', transacaoRemovida);
    transacaoLiquidezId = null;

    log('SUCESSO', 'Todos os testes financeiros passaram');
    console.log(JSON.stringify({
      sucesso: true,
      hotelId: fixture.hotelId,
      reservaId: fixture.reservaId,
      hospede: fixture.hospedeNome,
      valorEstadia: fixture.valorEstadia,
      valorExtra: fixture.valorExtra,
      valorTotal: fixture.valorTotal,
    }, null, 2));
  } catch (erro) {
    console.error('Falha no teste financeiro automatizado:', erro.message);
    if (erro.detalhes) {
      console.error(JSON.stringify(erro.detalhes, null, 2));
    }
    process.exitCode = 1;
  } finally {
    await limparFixture(fixture, transacaoLiquidezId);
    await encerrarServidorEmbutido();
  }
}

executar();