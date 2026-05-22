import { query, queryWithParams } from '../utils/database.js';
import { registrarLogReserva, TIPOS_LOG_RESERVA } from './reservaLogsService.js';

const DEFAULT_CHECKLIST_TEMPLATES = {
  limpeza: [
    {
      id: 'quarto',
      label: 'QUARTO',
      items: [
        { id: 'enxoval', label: 'Trocar enxoval' },
        { id: 'superficies', label: 'Limpar superficies' },
        { id: 'aspirar', label: 'Aspirar carpete' },
      ],
    },
    {
      id: 'banheiro',
      label: 'BANHEIRO',
      items: [
        { id: 'sanitario', label: 'Higienizar sanitario' },
        { id: 'amenities', label: 'Repor amenities' },
        { id: 'toalhas', label: 'Trocar toalhas' },
      ],
    },
    {
      id: 'frigobar',
      label: 'FRIGOBAR',
      items: [
        { id: 'conferir', label: 'Conferir consumo' },
        { id: 'itens', label: 'Repor itens' },
      ],
    },
  ],
  manutencao: [
    {
      id: 'vistoria',
      label: 'VISTORIA TECNICA',
      items: [
        { id: 'diagnostico', label: 'Executar diagnostico inicial' },
        { id: 'pecas', label: 'Separar pecas e ferramentas' },
        { id: 'reparo', label: 'Realizar reparo principal' },
      ],
    },
    {
      id: 'finalizacao',
      label: 'FINALIZACAO',
      items: [
        { id: 'teste', label: 'Testar funcionamento' },
        { id: 'registro', label: 'Registrar evidencias na S.O' },
      ],
    },
  ],
};

/**
 * Garante que a tabela historico_governanca exista.
 * Chamado uma vez no startup via governancaController.
 */
