import { queryWithParams } from '../utils/database.js';

let estruturaTransacaoGarantida = false;

const STATUS_RESERVA_EXCLUIDA = "('cancelada', 'cancelado', 'no-show')";
const STATUS_RESERVA_ENCERRADA = "('check-out', 'finalizada', 'finalizado')";
const TIPOS_DESPESA = ['despesa', 'saida', 'custo'];
const TIPOS_RECEITA = ['receita', 'entrada'];
const ORIGEM_TIPO_CHECKOUT_PAGAMENTO = 'checkout_pagamento';

function toNumber(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function clamp(valor, minimo, maximo, fallback) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return fallback;
  return Math.min(Math.max(numero, minimo), maximo);
}

function normalizarData(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new Error('Data inválida');
  }
  return data;
}

function inicioDoDia(data) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function fimDoDia(data) {
  const copia = new Date(data);
  copia.setHours(23, 59, 59, 999);
  return copia;
}

function inicioDoMesAtual() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
}

function fimDoMesAtual() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
}

function diferencaEmDias(dataInicio, dataFim) {
  const utcInicio = Date.UTC(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
  const utcFim = Date.UTC(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate());
  return Math.max(Math.ceil((utcFim - utcInicio) / 86400000), 0);
}

function obterPeriodo({ dataInicio, dataFim, padraoMesAtual = false } = {}) {
  let inicio = normalizarData(dataInicio);
  let fim = normalizarData(dataFim);

  if (!inicio && !fim && padraoMesAtual) {
    inicio = inicioDoMesAtual();
    fim = fimDoMesAtual();
  }

  if (inicio && !fim) {
    fim = fimDoDia(inicio);
  }

  if (!inicio && fim) {
    inicio = inicioDoDia(fim);
  }

  if (inicio && fim && inicio > fim) {
    throw new Error('Data inicial não pode ser maior que a data final');
  }

  return {
    dataInicio: inicio ? inicioDoDia(inicio) : null,
    dataFim: fim ? fimDoDia(fim) : null,
  };
}

function montarFiltroPeriodo({ alias = 'r', campoInicio = 'data_checkin', campoFim = 'data_checkout', dataInicio, dataFim }) {
  const filtros = [];
  const params = {};

  if (dataInicio) {
    filtros.push(`${alias}.${campoFim} >= @dataInicio`);
    params.dataInicio = dataInicio;
  }

  if (dataFim) {
    filtros.push(`${alias}.${campoInicio} <= @dataFim`);
    params.dataFim = dataFim;
  }

  return { filtros, params };
}

function classificarCategoriaExtra(categoria) {
  const valor = String(categoria || '').toLowerCase();

  if (valor.includes('spa')) return 'SPA';
  if (valor.includes('a&b') || valor.includes('ab') || valor.includes('bar') || valor.includes('restaurante') || valor.includes('bebida') || valor.includes('alimento')) {
    return 'A&B';
  }

  return 'Outros Serviços';
}

function classificarTipoTransacao(tipo) {
  const valor = String(tipo || '').toLowerCase();
  if (TIPOS_DESPESA.includes(valor)) return 'despesa';
  if (TIPOS_RECEITA.includes(valor)) return 'receita';
  return valor || 'despesa';
}

function normalizarStatusTransacao(status) {
  return status || 'pendente';
}

async function garantirEstruturaTransacao() {
  if (estruturaTransacaoGarantida) return;

  await queryWithParams(`
    IF OBJECT_ID('transacao', 'U') IS NULL
    BEGIN
      CREATE TABLE transacao (
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        hotel_id UNIQUEIDENTIFIER NULL,
        data DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        tipo NVARCHAR(20) NOT NULL,
        fornecedor NVARCHAR(100) NULL,
        documento NVARCHAR(50) NULL,
        categoria NVARCHAR(50) NULL,
        descricao NVARCHAR(MAX) NULL,
        valor DECIMAL(10,2) NOT NULL,
        status NVARCHAR(30) NULL,
        origem_tipo NVARCHAR(50) NULL,
        origem_id UNIQUEIDENTIFIER NULL,
        reserva_id UNIQUEIDENTIFIER NULL,
        hospede_id UNIQUEIDENTIFIER NULL,
        quarto_id UNIQUEIDENTIFIER NULL,
        arquivo_nome NVARCHAR(255) NULL,
        arquivo_tipo NVARCHAR(100) NULL,
        arquivo_tamanho INT NULL,
        arquivo_conteudo VARBINARY(MAX) NULL,
        atualizado_em DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END
    ELSE
    BEGIN
      IF COL_LENGTH('transacao', 'status') IS NULL
        ALTER TABLE transacao ADD status NVARCHAR(30) NULL;

      IF COL_LENGTH('transacao', 'origem_tipo') IS NULL
        ALTER TABLE transacao ADD origem_tipo NVARCHAR(50) NULL;

      IF COL_LENGTH('transacao', 'origem_id') IS NULL
        ALTER TABLE transacao ADD origem_id UNIQUEIDENTIFIER NULL;

      IF COL_LENGTH('transacao', 'reserva_id') IS NULL
        ALTER TABLE transacao ADD reserva_id UNIQUEIDENTIFIER NULL;

      IF COL_LENGTH('transacao', 'hospede_id') IS NULL
        ALTER TABLE transacao ADD hospede_id UNIQUEIDENTIFIER NULL;

      IF COL_LENGTH('transacao', 'quarto_id') IS NULL
        ALTER TABLE transacao ADD quarto_id UNIQUEIDENTIFIER NULL;

      IF COL_LENGTH('transacao', 'arquivo_nome') IS NULL
        ALTER TABLE transacao ADD arquivo_nome NVARCHAR(255) NULL;

      IF COL_LENGTH('transacao', 'arquivo_tipo') IS NULL
        ALTER TABLE transacao ADD arquivo_tipo NVARCHAR(100) NULL;

      IF COL_LENGTH('transacao', 'arquivo_tamanho') IS NULL
        ALTER TABLE transacao ADD arquivo_tamanho INT NULL;

      IF COL_LENGTH('transacao', 'arquivo_conteudo') IS NULL
        ALTER TABLE transacao ADD arquivo_conteudo VARBINARY(MAX) NULL;

      IF COL_LENGTH('transacao', 'atualizado_em') IS NULL
        ALTER TABLE transacao ADD atualizado_em DATETIME2 NOT NULL CONSTRAINT DF_transacao_atualizado_em DEFAULT SYSUTCDATETIME();
    END
  `);

  estruturaTransacaoGarantida = true;
}

async function validarHotelExiste(hotelId) {
  const resultado = await queryWithParams(
    'SELECT TOP 1 id, nome FROM hotel WHERE id = @hotelId',
    { hotelId },
  );

  if (!resultado.recordset.length) {
    throw new Error('Hotel não encontrado');
  }

  return resultado.recordset[0];
}

async function obterTotaisTransacoesManuais({ hotelId, dataInicio = null, dataFim = null }) {
  await garantirEstruturaTransacao();

  const filtros = ['hotel_id = @hotelId', `(origem_tipo IS NULL OR origem_tipo <> '${ORIGEM_TIPO_CHECKOUT_PAGAMENTO}')`];
  const params = { hotelId };

  if (dataInicio) {
    filtros.push('data >= @dataInicio');
    params.dataInicio = dataInicio;
  }

  if (dataFim) {
    filtros.push('data <= @dataFim');
    params.dataFim = dataFim;
  }

  const resultado = await queryWithParams(
    `SELECT
        COALESCE(SUM(CASE WHEN LOWER(tipo) IN ('receita', 'entrada') THEN valor ELSE 0 END), 0) AS receitas_manuais,
        COALESCE(SUM(CASE WHEN LOWER(tipo) IN ('despesa', 'saida', 'custo') THEN valor ELSE 0 END), 0) AS despesas_manuais
     FROM transacao
     WHERE ${filtros.join(' AND ')}`,
    params,
  );

  return {
    receitasManuais: toNumber(resultado.recordset[0]?.receitas_manuais),
    despesasManuais: toNumber(resultado.recordset[0]?.despesas_manuais),
  };
}

async function obterResumoPagamentoCheckout({ reservaId }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        r.id AS reserva_id,
        r.codigo AS reserva_codigo,
        r.hospede_id,
        r.quarto_id,
        h.hotel_id,
        h.nome AS hospede_nome,
        q.numero AS quarto_numero,
        COALESCE(cat.nome, cat.descricao, 'Sem categoria') AS tipo_quarto,
        r.data_checkin,
        r.data_checkout,
        r.status,
        COALESCE(extra.total_extras, 0) AS valor_consumo_extra,
        CASE
          WHEN DATEDIFF(DAY, CONVERT(date, r.data_checkin), CONVERT(date, r.data_checkout)) > 0
          THEN DATEDIFF(DAY, CONVERT(date, r.data_checkin), CONVERT(date, r.data_checkout))
          ELSE 1
        END AS dias_reserva,
        COALESCE(
          cat.preco_diaria,
          CASE
            WHEN COL_LENGTH('reserva', 'valor') IS NOT NULL THEN
              CASE
                WHEN DATEDIFF(DAY, CONVERT(date, r.data_checkin), CONVERT(date, r.data_checkout)) > 0
                  AND COALESCE(r.valor, 0) >= COALESCE(extra.total_extras, 0)
                THEN (COALESCE(r.valor, 0) - COALESCE(extra.total_extras, 0)) /
                  DATEDIFF(DAY, CONVERT(date, r.data_checkin), CONVERT(date, r.data_checkout))
                ELSE COALESCE(r.valor, 0)
              END
            ELSE 0
          END
        ) AS valor_diaria
     FROM reserva r
     INNER JOIN hospede h ON h.id = r.hospede_id
     INNER JOIN quarto q ON q.id = r.quarto_id
     LEFT JOIN categoria_quarto cat ON cat.id = q.categoria_id
     LEFT JOIN (
       SELECT reserva_id, SUM(valor_total) AS total_extras
       FROM consumo_lancamento
       GROUP BY reserva_id
     ) extra ON extra.reserva_id = r.id
     WHERE r.id = @reservaId`,
    { reservaId },
  );

  if (!resultado.recordset.length) {
    throw new Error('Reserva não encontrada para registrar pagamento do checkout');
  }

  const item = resultado.recordset[0];
  const diasReserva = Math.max(Number(item.dias_reserva || 0), 1);
  const valorDiaria = toNumber(item.valor_diaria);
  const valorEstadia = Number((valorDiaria * diasReserva).toFixed(2));
  const valorConsumoExtra = Number(toNumber(item.valor_consumo_extra).toFixed(2));

  return {
    hotelId: item.hotel_id,
    reservaId: item.reserva_id,
    reservaCodigo: item.reserva_codigo,
    hospedeId: item.hospede_id,
    hospedeNome: item.hospede_nome,
    quartoId: item.quarto_id,
    quartoNumero: item.quarto_numero,
    tipoQuarto: item.tipo_quarto,
    diasReserva,
    valorDiaria,
    valorEstadia,
    valorConsumoExtra,
    valorTotal: Number((valorEstadia + valorConsumoExtra).toFixed(2)),
  };
}

async function removerLancamentosCheckout({ reservaId }) {
  await queryWithParams(
    `DELETE FROM transacao
     WHERE reserva_id = @reservaId
       AND origem_tipo = @origemTipo`,
    {
      reservaId,
      origemTipo: ORIGEM_TIPO_CHECKOUT_PAGAMENTO,
    },
  );
}

async function inserirLancamentoCheckout({
  hotelId,
  reservaId,
  hospedeId,
  quartoId,
  dataPagamento,
  categoria,
  descricao,
  documento,
  valor,
}) {
  if (!valor || valor <= 0) {
    return null;
  }

  const resultado = await queryWithParams(
    `INSERT INTO transacao (
       hotel_id,
       data,
       tipo,
       fornecedor,
       documento,
       categoria,
       descricao,
       valor,
       status,
       origem_tipo,
       origem_id,
       reserva_id,
       hospede_id,
       quarto_id,
       atualizado_em
     )
     OUTPUT INSERTED.id
     VALUES (
       @hotelId,
       @dataPagamento,
       'receita',
       NULL,
       @documento,
       @categoria,
       @descricao,
       @valor,
       'liquidado',
       @origemTipo,
       @reservaId,
       @reservaId,
       @hospedeId,
       @quartoId,
       SYSUTCDATETIME()
     )`,
    {
      hotelId,
      dataPagamento,
      documento,
      categoria,
      descricao,
      valor,
      origemTipo: ORIGEM_TIPO_CHECKOUT_PAGAMENTO,
      reservaId,
      hospedeId,
      quartoId,
    },
  );

  return resultado.recordset[0] || null;
}

async function obterReceitaHospedagemEExtras({ hotelId, dataInicio = null, dataFim = null, andarId = null }) {
  const filtros = [`LOWER(r.status) NOT IN ${STATUS_RESERVA_EXCLUIDA}`];
  const params = { hotelId, dataInicio, dataFim };

  const periodo = montarFiltroPeriodo({ dataInicio, dataFim });
  filtros.push('h.hotel_id = @hotelId');
  filtros.push(...periodo.filtros);
  Object.assign(params, periodo.params);

  if (andarId) {
    filtros.push('a.id = @andarId');
    params.andarId = andarId;
  }

  const resultado = await queryWithParams(
    `SELECT
        COALESCE(SUM(
          COALESCE(
            cat.preco_diaria,
            CASE
              WHEN COL_LENGTH('reserva', 'valor') IS NOT NULL
              THEN CASE
                WHEN COALESCE(r.valor, 0) >= COALESCE(extra.total_extras, 0)
                THEN COALESCE(r.valor, 0) - COALESCE(extra.total_extras, 0)
                ELSE COALESCE(r.valor, 0)
              END
              ELSE 0
            END
          ) *
          CASE
            WHEN DATEDIFF(DAY,
              CASE WHEN r.data_checkin > @inicioCalculo THEN r.data_checkin ELSE @inicioCalculo END,
              DATEADD(DAY, 1, CASE WHEN r.data_checkout < @fimCalculo THEN r.data_checkout ELSE @fimCalculo END)
            ) > 0
            THEN DATEDIFF(DAY,
              CASE WHEN r.data_checkin > @inicioCalculo THEN r.data_checkin ELSE @inicioCalculo END,
              DATEADD(DAY, 1, CASE WHEN r.data_checkout < @fimCalculo THEN r.data_checkout ELSE @fimCalculo END)
            )
            ELSE 0
          END
        ), 0) AS receita_hospedagem,
        COALESCE(SUM(COALESCE(extra_periodo.total_extras_periodo, 0)), 0) AS receita_extras
     FROM reserva r
     INNER JOIN hospede h ON h.id = r.hospede_id
     INNER JOIN quarto q ON q.id = r.quarto_id
     INNER JOIN andar a ON a.id = q.andar_id
     LEFT JOIN categoria_quarto cat ON cat.id = q.categoria_id
     LEFT JOIN (
       SELECT reserva_id, SUM(valor_total) AS total_extras
       FROM consumo_lancamento
       GROUP BY reserva_id
     ) extra ON extra.reserva_id = r.id
     LEFT JOIN (
       SELECT reserva_id, SUM(valor_total) AS total_extras_periodo
       FROM consumo_lancamento
       WHERE (@dataInicio IS NULL OR created_at >= @dataInicio)
         AND (@dataFim IS NULL OR created_at <= @dataFim)
       GROUP BY reserva_id
     ) extra_periodo ON extra_periodo.reserva_id = r.id
     WHERE ${filtros.join(' AND ')}`,
    {
      ...params,
      inicioCalculo: dataInicio || new Date('1900-01-01T00:00:00.000Z'),
      fimCalculo: dataFim || new Date('2999-12-31T23:59:59.999Z'),
    },
  );

  return {
    receitaHospedagem: toNumber(resultado.recordset[0]?.receita_hospedagem),
    receitaExtras: toNumber(resultado.recordset[0]?.receita_extras),
  };
}

async function obterTotaisOperacionais({ hotelId, dataInicio = null, dataFim = null, andarId = null }) {
  const [receitasOperacionais, totaisManuais] = await Promise.all([
    obterReceitaHospedagemEExtras({ hotelId, dataInicio, dataFim, andarId }),
    obterTotaisTransacoesManuais({ hotelId, dataInicio, dataFim }),
  ]);

  const receitaTotal = receitasOperacionais.receitaHospedagem + receitasOperacionais.receitaExtras + totaisManuais.receitasManuais;
  const lucroLiquido = receitaTotal - totaisManuais.despesasManuais;

  return {
    ...receitasOperacionais,
    ...totaisManuais,
    receitaTotal,
    lucroLiquido,
  };
}

async function obterTotalQuartos({ hotelId, andarId = null }) {
  const filtros = ['a.hotel_id = @hotelId'];
  const params = { hotelId };

  if (andarId) {
    filtros.push('a.id = @andarId');
    params.andarId = andarId;
  }

  const resultado = await queryWithParams(
    `SELECT COUNT(*) AS total_quartos
     FROM quarto q
     INNER JOIN andar a ON a.id = q.andar_id
     WHERE ${filtros.join(' AND ')}`,
    params,
  );

  return Number(resultado.recordset[0]?.total_quartos || 0);
}

async function listarDetalhamentoEstadias({ hotelId, dataInicio, dataFim, andarId = null }) {
  const filtros = [`LOWER(r.status) NOT IN ${STATUS_RESERVA_EXCLUIDA}`, 'h.hotel_id = @hotelId'];
  const params = {
    hotelId,
    dataInicio,
    dataFim,
    inicioCalculo: dataInicio,
    fimCalculo: dataFim,
  };

  const periodo = montarFiltroPeriodo({ dataInicio, dataFim });
  filtros.push(...periodo.filtros);

  if (andarId) {
    filtros.push('a.id = @andarId');
    params.andarId = andarId;
  }

  const resultado = await queryWithParams(
    `SELECT
        r.id,
        r.codigo,
        r.data_checkin,
        r.data_checkout,
        r.status,
        h.nome AS hospede,
        q.numero AS quarto,
        COALESCE(cat.nome, cat.descricao, 'Sem categoria') AS tipo,
        COALESCE(cat.preco_diaria,
          CASE
            WHEN COL_LENGTH('reserva', 'valor') IS NOT NULL THEN
              CASE
                WHEN DATEDIFF(DAY, CONVERT(date, r.data_checkin), CONVERT(date, r.data_checkout)) > 0
                  AND COALESCE(r.valor, 0) >= COALESCE(extra.total_extras, 0)
                THEN (COALESCE(r.valor, 0) - COALESCE(extra.total_extras, 0)) /
                  DATEDIFF(DAY, CONVERT(date, r.data_checkin), CONVERT(date, r.data_checkout))
                ELSE COALESCE(r.valor, 0)
              END
            ELSE 0
          END
        ) AS valor_diaria,
        COALESCE(extra_periodo.total_extras_periodo, 0) AS valor_consumo_extra,
        CASE
          WHEN DATEDIFF(DAY,
            CASE WHEN r.data_checkin > @inicioCalculo THEN r.data_checkin ELSE @inicioCalculo END,
            DATEADD(DAY, 1, CASE WHEN r.data_checkout < @fimCalculo THEN r.data_checkout ELSE @fimCalculo END)
          ) > 0
          THEN DATEDIFF(DAY,
            CASE WHEN r.data_checkin > @inicioCalculo THEN r.data_checkin ELSE @inicioCalculo END,
            DATEADD(DAY, 1, CASE WHEN r.data_checkout < @fimCalculo THEN r.data_checkout ELSE @fimCalculo END)
          )
          ELSE 0
        END AS noites_no_periodo
     FROM reserva r
     INNER JOIN hospede h ON h.id = r.hospede_id
     INNER JOIN quarto q ON q.id = r.quarto_id
     INNER JOIN andar a ON a.id = q.andar_id
     LEFT JOIN categoria_quarto cat ON cat.id = q.categoria_id
     LEFT JOIN (
       SELECT reserva_id, SUM(valor_total) AS total_extras
       FROM consumo_lancamento
       GROUP BY reserva_id
     ) extra ON extra.reserva_id = r.id
     LEFT JOIN (
       SELECT reserva_id, SUM(valor_total) AS total_extras_periodo
       FROM consumo_lancamento
       WHERE created_at >= @dataInicio AND created_at <= @dataFim
       GROUP BY reserva_id
     ) extra_periodo ON extra_periodo.reserva_id = r.id
     WHERE ${filtros.join(' AND ')}
     ORDER BY r.data_checkin DESC, r.id DESC`,
    params,
  );

  return resultado.recordset.map((item) => {
    const valorDiaria = toNumber(item.valor_diaria);
    const valorConsumoExtra = toNumber(item.valor_consumo_extra);
    const noitesNoPeriodo = Math.max(Number(item.noites_no_periodo || 0), 0);

    return {
      id: item.id,
      codigo: item.codigo,
      data: item.data_checkin,
      dataCheckout: item.data_checkout,
      status: item.status,
      quarto: item.quarto,
      tipo: item.tipo,
      hospede: item.hospede,
      valorDiaria,
      valorConsumoExtra,
      noitesNoPeriodo,
      total: Number((valorDiaria * noitesNoPeriodo + valorConsumoExtra).toFixed(2)),
    };
  });
}

async function obterMetricasFaturamentoQuartos({ hotelId, dataInicio = null, dataFim = null, andarId = null }) {
  const periodo = obterPeriodo({ dataInicio, dataFim, padraoMesAtual: true });
  const totalQuartos = await obterTotalQuartos({ hotelId, andarId });
  const detalhamentoPorEstadia = await listarDetalhamentoEstadias({
    hotelId,
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
    andarId,
  });

  const receitaTotalDiaria = detalhamentoPorEstadia.reduce((acc, item) => acc + item.valorDiaria * item.noitesNoPeriodo, 0);
  const noitesOcupadas = detalhamentoPorEstadia.reduce((acc, item) => acc + item.noitesNoPeriodo, 0);
  const diasPeriodoBase = periodo.dataInicio && periodo.dataFim
    ? Math.max(diferencaEmDias(periodo.dataInicio, periodo.dataFim) + 1, 1)
    : 1;
  const quartosDisponiveisPeriodo = totalQuartos * diasPeriodoBase;
  const ocupacaoMedia = quartosDisponiveisPeriodo > 0 ? (noitesOcupadas / quartosDisponiveisPeriodo) * 100 : 0;
  const revpar = quartosDisponiveisPeriodo > 0 ? receitaTotalDiaria / quartosDisponiveisPeriodo : 0;
  const adr = noitesOcupadas > 0 ? receitaTotalDiaria / noitesOcupadas : 0;

  return {
    periodo,
    totalQuartos,
    diasPeriodo: diasPeriodoBase,
    receitaTotalDiaria: Number(receitaTotalDiaria.toFixed(2)),
    revpar: Number(revpar.toFixed(2)),
    ocupacaoMedia: Number(ocupacaoMedia.toFixed(2)),
    adr: Number(adr.toFixed(2)),
    detalhamentoPorEstadia,
  };
}

export async function listarTransacoesFinanceiras({ hotelId, limit = 50 }) {
  await validarHotelExiste(hotelId);
  const limite = clamp(limit, 1, 200, 50);
  await garantirEstruturaTransacao();

  const resultado = await queryWithParams(
    `WITH extras_reserva AS (
       SELECT reserva_id, SUM(valor_total) AS total_extras
       FROM consumo_lancamento
       GROUP BY reserva_id
     ),
     checkout_financeiro AS (
       SELECT reserva_id, categoria
       FROM transacao
       WHERE hotel_id = @hotelId
         AND origem_tipo = @origemTipoCheckout
     )
     SELECT TOP (@limit)
        t.id,
        t.data,
        t.descricao,
        t.origem,
        t.tipo,
        t.categoria,
        t.status,
        t.valor,
        t.reserva_id,
        t.hospede_id,
        t.quarto_id,
        t.fornecedor,
        t.documento,
        t.arquivo_nome,
        t.arquivo_tipo,
        t.arquivo_tamanho
     FROM (
       SELECT
         tr.id,
          tr.data,
          COALESCE(tr.descricao, tr.fornecedor, 'Lançamento financeiro') AS descricao,
          CASE
            WHEN tr.reserva_id IS NOT NULL
            THEN CONCAT(COALESCE(h.nome, 'Hospede sem nome'), ' / Quarto ', COALESCE(q.numero, '-'))
            ELSE COALESCE(tr.fornecedor, tr.categoria, 'Liquidez')
          END AS origem,
          UPPER(COALESCE(tr.tipo, 'receita')) AS tipo,
          UPPER(COALESCE(tr.categoria, 'GERAL')) AS categoria,
          COALESCE(tr.status, 'pendente') AS status,
          CAST(tr.valor AS DECIMAL(18,2)) AS valor,
          tr.reserva_id,
          tr.hospede_id,
         tr.quarto_id,
         tr.fornecedor,
         tr.documento,
         tr.arquivo_nome,
         tr.arquivo_tipo,
         tr.arquivo_tamanho
       FROM transacao tr
       LEFT JOIN hospede h ON h.id = tr.hospede_id
       LEFT JOIN quarto q ON q.id = tr.quarto_id
       WHERE tr.hotel_id = @hotelId

       UNION ALL

       SELECT
         NULL AS id,
          r.data_checkout AS data,
          CONCAT('Hospedagem ', COALESCE(r.codigo, 'sem-codigo')) AS descricao,
          CONCAT(COALESCE(h.nome, 'Hospede sem nome'), ' / Quarto ', COALESCE(q.numero, '-')) AS origem,
          'HOSPEDAGEM' AS tipo,
          'HOSPEDAGEM' AS categoria,
          r.status AS status,
          CAST(
            COALESCE(
              cat.preco_diaria,
              CASE
                WHEN COL_LENGTH('reserva', 'valor') IS NOT NULL
                THEN CASE
                  WHEN COALESCE(r.valor, 0) >= COALESCE(er.total_extras, 0)
                  THEN COALESCE(r.valor, 0) - COALESCE(er.total_extras, 0)
                  ELSE COALESCE(r.valor, 0)
                END
                ELSE 0
              END
            ) *
            CASE
              WHEN DATEDIFF(DAY, CONVERT(date, r.data_checkin), CONVERT(date, r.data_checkout)) > 0
              THEN DATEDIFF(DAY, CONVERT(date, r.data_checkin), CONVERT(date, r.data_checkout))
              ELSE 1
            END
          AS DECIMAL(18,2)) AS valor,
          r.id AS reserva_id,
          r.hospede_id,
             r.quarto_id,
             NULL AS fornecedor,
             NULL AS documento,
             NULL AS arquivo_nome,
             NULL AS arquivo_tipo,
             NULL AS arquivo_tamanho
       FROM reserva r
       INNER JOIN hospede h ON h.id = r.hospede_id
       INNER JOIN quarto q ON q.id = r.quarto_id
       LEFT JOIN categoria_quarto cat ON cat.id = q.categoria_id
       LEFT JOIN extras_reserva er ON er.reserva_id = r.id
       WHERE h.hotel_id = @hotelId
         AND LOWER(r.status) IN ${STATUS_RESERVA_ENCERRADA}
         AND NOT EXISTS (
           SELECT 1
           FROM checkout_financeiro cf
           WHERE cf.reserva_id = r.id
             AND UPPER(COALESCE(cf.categoria, '')) = 'HOSPEDAGEM'
         )

       UNION ALL

       SELECT
       NULL AS id,
          cl.created_at AS data,
          COALESCE(p.nome, 'Consumo extra') AS descricao,
          COALESCE(h.nome, 'Hospede sem nome') AS origem,
          UPPER(COALESCE(p.categoria, 'EXTRAS')) AS tipo,
          'CONSUMO_EXTRA' AS categoria,
          'confirmado' AS status,
          CAST(cl.valor_total AS DECIMAL(18,2)) AS valor,
          cl.reserva_id,
          cl.hospede_id,
       r.quarto_id,
       NULL AS fornecedor,
       NULL AS documento,
       NULL AS arquivo_nome,
       NULL AS arquivo_tipo,
       NULL AS arquivo_tamanho
       FROM consumo_lancamento cl
       INNER JOIN hospede h ON h.id = cl.hospede_id
       LEFT JOIN produto p ON p.id = cl.produto_id
       LEFT JOIN reserva r ON r.id = cl.reserva_id
       WHERE cl.hotel_id = @hotelId
         AND (
           cl.reserva_id IS NULL
           OR NOT EXISTS (
             SELECT 1
             FROM checkout_financeiro cf
             WHERE cf.reserva_id = cl.reserva_id
               AND UPPER(COALESCE(cf.categoria, '')) = 'CONSUMO_EXTRA'
           )
         )
     ) t
     ORDER BY t.data DESC`,
    {
      hotelId,
      limit: limite,
      origemTipoCheckout: ORIGEM_TIPO_CHECKOUT_PAGAMENTO,
    },
  );

  return resultado.recordset.map((item) => ({
    id: item.id,
    data: item.data,
    descricao: item.descricao,
    notaInterna: item.descricao,
    origem: item.origem,
    tipo: item.tipo,
    categoria: item.categoria,
    status: item.status,
    valor: toNumber(item.valor),
    reservaId: item.reserva_id,
    hospedeId: item.hospede_id,
    quartoId: item.quarto_id,
    fornecedor: item.fornecedor,
    documento: item.documento,
    arquivo: item.arquivo_nome
      ? {
          nome: item.arquivo_nome,
          tipo: item.arquivo_tipo,
          tamanho: item.arquivo_tamanho,
        }
      : null,
  }));
}

export async function obterReceitaTotalFinanceira({ hotelId, dataInicio = null, dataFim = null }) {
  await validarHotelExiste(hotelId);
  const periodo = obterPeriodo({ dataInicio, dataFim });
  const totais = await obterTotaisOperacionais({ hotelId, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim });

  return {
    periodo,
    receitaTotal: Number(totais.receitaTotal.toFixed(2)),
    receitaHospedagem: Number(totais.receitaHospedagem.toFixed(2)),
    receitaExtras: Number(totais.receitaExtras.toFixed(2)),
    receitasManuais: Number(totais.receitasManuais.toFixed(2)),
  };
}

export async function obterRevparFinanceiro({ hotelId, dataInicio = null, dataFim = null, andarId = null }) {
  await validarHotelExiste(hotelId);
  const metricas = await obterMetricasFaturamentoQuartos({ hotelId, dataInicio, dataFim, andarId });

  return {
    periodo: metricas.periodo,
    totalQuartos: metricas.totalQuartos,
    diasPeriodo: metricas.diasPeriodo,
    revpar: metricas.revpar,
  };
}

export async function obterOcupacaoMediaFinanceira({ hotelId, dataInicio = null, dataFim = null, andarId = null }) {
  await validarHotelExiste(hotelId);
  const metricas = await obterMetricasFaturamentoQuartos({ hotelId, dataInicio, dataFim, andarId });

  return {
    periodo: metricas.periodo,
    totalQuartos: metricas.totalQuartos,
    diasPeriodo: metricas.diasPeriodo,
    ocupacaoMedia: metricas.ocupacaoMedia,
  };
}

export async function obterLucroLiquidoFinanceiro({ hotelId, dataInicio = null, dataFim = null }) {
  await validarHotelExiste(hotelId);
  const periodo = obterPeriodo({ dataInicio, dataFim });
  const totais = await obterTotaisOperacionais({ hotelId, dataInicio: periodo.dataInicio, dataFim: periodo.dataFim });

  return {
    periodo,
    lucroLiquido: Number(totais.lucroLiquido.toFixed(2)),
    receitaTotal: Number(totais.receitaTotal.toFixed(2)),
    despesasManuais: Number(totais.despesasManuais.toFixed(2)),
  };
}

export async function obterFaturamentoQuartosFinanceiro({ hotelId, dataInicio = null, dataFim = null, andarId = null }) {
  await validarHotelExiste(hotelId);
  return obterMetricasFaturamentoQuartos({ hotelId, dataInicio, dataFim, andarId });
}

export async function registrarPagamentoCheckoutFinanceiro({ reservaId, dataPagamento = new Date() }) {
  await garantirEstruturaTransacao();

  const resumo = await obterResumoPagamentoCheckout({ reservaId });
  await removerLancamentosCheckout({ reservaId });

  const documentoBase = `CHK:${resumo.reservaId}`;
  const lancamentos = [];

  const lancamentoHospedagem = await inserirLancamentoCheckout({
    hotelId: resumo.hotelId,
    reservaId: resumo.reservaId,
    hospedeId: resumo.hospedeId,
    quartoId: resumo.quartoId,
    dataPagamento,
    categoria: 'HOSPEDAGEM',
    descricao: `Pagamento checkout - hospedagem - ${resumo.hospedeNome} - quarto ${resumo.quartoNumero}`,
    documento: `${documentoBase}:H`,
    valor: resumo.valorEstadia,
  });

  if (lancamentoHospedagem) {
    lancamentos.push({
      id: lancamentoHospedagem.id,
      categoria: 'HOSPEDAGEM',
      valor: resumo.valorEstadia,
    });
  }

  const lancamentoConsumoExtra = await inserirLancamentoCheckout({
    hotelId: resumo.hotelId,
    reservaId: resumo.reservaId,
    hospedeId: resumo.hospedeId,
    quartoId: resumo.quartoId,
    dataPagamento,
    categoria: 'CONSUMO_EXTRA',
    descricao: `Pagamento checkout - consumo extra - ${resumo.hospedeNome} - quarto ${resumo.quartoNumero}`,
    documento: `${documentoBase}:E`,
    valor: resumo.valorConsumoExtra,
  });

  if (lancamentoConsumoExtra) {
    lancamentos.push({
      id: lancamentoConsumoExtra.id,
      categoria: 'CONSUMO_EXTRA',
      valor: resumo.valorConsumoExtra,
    });
  }

  return {
    reservaId: resumo.reservaId,
    hotelId: resumo.hotelId,
    hospedeId: resumo.hospedeId,
    quartoId: resumo.quartoId,
    hospede: resumo.hospedeNome,
    quarto: resumo.quartoNumero,
    tipoQuarto: resumo.tipoQuarto,
    diasReserva: resumo.diasReserva,
    valorDiaria: resumo.valorDiaria,
    valorEstadia: resumo.valorEstadia,
    valorConsumoExtra: resumo.valorConsumoExtra,
    valorTotal: resumo.valorTotal,
    dataPagamento,
    lancamentos,
  };
}

export async function obterGestaoLiquidezFinanceira({ hotelId, limit = 20 }) {
  await validarHotelExiste(hotelId);
  await garantirEstruturaTransacao();

  const [totaisGerais, totais30Dias, totais30DiasAnteriores, transacoesRecentes] = await Promise.all([
    obterTotaisOperacionais({ hotelId }),
    obterTotaisOperacionais({ hotelId, dataInicio: new Date(Date.now() - 30 * 86400000), dataFim: new Date() }),
    obterTotaisOperacionais({ hotelId, dataInicio: new Date(Date.now() - 60 * 86400000), dataFim: new Date(Date.now() - 30 * 86400000) }),
    listarTransacoesFinanceiras({ hotelId, limit }),
  ]);

  const saldoAtualConsolidado = totaisGerais.lucroLiquido;
  const saldoUltimos30Dias = totais30Dias.lucroLiquido;
  const saldo30DiasAnteriores = totais30DiasAnteriores.lucroLiquido;
  const variacaoPercentual = saldo30DiasAnteriores !== 0
    ? ((saldoUltimos30Dias - saldo30DiasAnteriores) / Math.abs(saldo30DiasAnteriores)) * 100
    : (saldoUltimos30Dias > 0 ? 100 : 0);

  return {
    saldoAtualConsolidado: Number(saldoAtualConsolidado.toFixed(2)),
    projecaoDeCresimentoEstimado: Number((saldoAtualConsolidado + saldoUltimos30Dias).toFixed(2)),
    variacaoUltimos30DiasPercentual: Number(variacaoPercentual.toFixed(2)),
    transacoesRecentes,
  };
}

export async function criarTransacaoLiquidezFinanceira({
  hotelId,
  fornecedor,
  tipoDocumento,
  documentoNumber,
  vencimento,
  categoria,
  notaInterna,
  valor,
  tipo = 'despesa',
  status = 'pendente',
  arquivo = null,
}) {
  await validarHotelExiste(hotelId);
  await garantirEstruturaTransacao();

  if (!fornecedor || !tipoDocumento || !documentoNumber || !vencimento || !categoria) {
    throw new Error('Campos obrigatórios: fornecedor, tipoDocumento, documentoNumber, vencimento, categoria');
  }

  const valorNormalizado = toNumber(valor);
  if (!valorNormalizado) {
    throw new Error('Campo obrigatório: valor');
  }

  const dataLancamento = normalizarData(vencimento);
  const tipoNormalizado = classificarTipoTransacao(tipo);

  if (arquivo && !['application/pdf', 'image/jpeg', 'image/jpg'].includes(String(arquivo.mimetype || '').toLowerCase())) {
    throw new Error('Arquivo inválido. Envie PDF ou JPG');
  }

  const resultado = await queryWithParams(
    `INSERT INTO transacao (
       hotel_id,
       data,
       tipo,
       fornecedor,
       documento,
       categoria,
       descricao,
       valor,
       status,
       arquivo_nome,
       arquivo_tipo,
       arquivo_tamanho,
       arquivo_conteudo,
       atualizado_em
     )
     OUTPUT
       INSERTED.id,
       INSERTED.hotel_id,
       INSERTED.data,
       INSERTED.tipo,
       INSERTED.fornecedor,
       INSERTED.documento,
       INSERTED.categoria,
       INSERTED.descricao,
       INSERTED.valor,
       INSERTED.status,
       INSERTED.arquivo_nome,
       INSERTED.arquivo_tipo,
       INSERTED.arquivo_tamanho
     VALUES (
       @hotelId,
       @dataLancamento,
       @tipo,
       @fornecedor,
       @documento,
       @categoria,
       @descricao,
       @valor,
       @status,
       @arquivoNome,
       @arquivoTipo,
       @arquivoTamanho,
       CONVERT(VARBINARY(MAX), @arquivoConteudo),
       SYSUTCDATETIME()
     )`,
    {
      hotelId,
      dataLancamento,
      tipo: tipoNormalizado,
      fornecedor,
      documento: `${tipoDocumento}: ${documentoNumber}`,
      categoria,
      descricao: notaInterna || null,
      valor: valorNormalizado,
      status: normalizarStatusTransacao(status),
      arquivoNome: arquivo?.originalname || null,
      arquivoTipo: arquivo?.mimetype || null,
      arquivoTamanho: arquivo?.size || null,
      arquivoConteudo: arquivo?.buffer || null,
    },
  );

  const item = resultado.recordset[0];
  return {
    id: item.id,
    hotelId: item.hotel_id,
    fornecedor: item.fornecedor,
    tipoDocumento,
    documentoNumber,
    vencimento: item.data,
    categoria: item.categoria,
    notaInterna: item.descricao,
    valor: toNumber(item.valor),
    tipo: item.tipo,
    status: item.status,
    arquivo: item.arquivo_nome ? {
      nome: item.arquivo_nome,
      tipo: item.arquivo_tipo,
      tamanho: item.arquivo_tamanho,
    } : null,
  };
}

async function obterTransacaoPorId({ hotelId, transacaoId }) {
  await garantirEstruturaTransacao();

  const resultado = await queryWithParams(
    `SELECT TOP 1
        id,
        hotel_id,
        data,
        tipo,
        fornecedor,
        documento,
        categoria,
        descricao,
        valor,
        status,
        arquivo_nome,
        arquivo_tipo,
        arquivo_tamanho
     FROM transacao
     WHERE id = @transacaoId
       AND hotel_id = @hotelId`,
    { hotelId, transacaoId },
  );

  if (!resultado.recordset.length) {
    throw new Error('Transação não encontrada');
  }

  return resultado.recordset[0];
}

export async function atualizarTransacaoLiquidezFinanceira({
  hotelId,
  transacaoId,
  fornecedor,
  tipoDocumento,
  documentoNumber,
  vencimento,
  categoria,
  notaInterna,
  valor,
  tipo,
  status,
  arquivo = undefined,
}) {
  await validarHotelExiste(hotelId);
  await obterTransacaoPorId({ hotelId, transacaoId });

  const campos = [];
  const params = { hotelId, transacaoId };

  if (fornecedor !== undefined) {
    campos.push('fornecedor = @fornecedor');
    params.fornecedor = fornecedor;
  }

  if (tipoDocumento !== undefined || documentoNumber !== undefined) {
    const documentoNormalizado = `${tipoDocumento || 'Documento'}: ${documentoNumber || ''}`.trim();
    campos.push('documento = @documento');
    params.documento = documentoNormalizado;
  }

  if (vencimento !== undefined) {
    campos.push('data = @dataLancamento');
    params.dataLancamento = normalizarData(vencimento);
  }

  if (categoria !== undefined) {
    campos.push('categoria = @categoria');
    params.categoria = categoria;
  }

  if (notaInterna !== undefined) {
    campos.push('descricao = @descricao');
    params.descricao = notaInterna;
  }

  if (valor !== undefined) {
    campos.push('valor = @valor');
    params.valor = toNumber(valor);
  }

  if (tipo !== undefined) {
    campos.push('tipo = @tipo');
    params.tipo = classificarTipoTransacao(tipo);
  }

  if (status !== undefined) {
    campos.push('status = @status');
    params.status = normalizarStatusTransacao(status);
  }

  if (arquivo !== undefined) {
    if (arquivo && !['application/pdf', 'image/jpeg', 'image/jpg'].includes(String(arquivo.mimetype || '').toLowerCase())) {
      throw new Error('Arquivo inválido. Envie PDF ou JPG');
    }

    campos.push('arquivo_nome = @arquivoNome');
    campos.push('arquivo_tipo = @arquivoTipo');
    campos.push('arquivo_tamanho = @arquivoTamanho');
    campos.push('arquivo_conteudo = CONVERT(VARBINARY(MAX), @arquivoConteudo)');
    params.arquivoNome = arquivo?.originalname || null;
    params.arquivoTipo = arquivo?.mimetype || null;
    params.arquivoTamanho = arquivo?.size || null;
    params.arquivoConteudo = arquivo?.buffer || null;
  }

  if (!campos.length) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE transacao
     SET ${campos.join(', ')}, atualizado_em = SYSUTCDATETIME()
     OUTPUT
       INSERTED.id,
       INSERTED.hotel_id,
       INSERTED.data,
       INSERTED.tipo,
       INSERTED.fornecedor,
       INSERTED.documento,
       INSERTED.categoria,
       INSERTED.descricao,
       INSERTED.valor,
       INSERTED.status,
       INSERTED.arquivo_nome,
       INSERTED.arquivo_tipo,
       INSERTED.arquivo_tamanho
     WHERE id = @transacaoId
       AND hotel_id = @hotelId`,
    params,
  );

  const item = resultado.recordset[0];
  const documento = String(item.documento || '');
  const separador = documento.indexOf(':');

  return {
    id: item.id,
    hotelId: item.hotel_id,
    fornecedor: item.fornecedor,
    tipoDocumento: separador >= 0 ? documento.slice(0, separador).trim() : null,
    documentoNumber: separador >= 0 ? documento.slice(separador + 1).trim() : documento || null,
    vencimento: item.data,
    categoria: item.categoria,
    notaInterna: item.descricao,
    valor: toNumber(item.valor),
    tipo: item.tipo,
    status: item.status,
    arquivo: item.arquivo_nome ? {
      nome: item.arquivo_nome,
      tipo: item.arquivo_tipo,
      tamanho: item.arquivo_tamanho,
    } : null,
  };
}