export async function ensureHistoricoTable() {
  await query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'historico_governanca'
    )
    BEGIN
      CREATE TABLE historico_governanca (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        hotel_id       UNIQUEIDENTIFIER NOT NULL,
        quarto_id      UNIQUEIDENTIFIER NOT NULL,
        tipo           NVARCHAR(20)     NOT NULL,
        realizado_em   DATETIME2        NOT NULL DEFAULT GETDATE(),
        usuario_id     UNIQUEIDENTIFIER NULL,
        checklist_json NVARCHAR(MAX)    NULL,
        observacoes    NVARCHAR(500)    NULL,
        CONSTRAINT FK_histgov_hotel  FOREIGN KEY (hotel_id)  REFERENCES hotel(id),
        CONSTRAINT FK_histgov_quarto FOREIGN KEY (quarto_id) REFERENCES quarto(id)
      );
      CREATE INDEX IX_histgov_quarto ON historico_governanca (quarto_id, realizado_em DESC);
      CREATE INDEX IX_histgov_hotel  ON historico_governanca (hotel_id,  realizado_em DESC);
    END
  `);

  await query(`
    IF OBJECT_ID('historico_governanca', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('historico_governanca', 'hotel_id') IS NULL
        ALTER TABLE historico_governanca ADD hotel_id UNIQUEIDENTIFIER NULL;

      IF COL_LENGTH('historico_governanca', 'quarto_id') IS NULL
        ALTER TABLE historico_governanca ADD quarto_id UNIQUEIDENTIFIER NULL;

      IF COL_LENGTH('historico_governanca', 'tipo') IS NULL
        ALTER TABLE historico_governanca ADD tipo NVARCHAR(20) NULL;

      IF COL_LENGTH('historico_governanca', 'realizado_em') IS NULL
        ALTER TABLE historico_governanca ADD realizado_em DATETIME2 NULL;

      IF COL_LENGTH('historico_governanca', 'usuario_id') IS NULL
        ALTER TABLE historico_governanca ADD usuario_id UNIQUEIDENTIFIER NULL;

      IF COL_LENGTH('historico_governanca', 'checklist_json') IS NULL
        ALTER TABLE historico_governanca ADD checklist_json NVARCHAR(MAX) NULL;

      IF COL_LENGTH('historico_governanca', 'observacoes') IS NULL
        ALTER TABLE historico_governanca ADD observacoes NVARCHAR(500) NULL;
    END
  `);

  await query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'historico_governanca_item'
    )
    BEGIN
      CREATE TABLE historico_governanca_item (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        historico_id  INT             NOT NULL,
        ordem         INT             NULL,
        item          NVARCHAR(200)   NOT NULL,
        concluido     BIT             NOT NULL DEFAULT 0,
        observacao    NVARCHAR(500)   NULL,
        CONSTRAINT FK_histgovitem_hist FOREIGN KEY (historico_id)
          REFERENCES historico_governanca(id) ON DELETE CASCADE
      );

      CREATE INDEX IX_histgovitem_hist ON historico_governanca_item (historico_id, ordem ASC, id ASC);
    END
  `);

  await query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'checklist_template_secao'
    )
    BEGIN
      CREATE TABLE checklist_template_secao (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        hotel_id  UNIQUEIDENTIFIER NOT NULL,
        tipo      NVARCHAR(20)     NOT NULL,
        titulo    NVARCHAR(120)    NOT NULL,
        ordem     INT              NOT NULL DEFAULT 0,
        CONSTRAINT FK_checktpl_hotel FOREIGN KEY (hotel_id) REFERENCES hotel(id)
      );

      CREATE INDEX IX_checktpl_hotel_tipo ON checklist_template_secao (hotel_id, tipo, ordem ASC, id ASC);
    END
  `);

  await query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'checklist_template_item'
    )
    BEGIN
      CREATE TABLE checklist_template_item (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        secao_id  INT            NOT NULL,
        texto     NVARCHAR(200)  NOT NULL,
        ordem     INT            NOT NULL DEFAULT 0,
        CONSTRAINT FK_checktpl_item_secao FOREIGN KEY (secao_id)
          REFERENCES checklist_template_secao(id) ON DELETE CASCADE
      );

      CREATE INDEX IX_checktpl_item_secao ON checklist_template_item (secao_id, ordem ASC, id ASC);
    END
  `);
}

/**
 * Registra um evento de conclusão de checklist (limpeza ou manutenção).
 */
export async function registrarHistorico({ hotelId, quartoId, tipo, usuarioId = null, checklistJson = null, observacoes = null }) {
  // Valida tipo
  const tipoNorm = String(tipo).toLowerCase();
  if (!['limpeza', 'manutencao'].includes(tipoNorm)) {
    throw new Error('Tipo inválido. Use "limpeza" ou "manutencao".');
  }

  // Verifica que o quarto pertence ao hotel
  await garantirQuartoDoHotel({ hotelId, quartoId });

  const checklistStr = checklistJson
    ? (typeof checklistJson === 'string' ? checklistJson : JSON.stringify(checklistJson))
    : null;

  const checklistItens = normalizarChecklistItens(checklistJson);

  const result = await queryWithParams(
    `INSERT INTO historico_governanca
       (hotel_id, quarto_id, tipo, realizado_em, usuario_id, checklist_json, observacoes)
     OUTPUT INSERTED.id, INSERTED.hotel_id, INSERTED.quarto_id, INSERTED.tipo, INSERTED.realizado_em, 
            INSERTED.usuario_id, INSERTED.checklist_json, INSERTED.observacoes
     VALUES
       (@hotelId, @quartoId, @tipo, GETDATE(), @usuarioId, @checklistJson, @observacoes)`,
    {
      hotelId,
      quartoId,
      tipo: tipoNorm,
      usuarioId,
      checklistJson: checklistStr,
      observacoes: observacoes ?? null,
    }
  );

  const registro = result.recordset[0];

  if (checklistItens.length > 0) {
    for (const item of checklistItens) {
      await queryWithParams(
        `INSERT INTO historico_governanca_item (historico_id, ordem, item, concluido, observacao)
         VALUES (@historicoId, @ordem, @item, @concluido, @observacao)`,
        {
          historicoId: registro.id,
          ordem: item.ordem,
          item: item.item,
          concluido: item.concluido,
          observacao: item.observacao,
        }
      );
    }
  }

  const [registroCompleto] = await hidratarComChecklistItens([registro]);

  try {
    const tipoLog = tipoNorm === 'limpeza' ? TIPOS_LOG_RESERVA.LIMPEZA : TIPOS_LOG_RESERVA.STATUS_RESERVA;
    const tituloLog = tipoNorm === 'limpeza' ? 'Limpeza registrada' : 'Manutenção registrada';

    await registrarLogReserva({
      hotelId,
      quartoId,
      tipo: tipoLog,
      titulo: tituloLog,
      descricao: observacoes || `Checklist de ${tipoNorm} registrado para o quarto.`,
      referenciaTipo: 'historico_governanca',
      dados: {
        historico_id: registro.id,
        tipo: tipoNorm,
      },
    });
  } catch (erroLog) {
    console.warn('[governanca] Aviso ao registrar log unificado:', erroLog?.message);
  }

  return registroCompleto;
}

/**
 * Lista o histórico de um quarto específico (mais recentes primeiro).
 */
export async function listarHistoricoQuarto({ hotelId, quartoId, limit = 50 }) {
  await garantirQuartoDoHotel({ hotelId, quartoId });

  const result = await queryWithParams(
    `SELECT TOP (@limit)
       h.id,
       h.tipo,
       h.realizado_em,
       h.observacoes,
       h.checklist_json,
       h.usuario_id,
       q.numero  AS quarto_numero,
       q.id      AS quarto_id
     FROM historico_governanca h
     INNER JOIN quarto q ON q.id = h.quarto_id
     WHERE h.hotel_id  = @hotelId
       AND h.quarto_id = @quartoId
     ORDER BY h.realizado_em DESC`,
    { hotelId, quartoId, limit }
  );

  return hidratarComChecklistItens(result.recordset);
}

/**
 * Lista o histórico completo do hotel (todos os quartos), mais recentes primeiro.
 */
export async function listarHistoricoHotel({ hotelId, tipo = null, limit = 100 }) {
  const tipoFiltro = tipo ? String(tipo).toLowerCase() : null;

  const result = await queryWithParams(
    `SELECT TOP (@limit)
       h.id,
       h.tipo,
       h.realizado_em,
       h.observacoes,
       h.checklist_json,
       h.usuario_id,
       q.numero  AS quarto_numero,
       q.id      AS quarto_id
     FROM historico_governanca h
     INNER JOIN quarto q ON q.id = h.quarto_id
     WHERE h.hotel_id = @hotelId
       AND (@tipo IS NULL OR h.tipo = @tipo)
     ORDER BY h.realizado_em DESC`,
    { hotelId, tipo: tipoFiltro, limit }
  );

  return hidratarComChecklistItens(result.recordset);
}

/**
 * Retorna os últimos eventos de limpeza e manutenção de um quarto.
 */
export async function ultimosEventosPorQuarto({ hotelId, quartoId }) {
  await garantirQuartoDoHotel({ hotelId, quartoId });

  const result = await queryWithParams(
    `SELECT
       h.id,
       h.tipo,
       h.realizado_em,
       h.observacoes,
       h.checklist_json,
       h.usuario_id,
       q.numero AS quarto_numero,
       q.id     AS quarto_id
     FROM historico_governanca h
     INNER JOIN quarto q ON q.id = h.quarto_id
     WHERE h.hotel_id = @hotelId
       AND h.quarto_id = @quartoId
       AND h.realizado_em = (
         SELECT MAX(h2.realizado_em)
         FROM historico_governanca h2
         WHERE h2.hotel_id = h.hotel_id
           AND h2.quarto_id = h.quarto_id
           AND h2.tipo = h.tipo
       )
       AND h.tipo IN ('limpeza', 'manutencao')
     ORDER BY h.tipo`,
    { hotelId, quartoId }
  );

  const registros = await hidratarComChecklistItens(result.recordset);
  const resposta = {
    quarto_id: quartoId,
    ultima_limpeza: null,
    ultima_manutencao: null,
  };

  for (const registro of registros) {
    if (registro.tipo === 'limpeza') resposta.ultima_limpeza = registro;
    if (registro.tipo === 'manutencao') resposta.ultima_manutencao = registro;
  }

  return resposta;
}