export async function deletarTransacaoLiquidezFinanceira({ hotelId, transacaoId }) {
  await validarHotelExiste(hotelId);
  await obterTransacaoPorId({ hotelId, transacaoId });

  await queryWithParams(
    'DELETE FROM transacao WHERE id = @transacaoId AND hotel_id = @hotelId',
    { hotelId, transacaoId },
  );

  return { id: transacaoId };
}

export async function obterArquivoTransacaoLiquidezFinanceira({ hotelId, transacaoId }) {
  await validarHotelExiste(hotelId);
  await garantirEstruturaTransacao();

  const resultado = await queryWithParams(
    `SELECT TOP 1
        id,
        arquivo_nome,
        arquivo_tipo,
        arquivo_conteudo
     FROM transacao
     WHERE id = @transacaoId
       AND hotel_id = @hotelId`,
    { hotelId, transacaoId },
  );

  if (!resultado.recordset.length) {
    throw new Error('Transação não encontrada');
  }

  const item = resultado.recordset[0];

  if (!item.arquivo_conteudo) {
    throw new Error('Arquivo não encontrado para esta transação');
  }

  return {
    nome: item.arquivo_nome || `transacao-${transacaoId}.bin`,
    tipo: item.arquivo_tipo || 'application/octet-stream',
    conteudo: item.arquivo_conteudo,
  };
}