/**
 * Retorna o último registro de limpeza e de manutenção de cada quarto do hotel.
 * Útil para mostrar "última limpeza: X dias atrás" no dashboard de governança.
 */
export async function resumoUltimosEventos({ hotelId }) {
  const result = await queryWithParams(
    `SELECT
       q.id          AS quarto_id,
       q.numero      AS quarto_numero,
       MAX(CASE WHEN h.tipo = 'limpeza'    THEN h.realizado_em END) AS ultima_limpeza,
       MAX(CASE WHEN h.tipo = 'manutencao' THEN h.realizado_em END) AS ultima_manutencao
     FROM quarto q
     LEFT JOIN historico_governanca h
       ON h.quarto_id = q.id AND h.hotel_id = @hotelId
     WHERE q.hotel_id = @hotelId
     GROUP BY q.id, q.numero
     ORDER BY q.numero`,
    { hotelId }
  );

  return result.recordset;
}

/**
 * Busca o template de checklist configurado por hotel e tipo.
 */
export async function obterTemplateChecklist({ hotelId, tipo }) {
  const tipoNorm = validarTipoChecklist(tipo);

  const secoesResult = await queryWithParams(
    `SELECT id, titulo, ordem
     FROM checklist_template_secao
     WHERE hotel_id = @hotelId
       AND tipo = @tipo
     ORDER BY ordem ASC, id ASC`,
    { hotelId, tipo: tipoNorm }
  );

  if (secoesResult.recordset.length === 0) {
    return {
      tipo: tipoNorm,
      origem: 'default',
      secoes: clonarTemplatePadrao(tipoNorm),
    };
  }

  const itensResult = await queryWithParams(
    `SELECT i.id, i.secao_id, i.texto, i.ordem
     FROM checklist_template_item i
     INNER JOIN checklist_template_secao s ON s.id = i.secao_id
     WHERE s.hotel_id = @hotelId
       AND s.tipo = @tipo
     ORDER BY i.ordem ASC, i.id ASC`,
    { hotelId, tipo: tipoNorm }
  );

  const itensPorSecao = new Map();
  for (const item of itensResult.recordset) {
    if (!itensPorSecao.has(item.secao_id)) {
      itensPorSecao.set(item.secao_id, []);
    }
    itensPorSecao.get(item.secao_id).push({
      id: `item-${item.id}`,
      label: item.texto,
    });
  }

  return {
    tipo: tipoNorm,
    origem: 'custom',
    secoes: secoesResult.recordset.map((secao) => ({
      id: `secao-${secao.id}`,
      label: secao.titulo,
      items: itensPorSecao.get(secao.id) ?? [],
    })),
  };
}

/**
 * Salva template de checklist (substitui o template atual do tipo para o hotel).
 */
export async function salvarTemplateChecklist({ hotelId, tipo, secoes }) {
  const tipoNorm = validarTipoChecklist(tipo);
  const secoesNormalizadas = normalizarSecoesTemplate(secoes);

  await queryWithParams(
    `DELETE i
     FROM checklist_template_item i
     INNER JOIN checklist_template_secao s ON s.id = i.secao_id
     WHERE s.hotel_id = @hotelId
       AND s.tipo = @tipo`,
    { hotelId, tipo: tipoNorm }
  );

  await queryWithParams(
    `DELETE FROM checklist_template_secao
     WHERE hotel_id = @hotelId
       AND tipo = @tipo`,
    { hotelId, tipo: tipoNorm }
  );

  for (let secaoIndex = 0; secaoIndex < secoesNormalizadas.length; secaoIndex += 1) {
    const secao = secoesNormalizadas[secaoIndex];

    const secaoInsert = await queryWithParams(
      `INSERT INTO checklist_template_secao (hotel_id, tipo, titulo, ordem)
       OUTPUT INSERTED.id
       VALUES (@hotelId, @tipo, @titulo, @ordem)`,
      {
        hotelId,
        tipo: tipoNorm,
        titulo: secao.label,
        ordem: secaoIndex + 1,
      }
    );

    const secaoId = secaoInsert.recordset[0]?.id;
    for (let itemIndex = 0; itemIndex < secao.items.length; itemIndex += 1) {
      const item = secao.items[itemIndex];
      await queryWithParams(
        `INSERT INTO checklist_template_item (secao_id, texto, ordem)
         VALUES (@secaoId, @texto, @ordem)`,
        {
          secaoId,
          texto: item.label,
          ordem: itemIndex + 1,
        }
      );
    }
  }

  return obterTemplateChecklist({ hotelId, tipo: tipoNorm });
}

/**
 * Remove o template customizado e volta para o padrão.
 */
export async function resetarTemplateChecklist({ hotelId, tipo }) {
  const tipoNorm = validarTipoChecklist(tipo);

  await queryWithParams(
    `DELETE i
     FROM checklist_template_item i
     INNER JOIN checklist_template_secao s ON s.id = i.secao_id
     WHERE s.hotel_id = @hotelId
       AND s.tipo = @tipo`,
    { hotelId, tipo: tipoNorm }
  );

  await queryWithParams(
    `DELETE FROM checklist_template_secao
     WHERE hotel_id = @hotelId
       AND tipo = @tipo`,
    { hotelId, tipo: tipoNorm }
  );

  return {
    tipo: tipoNorm,
    origem: 'default',
    secoes: clonarTemplatePadrao(tipoNorm),
  };
}

/**
 * Cria uma nova seção no template de checklist do hotel.
 */
export async function adicionarSecaoChecklist({ hotelId, tipo, titulo }) {
  const tipoNorm = validarTipoChecklist(tipo);
  const tituloNorm = String(titulo ?? '').trim().toUpperCase();

  if (!tituloNorm) {
    throw new Error('Título da seção é obrigatório.');
  }

  const maxOrdemResult = await queryWithParams(
    `SELECT MAX(ordem) as maxOrdem
     FROM checklist_template_secao
     WHERE hotel_id = @hotelId AND tipo = @tipo`,
    { hotelId, tipo: tipoNorm }
  );

  const proximaOrdem = (maxOrdemResult.recordset[0]?.maxOrdem ?? 0) + 1;

  const result = await queryWithParams(
    `INSERT INTO checklist_template_secao (hotel_id, tipo, titulo, ordem)
     OUTPUT INSERTED.id, INSERTED.titulo, INSERTED.ordem
     VALUES (@hotelId, @tipo, @titulo, @ordem)`,
    {
      hotelId,
      tipo: tipoNorm,
      titulo: tituloNorm,
      ordem: proximaOrdem,
    }
  );

  const secao = result.recordset[0];
  return {
    id: `secao-${secao.id}`,
    label: secao.titulo,
    items: [],
  };
}

/**
 * Adiciona um novo item em uma seção de checklist.
 */