export async function obterFaturamentoExtrasFinanceiro({ hotelId, dataInicio = null, dataFim = null }) {
  await validarHotelExiste(hotelId);

  const periodo = obterPeriodo({ dataInicio, dataFim });
  const filtros = ['cl.hotel_id = @hotelId'];
  const params = { hotelId };

  if (periodo.dataInicio) {
    filtros.push('cl.created_at >= @dataInicio');
    params.dataInicio = periodo.dataInicio;
  }

  if (periodo.dataFim) {
    filtros.push('cl.created_at <= @dataFim');
    params.dataFim = periodo.dataFim;
  }

  const resultado = await queryWithParams(
    `SELECT
        cl.id,
        cl.created_at,
        cl.valor_total,
        p.nome AS produto_nome,
        p.categoria AS produto_categoria,
        h.nome AS hospede_nome,
        r.status AS reserva_status
     FROM consumo_lancamento cl
     INNER JOIN hospede h ON h.id = cl.hospede_id
     LEFT JOIN produto p ON p.id = cl.produto_id
     LEFT JOIN reserva r ON r.id = cl.reserva_id
     WHERE ${filtros.join(' AND ')}
     ORDER BY cl.created_at DESC, cl.id DESC`,
    params,
  );

  let receitaAB = 0;
  let receitaSPA = 0;
  let outrosServicos = 0;

  const lancamentos = resultado.recordset.map((item) => {
    const valor = toNumber(item.valor_total);
    const categoria = classificarCategoriaExtra(item.produto_categoria);

    if (categoria === 'A&B') receitaAB += valor;
    else if (categoria === 'SPA') receitaSPA += valor;
    else outrosServicos += valor;

    return {
      data: item.created_at,
      descricao: item.produto_nome || 'Consumo extra',
      tipo: categoria,
      status: item.reserva_status || 'confirmado',
      valor,
      hospede: item.hospede_nome,
    };
  });

  return {
    periodo,
    receitaAB: Number(receitaAB.toFixed(2)),
    receitaSPA: Number(receitaSPA.toFixed(2)),
    outrosServicos: Number(outrosServicos.toFixed(2)),
    lancamentos,
  };
}