export async function adicionarItemSecao({ hotelId, tipo, secaoId, texto }) {
  const tipoNorm = validarTipoChecklist(tipo);
  const textoNorm = String(texto ?? '').trim();

  if (!textoNorm) {
    throw new Error('Texto do item é obrigatório.');
  }

  if (!secaoId) {
    throw new Error('ID da seção é obrigatório.');
  }

  const secaoNumId = parseInt(String(secaoId).replace(/\D/g, ''), 10);
  if (!Number.isInteger(secaoNumId) || secaoNumId <= 0) {
    throw new Error('ID da seção inválido.');
  }

  const secaoResult = await queryWithParams(
    `SELECT TOP 1 s.id
     FROM checklist_template_secao s
     WHERE s.id = @secaoId
       AND s.hotel_id = @hotelId
       AND s.tipo = @tipo`,
    { secaoId: secaoNumId, hotelId, tipo: tipoNorm }
  );

  if (secaoResult.recordset.length === 0) {
    throw new Error('Seção não encontrada neste hotel ou tipo de checklist.');
  }

  const maxOrdemResult = await queryWithParams(
    `SELECT MAX(ordem) as maxOrdem
     FROM checklist_template_item
     WHERE secao_id = @secaoId`,
    { secaoId: secaoNumId }
  );

  const proximaOrdem = (maxOrdemResult.recordset[0]?.maxOrdem ?? 0) + 1;

  const result = await queryWithParams(
    `INSERT INTO checklist_template_item (secao_id, texto, ordem)
     OUTPUT INSERTED.id, INSERTED.texto, INSERTED.ordem
     VALUES (@secaoId, @texto, @ordem)`,
    {
      secaoId: secaoNumId,
      texto: textoNorm,
      ordem: proximaOrdem,
    }
  );

  const item = result.recordset[0];
  return {
    id: `item-${item.id}`,
    label: item.texto,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseRegistro(row) {
  let checklist = null;
  if (row.checklist_json) {
    try { checklist = JSON.parse(row.checklist_json); } catch { checklist = null; }
  }
  return { ...row, checklist_json: checklist };
}

function normalizarChecklistItens(checklistJson) {
  if (!checklistJson) return [];

  let origem = checklistJson;
  if (typeof checklistJson === 'string') {
    try {
      origem = JSON.parse(checklistJson);
    } catch {
      return [];
    }
  }

  const secoesBrutas = Array.isArray(origem)
    ? origem
    : Array.isArray(origem?.secoes)
      ? origem.secoes
      : Array.isArray(origem?.sections)
        ? origem.sections
        : [];

  if (secoesBrutas.length > 0 && secoesBrutas.some((secao) => Array.isArray(secao?.items))) {
    const itensDeSecoes = [];
    secoesBrutas.forEach((secao) => {
      const nomeSecao = String(secao?.label ?? secao?.nome ?? secao?.titulo ?? '').trim();
      (secao?.items ?? []).forEach((item, index) => {
        if (!item) return;
        if (typeof item === 'string') {
          itensDeSecoes.push({
            ordem: itensDeSecoes.length + 1,
            item: item.trim(),
            concluido: false,
            observacao: nomeSecao || null,
          });
          return;
        }

        const nomeItem = String(item.label ?? item.item ?? item.nome ?? item.descricao ?? '').trim();
        if (!nomeItem) return;

        itensDeSecoes.push({
          ordem: Number.isInteger(item.ordem) ? item.ordem : index + 1,
          item: nomeItem,
          concluido: Boolean(item.done ?? item.concluido ?? item.checked ?? item.ok ?? false),
          observacao: nomeSecao || null,
        });
      });
    });
    return itensDeSecoes;
  }

  const itensBrutos = Array.isArray(origem)
    ? origem
    : Array.isArray(origem?.itens)
      ? origem.itens
      : Array.isArray(origem?.items)
        ? origem.items
        : [];

  return itensBrutos
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          ordem: index + 1,
          item: item.trim(),
          concluido: false,
          observacao: null,
        };
      }

      if (!item || typeof item !== 'object') return null;

      const nomeItem = String(item.item ?? item.nome ?? item.descricao ?? '').trim();
      if (!nomeItem) return null;

      return {
        ordem: Number.isInteger(item.ordem) ? item.ordem : index + 1,
        item: nomeItem,
        concluido: Boolean(item.concluido ?? item.checked ?? item.ok ?? false),
        observacao: item.observacao ? String(item.observacao).slice(0, 500) : null,
      };
    })
    .filter(Boolean);
}

function validarTipoChecklist(tipo) {
  const tipoNorm = String(tipo ?? '').trim().toLowerCase();
  if (!['limpeza', 'manutencao'].includes(tipoNorm)) {
    throw new Error('Tipo inválido. Use "limpeza" ou "manutencao".');
  }
  return tipoNorm;
}

function clonarTemplatePadrao(tipo) {
  const base = DEFAULT_CHECKLIST_TEMPLATES[tipo] ?? [];
  return base.map((secao) => ({
    id: secao.id,
    label: secao.label,
    items: (secao.items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
    })),
  }));
}

function normalizarSecoesTemplate(secoes) {
  const origem = Array.isArray(secoes) ? secoes : [];

  return origem
    .map((secao, secaoIndex) => {
      if (!secao || typeof secao !== 'object') return null;

      const labelSecao = String(secao.label ?? secao.titulo ?? secao.nome ?? '').trim();
      if (!labelSecao) return null;

      const itens = (Array.isArray(secao.items) ? secao.items : [])
        .map((item, itemIndex) => {
          if (typeof item === 'string') {
            const texto = item.trim();
            return texto ? { id: `str-${secaoIndex}-${itemIndex}`, label: texto } : null;
          }

          if (!item || typeof item !== 'object') return null;
          const texto = String(item.label ?? item.texto ?? item.item ?? item.nome ?? '').trim();
          if (!texto) return null;

          return {
            id: String(item.id ?? `item-${secaoIndex}-${itemIndex}`),
            label: texto,
          };
        })
        .filter(Boolean);

      return {
        id: String(secao.id ?? `secao-${secaoIndex}`),
        label: labelSecao.toUpperCase(),
        items: itens,
      };
    })
    .filter(Boolean);
}

async function carregarItensChecklistPorHistoricoIds(historicoIds) {
  if (!historicoIds.length) return [];

  const params = {};
  const placeholders = historicoIds.map((id, index) => {
    const key = `hist${index}`;
    params[key] = id;
    return `@${key}`;
  });

  const result = await queryWithParams(
    `SELECT historico_id, ordem, item, concluido, observacao
     FROM historico_governanca_item
     WHERE historico_id IN (${placeholders.join(', ')})
     ORDER BY historico_id, ordem ASC, id ASC`,
    params
  );

  return result.recordset;
}

async function hidratarComChecklistItens(rows) {
  const registros = rows.map(parseRegistro);
  const ids = registros.map((r) => r.id).filter(Boolean);

  if (!ids.length) {
    return registros.map((r) => ({ ...r, checklist_itens: [] }));
  }

  const itens = await carregarItensChecklistPorHistoricoIds(ids);
  const itensPorHistorico = new Map();

  for (const item of itens) {
    if (!itensPorHistorico.has(item.historico_id)) {
      itensPorHistorico.set(item.historico_id, []);
    }
    itensPorHistorico.get(item.historico_id).push({
      ordem: item.ordem,
      item: item.item,
      concluido: Boolean(item.concluido),
      observacao: item.observacao,
    });
  }

  return registros.map((registro) => ({
    ...registro,
    checklist_itens: itensPorHistorico.get(registro.id) ?? [],
  }));
}

async function garantirQuartoDoHotel({ hotelId, quartoId }) {
  const quartoRes = await queryWithParams(
    `SELECT TOP 1 q.id 
     FROM quarto q
     INNER JOIN andar a ON a.id = q.andar_id
     WHERE q.id = @quartoId AND a.hotel_id = @hotelId`,
    { quartoId, hotelId }
  );

  if (quartoRes.recordset.length === 0) {
    throw new Error('Quarto não encontrado neste hotel.');
  }
}
