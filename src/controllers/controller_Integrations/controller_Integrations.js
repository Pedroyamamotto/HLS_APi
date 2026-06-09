import sql from "mssql";
import { getDatabase as getPool } from "../../utils/database.js";
import * as TTLockService from "../../services/service_TTLock.js";

async function getClassicCodeAtiva(pool, hotel_id) {
  const result = await pool.request()
    .input("hotel_id", sql.Int, hotel_id)
    .query(`
      SELECT TOP 1 *
      FROM integracao
      WHERE hotel_id = @hotel_id
        AND ativa = 1
        AND nome = 'classic_code'
    `);

  return result.recordset[0];
}

async function requireClassicCode(pool, hotel_id) {
  const integracao = await getClassicCodeAtiva(pool, hotel_id);

  if (!integracao) {
    const error = new Error("Classic Code nao esta ativo para este hotel");
    error.status = 400;
    throw error;
  }

  return integracao;
}

async function listarFechadurasLocais(pool, hotel_id) {
  const result = await pool.request()
    .input("hotel_id", sql.Int, hotel_id)
    .query(`
      SELECT id, hotel_id, quarto_id, lock_id, nome, alias, mac, andar_nome,
             gateway_conectado, bateria, dados_json, updated_at
      FROM integracao_fechadura
      WHERE hotel_id = @hotel_id
    `);

  return result.recordset;
}

function buildLockMap(locks) {
  return new Map((locks || []).map((item) => [String(item.lock_id), item]));
}

function normalizeApiList(payload) {
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.api?.list)) return payload.api.list;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function salvarHistoricoSync(pool, {
  hotel_id,
  integracao_id,
  tipo,
  mensagem,
  total = 0,
  sucesso = true,
  erro = null,
  dados_json = null
}) {
  await pool.request()
    .input("hotel_id", sql.Int, hotel_id)
    .input("integracao_id", sql.Int, integracao_id)
    .input("tipo", sql.VarChar, tipo)
    .input("mensagem", sql.VarChar, mensagem)
    .input("total", sql.Int, total)
    .input("sucesso", sql.Bit, sucesso)
    .input("erro", sql.NVarChar, erro)
    .input("dados_json", sql.NVarChar, dados_json ? JSON.stringify(dados_json) : null)
    .query(`
      INSERT INTO integracao_sync_historico
      (hotel_id, integracao_id, tipo, mensagem, total, sucesso, erro, dados_json)
      VALUES
      (@hotel_id, @integracao_id, @tipo, @mensagem, @total, @sucesso, @erro, @dados_json)
    `);
}

function parseJsonSafe(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const RECORD_TYPE_DEFINITIONS = {
  1: { technicalLabel: "Bluetooth Unlock", userLabel: "Abertura via App Bluetooth", category: "access", categoryLabel: "Acessos" },
  2: { technicalLabel: "Passcode Unlock", userLabel: "Abertura por Senha", category: "access", categoryLabel: "Acessos" },
  3: { technicalLabel: "IC Card Unlock", userLabel: "Abertura por Cartão RFID", category: "access", categoryLabel: "Acessos" },
  4: { technicalLabel: "Fingerprint Unlock", userLabel: "Abertura por Biometria", category: "access", categoryLabel: "Acessos" },
  5: { technicalLabel: "Wristband Unlock", userLabel: "Abertura por Pulseira", category: "access", categoryLabel: "Acessos" },
  6: { technicalLabel: "Mechanical Key Unlock", userLabel: "Abertura por Chave Mecânica", category: "access", categoryLabel: "Acessos" },
  7: { technicalLabel: "Auto Unlock", userLabel: "Abertura Automática", category: "access", categoryLabel: "Acessos" },
  8: { technicalLabel: "Gateway Unlock", userLabel: "Abertura Remota", category: "access", categoryLabel: "Acessos" },
  9: { technicalLabel: "Button Unlock", userLabel: "Abertura por Botão Interno", category: "access", categoryLabel: "Acessos" },
  10: { technicalLabel: "Remote Control Unlock", userLabel: "Controle Remoto", category: "access", categoryLabel: "Acessos" },
  11: { technicalLabel: "NFC Unlock", userLabel: "Abertura NFC", category: "access", categoryLabel: "Acessos" },
  12: { technicalLabel: "Gateway Unlock", userLabel: "Abertura via Gateway", category: "access", categoryLabel: "Acessos" },
  13: { technicalLabel: "TTLock App Unlock", userLabel: "Abertura pelo Aplicativo", category: "access", categoryLabel: "Acessos" },
  14: { technicalLabel: "Administrator Passcode", userLabel: "Senha Administrador", category: "admin", categoryLabel: "Administração" },
  15: { technicalLabel: "Cyclic Passcode", userLabel: "Senha Recorrente", category: "admin", categoryLabel: "Administração" },
  16: { technicalLabel: "Permanent Passcode", userLabel: "Senha Permanente", category: "admin", categoryLabel: "Administração" },
  17: { technicalLabel: "Timed Passcode", userLabel: "Senha Temporária", category: "admin", categoryLabel: "Administração" },
  18: { technicalLabel: "One-Time Passcode", userLabel: "Senha Única", category: "admin", categoryLabel: "Administração" },
  19: { technicalLabel: "Erase Passcode", userLabel: "Senha Excluída", category: "admin", categoryLabel: "Administração" },
  20: { technicalLabel: "Lock From Inside", userLabel: "Travamento Interno", category: "status", categoryLabel: "Estado da Fechadura" },
  21: { technicalLabel: "Unlock From Inside", userLabel: "Destravamento Interno", category: "status", categoryLabel: "Estado da Fechadura" },
  22: { technicalLabel: "Deadbolt Locked", userLabel: "Ferrolho Travado", category: "status", categoryLabel: "Estado da Fechadura" },
  23: { technicalLabel: "Deadbolt Unlocked", userLabel: "Ferrolho Destravado", category: "status", categoryLabel: "Estado da Fechadura" },
  24: { technicalLabel: "Passage Mode Enabled", userLabel: "Modo Passagem Ativado", category: "status", categoryLabel: "Estado da Fechadura" },
  25: { technicalLabel: "Passage Mode Disabled", userLabel: "Modo Passagem Desativado", category: "status", categoryLabel: "Estado da Fechadura" },
  26: { technicalLabel: "Lock Frozen", userLabel: "Fechadura Bloqueada", category: "alert", categoryLabel: "Alertas" },
  27: { technicalLabel: "Low Battery Alarm", userLabel: "Bateria Baixa", category: "alert", categoryLabel: "Alertas" },
  28: { technicalLabel: "System Locked", userLabel: "Sistema Bloqueado", category: "alert", categoryLabel: "Alertas" },
  29: { technicalLabel: "Tamper Alarm", userLabel: "Alarme Violação", category: "alert", categoryLabel: "Alertas" },
  30: { technicalLabel: "Wrong Password", userLabel: "Senha Incorreta", category: "alert", categoryLabel: "Alertas" },
  31: { technicalLabel: "Wrong Fingerprint", userLabel: "Biometria Inválida", category: "alert", categoryLabel: "Alertas" },
  32: { technicalLabel: "Wrong Card", userLabel: "Cartão Inválido", category: "alert", categoryLabel: "Alertas" },
  33: { technicalLabel: "Wrong Key", userLabel: "Chave Inválida", category: "alert", categoryLabel: "Alertas" },
  34: { technicalLabel: "Unlock Failed", userLabel: "Falha na Abertura", category: "alert", categoryLabel: "Alertas" },
  35: { technicalLabel: "Remote Passcode Created", userLabel: "Senha Criada Remotamente", category: "admin", categoryLabel: "Administração" },
  36: { technicalLabel: "Remote Passcode Deleted", userLabel: "Senha Removida", category: "admin", categoryLabel: "Administração" },
  37: { technicalLabel: "Remote Card Added", userLabel: "Cartão Adicionado", category: "admin", categoryLabel: "Administração" },
  38: { technicalLabel: "Remote Card Deleted", userLabel: "Cartão Removido", category: "admin", categoryLabel: "Administração" },
  39: { technicalLabel: "Remote Fingerprint Added", userLabel: "Biometria Adicionada", category: "admin", categoryLabel: "Administração" },
  40: { technicalLabel: "Remote Fingerprint Deleted", userLabel: "Biometria Removida", category: "admin", categoryLabel: "Administração" },
  41: { technicalLabel: "Firmware Updated", userLabel: "Firmware Atualizado", category: "admin", categoryLabel: "Administração" },
  42: { technicalLabel: "Lock Synchronized", userLabel: "Fechadura Sincronizada", category: "admin", categoryLabel: "Administração" },
  43: { technicalLabel: "Gateway Connected", userLabel: "Gateway Conectado", category: "status", categoryLabel: "Estado da Fechadura" },
  44: { technicalLabel: "Gateway Disconnected", userLabel: "Gateway Desconectado", category: "alert", categoryLabel: "Alertas" },
  45: { technicalLabel: "Auto Lock", userLabel: "Travamento Automático", category: "status", categoryLabel: "Estado da Fechadura" },
  46: { technicalLabel: "Unlock By eKey", userLabel: "Abertura por eKey", category: "access", categoryLabel: "Acessos" },
  47: { technicalLabel: "eKey Revoked", userLabel: "eKey Revogada", category: "admin", categoryLabel: "Administração" },
  48: { technicalLabel: "Invalid Passcode Attempt", userLabel: "Tentativa de Senha Inválida", category: "alert", categoryLabel: "Alertas" },
  49: { technicalLabel: "Invalid Card Attempt", userLabel: "Tentativa de Cartão Inválido", category: "alert", categoryLabel: "Alertas" },
  50: { technicalLabel: "Invalid Fingerprint Attempt", userLabel: "Tentativa de Biometria Inválida", category: "alert", categoryLabel: "Alertas" }
};

function getRecordDefinition(recordType) {
  const code = Number(recordType);
  return {
    code,
    technicalLabel: RECORD_TYPE_DEFINITIONS[code]?.technicalLabel || `TTLock ${code}`,
    userLabel: RECORD_TYPE_DEFINITIONS[code]?.userLabel || `Evento TTLock ${code}`,
    category: RECORD_TYPE_DEFINITIONS[code]?.category || "other",
    categoryLabel: RECORD_TYPE_DEFINITIONS[code]?.categoryLabel || "Outros"
  };
}

function mapRecordType(recordType) {
  return getRecordDefinition(recordType).userLabel;
}

function enrichAccessRecord(record) {
  const recordDefinition = getRecordDefinition(record?.recordType);
  const success = Number(record?.success) === 1;

  return {
    ...record,
    method: recordDefinition.userLabel,
    recordTypeLabel: recordDefinition.userLabel,
    recordTypeTechnicalLabel: recordDefinition.technicalLabel,
    category: recordDefinition.category,
    categoryLabel: recordDefinition.categoryLabel,
    resultLabel: success ? "Sucesso" : "Falha",
    success
  };
}

async function getClassicCodeContext(pool, hotel_id) {
  const integracao = await getClassicCodeAtiva(pool, hotel_id);

  if (!integracao) {
    return { integracao: null, localLocks: [], localLockMap: new Map() };
  }

  const lockRows = await pool.request()
    .input("hotel_id", sql.Int, hotel_id)
    .query(`
      SELECT *
      FROM integracao_fechadura
      WHERE hotel_id = @hotel_id
      ORDER BY id DESC
    `);

  const localLocks = lockRows.recordset || [];
  const localLockMap = new Map(
    localLocks.map((item) => [String(item.lock_id), item])
  );

  return { integracao, localLocks, localLockMap };
}

function ensureClassicCodeCredentials(integracao) {
  if (!integracao) {
    const error = new Error("Classic Code nao esta ativo para este hotel");
    error.statusCode = 400;
    throw error;
  }

  if (!integracao.client_id || !integracao.access_token) {
    const error = new Error("Credenciais ou token TTLock ausentes para este hotel");
    error.statusCode = 400;
    throw error;
  }
}

function ensureClassicCodeAuthConfig({ client_id, client_secret, account, password }) {
  if (!client_id || !client_secret || !account || !password) {
    const error = new Error("Client ID, Client Secret, Account e Password sao obrigatorios para gerar o token TTLock");
    error.statusCode = 400;
    throw error;
  }
}

async function persistClassicCodeCredentials(pool, payload) {
  const {
    hotel_id,
    api_base,
    client_id,
    client_secret,
    account,
    password,
    access_token,
    refresh_token,
    token_type,
    token_expira_em
  } = payload;

  await pool.request()
    .input("hotel_id", sql.Int, hotel_id)
    .input("nome", sql.VarChar, "classic_code")
    .input("ativa", sql.Bit, true)
    .input("api_base", sql.VarChar, api_base || null)
    .input("client_id", sql.VarChar, client_id || null)
    .input("client_secret", sql.VarChar, client_secret || null)
    .input("account", sql.VarChar, account || null)
    .input("password", sql.VarChar, password || null)
    .input("access_token", sql.NVarChar, access_token || null)
    .input("refresh_token", sql.NVarChar, refresh_token || null)
    .input("token_type", sql.VarChar, token_type || null)
    .input("token_expira_em", sql.DateTime, token_expira_em || null)
    .query(`
      MERGE integracao AS alvo
      USING (SELECT @hotel_id hotel_id, @nome nome) AS origem
      ON alvo.hotel_id = origem.hotel_id AND alvo.nome = origem.nome
      WHEN MATCHED THEN
        UPDATE SET
          ativa = @ativa,
          api_base = @api_base,
          client_id = @client_id,
          client_secret = @client_secret,
          account = @account,
          password = @password,
          access_token = @access_token,
          refresh_token = @refresh_token,
          token_type = @token_type,
          token_expira_em = @token_expira_em,
          updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (
          hotel_id, nome, ativa, api_base, client_id, client_secret,
          account, password, access_token, refresh_token, token_type, token_expira_em
        )
        VALUES (
          @hotel_id, @nome, @ativa, @api_base, @client_id, @client_secret,
          @account, @password, @access_token, @refresh_token, @token_type, @token_expira_em
        );
    `);
}

function mergeLockData(liveLock, localLock) {
  const localApiData = parseJsonSafe(localLock?.dados_json);

  return {
    id: localLock?.id ?? null,
    integracao_id: localLock?.integracao_id ?? null,
    hotel_id: localLock?.hotel_id ?? null,
    quarto_id: localLock?.quarto_id ?? null,
    lockId: Number(liveLock?.lockId ?? localLock?.lock_id ?? 0),
    lockName: liveLock?.lockName ?? localLock?.nome ?? localApiData?.lockName ?? null,
    lockAlias: liveLock?.lockAlias ?? localLock?.alias ?? localApiData?.lockAlias ?? null,
    lockMac: liveLock?.lockMac ?? localLock?.mac ?? localApiData?.lockMac ?? null,
    buildingName: liveLock?.buildingName ?? localApiData?.buildingName ?? null,
    floorName: liveLock?.floorName ?? localLock?.andar_nome ?? localApiData?.floorName ?? null,
    hasGateway: Number(liveLock?.hasGateway ?? localApiData?.hasGateway ?? (localLock?.gateway_conectado ? 1 : 0)),
    electricQuantity: Number(liveLock?.electricQuantity ?? localLock?.bateria ?? localApiData?.electricQuantity ?? 0),
    electricQuantityUpdateDate: liveLock?.electricQuantityUpdateDate ?? localApiData?.electricQuantityUpdateDate ?? null,
    keyboardPwdVersion: liveLock?.keyboardPwdVersion ?? localApiData?.keyboardPwdVersion ?? null,
    dados_api: liveLock ?? localApiData ?? null
  };
}

async function localizarReservaParaSenha(pool, {
  reserva_id,
  quarto_id,
  startDate,
  endDate
}) {
  if (reserva_id) {
    const reservaPorId = await pool.request()
      .input("reserva_id", sql.UniqueIdentifier, reserva_id)
      .input("quarto_numero", sql.Int, quarto_id)
      .query(`
        SELECT TOP 1
          r.id,
          r.hospede_id,
          r.quarto_id,
          r.data_checkin,
          r.data_checkout,
          r.status
        FROM reserva r
        INNER JOIN quarto q ON q.id = r.quarto_id
        WHERE r.id = @reserva_id
          AND q.numero = @quarto_numero
      `);

    return reservaPorId.recordset?.[0] || null;
  }

  const dataInicio = new Date(Number(startDate));
  const dataFim = new Date(Number(endDate));

  const reservaNoPeriodo = await pool.request()
    .input("quarto_numero", sql.Int, quarto_id)
    .input("data_inicio", sql.DateTime, dataInicio)
    .input("data_fim", sql.DateTime, dataFim)
    .query(`
      SELECT TOP 1
        r.id,
        r.hospede_id,
        r.quarto_id,
        r.data_checkin,
        r.data_checkout,
        r.status
      FROM reserva r
      INNER JOIN quarto q ON q.id = r.quarto_id
      WHERE q.numero = @quarto_numero
        AND LOWER(ISNULL(r.status, '')) NOT IN ('cancelada', 'cancelado', 'finalizado', 'finalizada', 'check-out', 'no-show')
        AND r.data_checkin < @data_fim
        AND r.data_checkout > @data_inicio
      ORDER BY
        CASE
          WHEN r.data_checkin = @data_inicio AND r.data_checkout = @data_fim THEN 0
          ELSE 1
        END,
        r.data_checkin DESC
    `);

  if (reservaNoPeriodo.recordset?.length) {
    return reservaNoPeriodo.recordset[0];
  }

  const ultimaReservaDoQuarto = await pool.request()
    .input("quarto_numero", sql.Int, quarto_id)
    .query(`
      SELECT TOP 1
        r.id,
        r.hospede_id,
        r.quarto_id,
        r.data_checkin,
        r.data_checkout,
        r.status
      FROM reserva r
      INNER JOIN quarto q ON q.id = r.quarto_id
      WHERE q.numero = @quarto_numero
        AND LOWER(ISNULL(r.status, '')) NOT IN ('cancelada', 'cancelado', 'finalizado', 'finalizada', 'check-out', 'no-show')
      ORDER BY r.data_checkin DESC
    `);

  return ultimaReservaDoQuarto.recordset?.[0] || null;
}

async function listarEkeysApi(req, res) {
  try {
    const { hotel_id, pageNo = 1, pageSize = 100 } = req.query;

    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();
    const { integracao, localLockMap } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.listarEkeys({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      pageNo,
      pageSize
    });

    const list = Array.isArray(apiResult?.list) ? apiResult.list : [];
    const enriched = list
      .filter((item) => localLockMap.size === 0 || localLockMap.has(String(item.lockId)))
      .map((item) => {
        const localLock = localLockMap.get(String(item.lockId));
        return {
          ...item,
          quarto_id: localLock?.quarto_id ?? null,
          roomLabel: localLock?.alias || localLock?.nome || localLock?.quarto_id || null,
          receiver: item.receiverUsername || item.username || null
        };
      });

    return res.json({
      sucesso: true,
      list: enriched,
      pageNo: apiResult?.pageNo ?? Number(pageNo),
      pageSize: apiResult?.pageSize ?? Number(pageSize),
      total: apiResult?.total ?? enriched.length
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function enviarEkeyApi(req, res) {
  try {
    const {
      hotel_id,
      lockId,
      receiverUsername,
      keyName,
      startDate,
      endDate,
      remoteEnable = 1,
      createUser = 1
    } = req.body;

    if (!hotel_id || !lockId || !receiverUsername || !keyName || !startDate || !endDate) {
      return res.status(400).json({ erro: "hotel_id, lockId, receiverUsername, keyName, startDate e endDate sao obrigatorios" });
    }

    const pool = await getPool();
    const { integracao } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.enviarEkey({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId,
      receiverUsername,
      keyName,
      startDate,
      endDate,
      remoteEnable,
      createUser
    });

    return res.json({ sucesso: !apiResult?.errcode, api: apiResult, keyId: apiResult?.keyId ?? null });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function revogarEkeyApi(req, res) {
  try {
    const { hotel_id, keyId } = req.body;

    if (!hotel_id || !keyId) {
      return res.status(400).json({ erro: "hotel_id e keyId sao obrigatorios" });
    }

    const pool = await getPool();
    const { integracao } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.apagarEkey({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      keyId
    });

    return res.json({ sucesso: !apiResult?.errcode, api: apiResult });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function alterarPeriodoEkeyApi(req, res) {
  try {
    const { hotel_id, keyId, startDate, endDate } = req.body;

    if (!hotel_id || !keyId || !startDate || !endDate) {
      return res.status(400).json({ erro: "hotel_id, keyId, startDate e endDate sao obrigatorios" });
    }

    const pool = await getPool();
    const { integracao } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.alterarPeriodoEkey({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      keyId,
      startDate,
      endDate
    });

    return res.json({ sucesso: !apiResult?.errcode, api: apiResult });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function listarCartoesApi(req, res) {
  try {
    const { hotel_id, lockId, pageNo = 1, pageSize = 100 } = req.query;

    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();
    const { integracao, localLocks, localLockMap } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const targetLocks = lockId
      ? localLocks.filter((item) => String(item.lock_id) === String(lockId))
      : localLocks;

    const apiResults = await Promise.all(
      targetLocks.map(async (lock) => {
        const payload = await TTLockService.listarCartoes({
          clientId: integracao.client_id,
          accessToken: integracao.access_token,
          lockId: lock.lock_id,
          pageNo,
          pageSize
        });

        const list = Array.isArray(payload?.list) ? payload.list : [];
        return list.map((card) => ({
          ...card,
          quarto_id: lock.quarto_id,
          roomLabel: lock.alias || lock.nome || lock.quarto_id || null,
          lockAlias: lock.alias || null
        }));
      })
    );

    const cards = apiResults.flat();
    return res.json({
      sucesso: true,
      list: cards.filter((item) => !lockId || localLockMap.has(String(item.lockId))),
      pageNo: Number(pageNo),
      pageSize: Number(pageSize),
      total: cards.length
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function adicionarCartaoApi(req, res) {
  try {
    const { hotel_id, lockId, cardNumber, cardName, startDate, endDate, addType = 2 } = req.body;

    if (!hotel_id || !lockId || !cardNumber || !cardName || !startDate || !endDate) {
      return res.status(400).json({ erro: "hotel_id, lockId, cardNumber, cardName, startDate e endDate sao obrigatorios" });
    }

    const pool = await getPool();
    const { integracao } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.adicionarCartao({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId,
      cardNumber,
      cardName,
      startDate,
      endDate,
      addType
    });

    return res.json({ sucesso: !apiResult?.errcode, api: apiResult, cardId: apiResult?.cardId ?? null });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function alterarPeriodoCartaoApi(req, res) {
  try {
    const { hotel_id, lockId, cardId, startDate, endDate, changeType = 2 } = req.body;

    if (!hotel_id || !lockId || !cardId || !startDate || !endDate) {
      return res.status(400).json({ erro: "hotel_id, lockId, cardId, startDate e endDate sao obrigatorios" });
    }

    const pool = await getPool();
    const { integracao } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.alterarPeriodoCartao({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId,
      cardId,
      startDate,
      endDate,
      changeType
    });

    return res.json({ sucesso: !apiResult?.errcode, api: apiResult });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function revogarCartaoApi(req, res) {
  try {
    const { hotel_id, lockId, cardId, deleteType = 2 } = req.body;

    if (!hotel_id || !lockId || !cardId) {
      return res.status(400).json({ erro: "hotel_id, lockId e cardId sao obrigatorios" });
    }

    const pool = await getPool();
    const { integracao } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.apagarCartao({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId,
      cardId,
      deleteType
    });

    return res.json({ sucesso: !apiResult?.errcode, api: apiResult });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function listarRegistrosAcesso(req, res) {
  try {
    const { hotel_id, lockId, startDate = 0, endDate = 0, pageNo = 1, pageSize = 100 } = req.query;

    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();
    const { integracao, localLocks, localLockMap } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const targetLocks = lockId
      ? localLocks.filter((item) => String(item.lock_id) === String(lockId))
      : localLocks;

    const apiResults = await Promise.all(
      targetLocks.map(async (lock) => {
        const payload = await TTLockService.listarRegistrosFechadura({
          clientId: integracao.client_id,
          accessToken: integracao.access_token,
          lockId: lock.lock_id,
          startDate,
          endDate,
          pageNo,
          pageSize
        });

        const list = Array.isArray(payload?.list) ? payload.list : [];
        return list.map((record) => ({
          ...enrichAccessRecord(record),
          roomLabel: lock.alias || lock.nome || lock.quarto_id || null,
          quarto_id: lock.quarto_id
        }));
      })
    );

    const records = apiResults.flat()
      .filter((item) => !lockId || localLockMap.has(String(item.lockId)))
      .sort((first, second) => Number(second.serverDate || second.lockDate || 0) - Number(first.serverDate || first.lockDate || 0));

    return res.json({
      sucesso: true,
      list: records,
      pageNo: Number(pageNo),
      pageSize: Number(pageSize),
      total: records.length
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function consultarBateriaFechadura(req, res) {
  try {
    const { lockId } = req.params;
    const { hotel_id } = req.query;

    if (!hotel_id || !lockId) {
      return res.status(400).json({ erro: "hotel_id e lockId sao obrigatorios" });
    }

    const pool = await getPool();
    const { integracao } = await getClassicCodeContext(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.consultarBateria({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId
    });

    return res.json({
      sucesso: !apiResult?.errcode,
      electricQuantity: apiResult?.electricQuantity ?? null,
      api: apiResult
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function salvarCredenciais(req, res) {
  try {
    const {
      hotel_id,
      nome,
      ativa,
      api_base,
      client_id,
      client_secret,
      account,
      password,
      access_token,
      refresh_token,
      token_type,
      token_expira_em
    } = req.body;

    if (!hotel_id || !nome) {
      return res.status(400).json({ erro: "hotel_id e nome sao obrigatorios" });
    }

    const pool = await getPool();

    if (ativa) {
      await pool.request()
        .input("hotel_id", sql.Int, hotel_id)
        .query(`
          UPDATE integracao
          SET ativa = 0, updated_at = GETDATE()
          WHERE hotel_id = @hotel_id
        `);
    }

    await pool.request()
      .input("hotel_id", sql.Int, hotel_id)
      .input("nome", sql.VarChar, nome)
      .input("ativa", sql.Bit, !!ativa)
      .input("api_base", sql.VarChar, api_base || null)
      .input("client_id", sql.VarChar, client_id || null)
      .input("client_secret", sql.VarChar, client_secret || null)
      .input("account", sql.VarChar, account || null)
      .input("password", sql.VarChar, password || null)
      .input("access_token", sql.NVarChar, access_token || null)
      .input("refresh_token", sql.NVarChar, refresh_token || null)
      .input("token_type", sql.VarChar, token_type || null)
      .input("token_expira_em", sql.DateTime, token_expira_em || null)
      .query(`
        MERGE integracao AS alvo
        USING (SELECT @hotel_id hotel_id, @nome nome) AS origem
        ON alvo.hotel_id = origem.hotel_id AND alvo.nome = origem.nome
        WHEN MATCHED THEN
          UPDATE SET
            ativa = @ativa,
            api_base = @api_base,
            client_id = @client_id,
            client_secret = @client_secret,
            account = @account,
            password = @password,
            access_token = @access_token,
            refresh_token = @refresh_token,
            token_type = @token_type,
            token_expira_em = @token_expira_em,
            updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (
            hotel_id, nome, ativa, api_base, client_id, client_secret,
            account, password, access_token, refresh_token, token_type, token_expira_em
          )
          VALUES (
            @hotel_id, @nome, @ativa, @api_base, @client_id, @client_secret,
            @account, @password, @access_token, @refresh_token, @token_type, @token_expira_em
          );
      `);

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function gerarTokenClassicCode(req, res) {
  try {
    const { hotel_id, client_id, client_secret, account, password, api_base } = req.body || {};

    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();
    const integracao = await getClassicCodeAtiva(pool, hotel_id);

    const resolvedConfig = {
      hotel_id: Number(hotel_id),
      api_base: api_base || integracao?.api_base || "https://euapi.sciener.com/v3",
      client_id: client_id || integracao?.client_id || "",
      client_secret: client_secret || integracao?.client_secret || "",
      account: account || integracao?.account || "",
      password: password || integracao?.password || ""
    };

    ensureClassicCodeAuthConfig(resolvedConfig);

    const tokenResult = await TTLockService.gerarTokenAcesso({
      clientId: resolvedConfig.client_id,
      clientSecret: resolvedConfig.client_secret,
      username: resolvedConfig.account,
      password: resolvedConfig.password,
      apiBase: resolvedConfig.api_base
    });

    if (!tokenResult?.access_token) {
      return res.status(400).json({
        erro: tokenResult?.errmsg || "Erro ao gerar token TTLock",
        detalhe: tokenResult
      });
    }

    const expiresInSeconds = Number(tokenResult?.expires_in || 0);
    const tokenExpiraEm = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : null;

    await persistClassicCodeCredentials(pool, {
      ...resolvedConfig,
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token || null,
      token_type: tokenResult.token_type || null,
      token_expira_em: tokenExpiraEm
    });

    return res.json({ sucesso: true, dados: tokenResult });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function testarConexaoClassicCode(req, res) {
  try {
    const { hotel_id } = req.body || req.query || {};

    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();
    const integracao = await getClassicCodeAtiva(pool, Number(hotel_id));
    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.listarFechaduras({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      pageNo: 1,
      pageSize: 1,
      apiBase: integracao.api_base
    });

    if (apiResult?.errcode && Number(apiResult.errcode) !== 0) {
      return res.status(400).json({
        erro: apiResult?.errmsg || "Erro ao testar conexao TTLock",
        detalhe: apiResult
      });
    }

    return res.json({
      sucesso: true,
      mensagem: "Conexao com a TTLock validada com sucesso",
      dados: {
        total: Number(apiResult?.total || apiResult?.list?.length || 0),
        api: apiResult
      }
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function listarIntegracoes(req, res) {
  try {
    const { hotel_id } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input("hotel_id", sql.Int, hotel_id)
      .query(`
        SELECT id, hotel_id, nome, ativa, api_base, client_id, client_secret,
               account, password, access_token, refresh_token, token_type, token_expira_em
        FROM integracao
        WHERE hotel_id = @hotel_id
        ORDER BY nome
      `);

    return res.json(result.recordset);
  } catch (error) {
    console.error("ERRO listarIntegracoes:", error);

    return res.status(500).json({
      erro: error?.message ? String(error.message) : "Erro interno",
      detalhe: error?.originalError || error?.precedingErrors || error
    });
  }
}

async function salvarFechadura(req, res) {
  try {
    const {
      integracao_id,
      hotel_id,
      quarto_id,
      lock_id,
      nome,
      alias,
      mac,
      andar_nome,
      gateway_conectado,
      bateria,
      dados_json
    } = req.body;

    if (!integracao_id || !hotel_id || !lock_id) {
      return res.status(400).json({ erro: "integracao_id, hotel_id e lock_id sao obrigatorios" });
    }

    const pool = await getPool();

    await pool.request()
      .input("integracao_id", sql.Int, integracao_id)
      .input("hotel_id", sql.Int, hotel_id)
      .input("quarto_id", sql.Int, quarto_id || null)
      .input("lock_id", sql.VarChar, String(lock_id))
      .input("nome", sql.VarChar, nome || null)
      .input("alias", sql.VarChar, alias || null)
      .input("mac", sql.VarChar, mac || null)
      .input("andar_nome", sql.VarChar, andar_nome || null)
      .input("gateway_conectado", sql.Bit, gateway_conectado ?? null)
      .input("bateria", sql.Int, bateria ?? null)
      .input("dados_json", sql.NVarChar, dados_json ? JSON.stringify(dados_json) : null)
      .query(`
        MERGE integracao_fechadura AS alvo
        USING (SELECT @hotel_id hotel_id, @lock_id lock_id) AS origem
        ON alvo.hotel_id = origem.hotel_id AND alvo.lock_id = origem.lock_id
        WHEN MATCHED THEN
          UPDATE SET
            integracao_id = @integracao_id,
            quarto_id = @quarto_id,
            nome = @nome,
            alias = @alias,
            mac = @mac,
            andar_nome = @andar_nome,
            gateway_conectado = @gateway_conectado,
            bateria = @bateria,
            dados_json = @dados_json,
            updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (
            integracao_id, hotel_id, quarto_id, lock_id, nome, alias, mac,
            andar_nome, gateway_conectado, bateria, dados_json
          )
          VALUES (
            @integracao_id, @hotel_id, @quarto_id, @lock_id, @nome, @alias, @mac,
            @andar_nome, @gateway_conectado, @bateria, @dados_json
          );
      `);

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function vincularFechaduraQuarto(req, res) {
  try {
    const { fechadura_id, quarto_id } = req.body;

    const pool = await getPool();

    await pool.request()
      .input("fechadura_id", sql.Int, fechadura_id)
      .input("quarto_id", sql.Int, quarto_id)
      .query(`
        UPDATE integracao_fechadura
        SET quarto_id = @quarto_id, updated_at = GETDATE()
        WHERE id = @fechadura_id
      `);

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function desvincularFechaduraQuarto(req, res) {
  try {
    const { fechadura_id } = req.body;

    if (!fechadura_id) {
      return res.status(400).json({ erro: "fechadura_id e obrigatorio" });
    }

    const pool = await getPool();

    await pool.request()
      .input("fechadura_id", sql.Int, fechadura_id)
      .query(`
        UPDATE integracao_fechadura
        SET quarto_id = NULL, updated_at = GETDATE()
        WHERE id = @fechadura_id
      `);

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function limparMapeamentosHotel(req, res) {
  try {
    const { hotel_id } = req.body;

    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("hotel_id", sql.Int, hotel_id)
      .query(`
        UPDATE integracao_fechadura
        SET quarto_id = NULL, updated_at = GETDATE()
        WHERE hotel_id = @hotel_id
          AND quarto_id IS NOT NULL
      `);

    const total = result.rowsAffected?.[0] ?? 0;

    return res.json({ sucesso: true, total_limpos: total });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function salvarSenhaReserva(req, res) {
  try {
    const {
      reserva_id,
      quarto_id,
      fechadura_id,
      lock_id,
      senha_id,
      nome,
      senha,
      inicio,
      fim,
      dados_json
    } = req.body;

    const pool = await getPool();

    const integracaoAtiva = await pool.request()
      .input("quarto_id", sql.Int, quarto_id)
      .query(`
        SELECT TOP 1 i.nome
        FROM integracao i
        INNER JOIN integracao_fechadura f ON f.integracao_id = i.id
        WHERE f.quarto_id = @quarto_id
          AND i.ativa = 1
      `);

    const appAtivo = integracaoAtiva.recordset[0]?.nome;

    if (appAtivo !== "classic_code") {
      return res.json({
        sucesso: false,
        mensagem: "Senha de reserva so deve ser persistida quando Classic Code estiver ativo."
      });
    }

    await pool.request()
      .input("reserva_id", sql.UniqueIdentifier, reserva_id)
      .input("quarto_id", sql.Int, quarto_id)
      .input("fechadura_id", sql.Int, fechadura_id)
      .input("lock_id", sql.VarChar, String(lock_id))
      .input("senha_id", sql.VarChar, senha_id || null)
      .input("nome", sql.VarChar, nome || null)
      .input("senha", sql.VarChar, senha || null)
      .input("inicio", sql.DateTime, inicio)
      .input("fim", sql.DateTime, fim)
      .input("dados_json", sql.NVarChar, dados_json ? JSON.stringify(dados_json) : null)
      .query(`
        INSERT INTO integracao_senha_reserva
        (reserva_id, quarto_id, fechadura_id, lock_id, senha_id, nome, senha, inicio, fim, dados_json)
        VALUES
        (@reserva_id, @quarto_id, @fechadura_id, @lock_id, @senha_id, @nome, @senha, @inicio, @fim, @dados_json)
      `);

    return res.json({ sucesso: true });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function sincronizarFechaduras(req, res) {
  const { hotel_id } = req.body;

  try {
    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();
    const integracao = await getClassicCodeAtiva(pool, hotel_id);

    if (!integracao) {
      return res.status(400).json({ erro: "Classic Code nao esta ativo para este hotel" });
    }

    ensureClassicCodeCredentials(integracao);

    const apiResult = await TTLockService.listarFechaduras({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      pageNo: 1,
      pageSize: 100
    });

    const fechaduras = apiResult.list || [];

    for (const item of fechaduras) {
      await pool.request()
        .input("integracao_id", sql.Int, integracao.id)
        .input("hotel_id", sql.Int, hotel_id)
        .input("lock_id", sql.VarChar, String(item.lockId))
        .input("nome", sql.VarChar, item.lockName || null)
        .input("alias", sql.VarChar, item.lockAlias || null)
        .input("mac", sql.VarChar, item.lockMac || null)
        .input("andar_nome", sql.VarChar, item.floorName || null)
        .input("gateway_conectado", sql.Bit, item.hasGateway === 1)
        .input("bateria", sql.Int, item.electricQuantity ?? null)
        .input("dados_json", sql.NVarChar, JSON.stringify(item))
        .query(`
          MERGE integracao_fechadura AS alvo
          USING (SELECT @hotel_id hotel_id, @lock_id lock_id) AS origem
          ON alvo.hotel_id = origem.hotel_id AND alvo.lock_id = origem.lock_id
          WHEN MATCHED THEN
            UPDATE SET
              integracao_id = @integracao_id,
              nome = @nome,
              alias = @alias,
              mac = @mac,
              andar_nome = @andar_nome,
              gateway_conectado = @gateway_conectado,
              bateria = @bateria,
              dados_json = @dados_json,
              updated_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (
              integracao_id, hotel_id, lock_id, nome, alias, mac,
              andar_nome, gateway_conectado, bateria, dados_json
            )
            VALUES (
              @integracao_id, @hotel_id, @lock_id, @nome, @alias, @mac,
              @andar_nome, @gateway_conectado, @bateria, @dados_json
            );
        `);
    }

    await salvarHistoricoSync(pool, {
      hotel_id,
      integracao_id: integracao.id,
      tipo: "LOCK_SYNC",
      mensagem: "Fechaduras sincronizadas com sucesso",
      total: fechaduras.length,
      sucesso: true,
      dados_json: apiResult
    });

    return res.json({
      sucesso: true,
      totalLocks: fechaduras.length,
      totalApi: apiResult.total || fechaduras.length
    });
  } catch (error) {
    try {
      const pool = await getPool();
      const integracao = hotel_id ? await getClassicCodeAtiva(pool, hotel_id) : null;

      if (integracao) {
        await salvarHistoricoSync(pool, {
          hotel_id,
          integracao_id: integracao.id,
          tipo: "LOCK_SYNC",
          mensagem: "Erro ao sincronizar fechaduras",
          total: 0,
          sucesso: false,
          erro: error.message
        });
      }
    } catch (_) {}

    return res.status(500).json({ erro: error.message });
  }
}

async function criarSenhaReserva(req, res) {
  try {
    const {
      hotel_id,
      reserva_id,
      quarto_id,
      keyboardPwd,
      keyboardPwdName,
      startDate,
      endDate
    } = req.body;

    if (!hotel_id || !quarto_id || !keyboardPwd || !startDate || !endDate) {
      return res.status(400).json({
        erro: "hotel_id, quarto_id, keyboardPwd, startDate e endDate sao obrigatorios"
      });
    }

    const pool = await getPool();
    const integracao = await getClassicCodeAtiva(pool, hotel_id);

    if (!integracao) {
      return res.status(400).json({ erro: "Classic Code nao esta ativo para este hotel" });
    }

    ensureClassicCodeCredentials(integracao);

    const fechaduraResult = await pool.request()
      .input("hotel_id", sql.Int, hotel_id)
      .input("quarto_id", sql.Int, quarto_id)
      .query(`
        SELECT TOP 1 *
        FROM integracao_fechadura
        WHERE hotel_id = @hotel_id
          AND quarto_id = @quarto_id
          AND ativa = 1
      `);

    const fechadura = fechaduraResult.recordset[0];

    if (!fechadura) {
      return res.status(404).json({ erro: "Nenhuma fechadura vinculada a este quarto" });
    }

    const reserva = await localizarReservaParaSenha(pool, {
      reserva_id,
      quarto_id,
      startDate,
      endDate
    });

    if (!reserva?.id) {
      return res.status(400).json({
        erro: "Nenhuma reserva valida encontrada para este quarto no periodo informado"
      });
    }

    const apiResult = await TTLockService.criarSenha({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId: fechadura.lock_id,
      keyboardPwd,
      keyboardPwdName: keyboardPwdName || `Reserva ${reserva.id}`,
      startDate,
      endDate
    });

    const senhaCriadaComSucesso =
      apiResult &&
      typeof apiResult === "object" &&
      !Array.isArray(apiResult) &&
      Number(apiResult.errcode || 0) === 0 &&
      apiResult.keyboardPwdId;

    if (!senhaCriadaComSucesso) {
      return res.status(400).json({
        erro: "Erro ao criar senha na TTLock",
        detalhe: apiResult
      });
    }

    await pool.request()
      .input("reserva_id", sql.UniqueIdentifier, reserva.id)
      .input("quarto_id", sql.Int, quarto_id)
      .input("fechadura_id", sql.Int, fechadura.id)
      .input("lock_id", sql.VarChar, String(fechadura.lock_id))
      .input("senha_id", sql.VarChar, apiResult.keyboardPwdId ? String(apiResult.keyboardPwdId) : null)
      .input("nome", sql.VarChar, keyboardPwdName || `Reserva ${reserva.id}`)
      .input("senha", sql.VarChar, String(keyboardPwd))
      .input("inicio", sql.DateTime, new Date(Number(startDate)))
      .input("fim", sql.DateTime, new Date(Number(endDate)))
      .input("dados_json", sql.NVarChar, JSON.stringify(apiResult))
      .query(`
        INSERT INTO integracao_senha_reserva
        (reserva_id, quarto_id, fechadura_id, lock_id, senha_id, nome, senha, inicio, fim, status, dados_json)
        VALUES
        (@reserva_id, @quarto_id, @fechadura_id, @lock_id, @senha_id, @nome, @senha, @inicio, @fim, 'ativa', @dados_json)
      `);

    return res.json({
      sucesso: true,
      keyboardPwdId: apiResult.keyboardPwdId,
      lockId: fechadura.lock_id,
      api: apiResult
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ erro: error.message });
  }
}

async function invalidarSenhaReserva(req, res) {
  try {
    const { hotel_id, reserva_id, senha_id } = req.body;

    if (!hotel_id || (!reserva_id && !senha_id)) {
      return res.status(400).json({
        erro: "hotel_id e reserva_id ou senha_id sao obrigatorios"
      });
    }

    const pool = await getPool();
    const integracao = await getClassicCodeAtiva(pool, hotel_id);

    if (!integracao) {
      return res.status(400).json({ erro: "Classic Code nao esta ativo para este hotel" });
    }

    const senhaResult = await pool.request()
      .input("reserva_id", sql.UniqueIdentifier, reserva_id || null)
      .input("senha_id", sql.VarChar, senha_id ? String(senha_id) : null)
      .query(`
        SELECT TOP 1 *
        FROM integracao_senha_reserva
        WHERE status = 'ativa'
          AND (
            (@reserva_id IS NOT NULL AND reserva_id = @reserva_id)
            OR
            (@senha_id IS NOT NULL AND (
              id = TRY_CONVERT(INT, @senha_id)
              OR senha_id = @senha_id
            ))
          )
        ORDER BY id DESC
      `);

    const senhaReserva = senhaResult.recordset[0];

    if (!senhaReserva) {
      return res.status(404).json({ erro: "Senha ativa nao encontrada" });
    }

    const apiResult = await TTLockService.apagarSenha({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId: senhaReserva.lock_id,
      keyboardPwdId: senhaReserva.senha_id
    });

    if (apiResult.errcode && apiResult.errcode !== 0) {
      return res.status(400).json({
        erro: "Erro ao invalidar senha na TTLock",
        detalhe: apiResult
      });
    }

    await pool.request()
      .input("id", sql.Int, senhaReserva.id)
      .input("dados_json", sql.NVarChar, JSON.stringify(apiResult))
      .query(`
        UPDATE integracao_senha_reserva
        SET status = 'invalidada',
            invalidada_em = GETDATE(),
            dados_json = @dados_json
        WHERE id = @id
      `);

    return res.json({
      sucesso: true,
      api: apiResult
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function listarSenhasBanco(req, res) {
  try {
    const { hotel_id, lockId, quarto_id, reserva_id } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input("hotel_id", sql.Int, hotel_id || null)
      .input("lockId", sql.VarChar, lockId ? String(lockId) : null)
      .input("quarto_id", sql.Int, quarto_id || null)
      .input("reserva_id", sql.UniqueIdentifier, reserva_id || null)
      .query(`
        SELECT
          s.*,
          f.nome AS fechadura_nome,
          f.alias AS fechadura_alias
        FROM integracao_senha_reserva s
        LEFT JOIN integracao_fechadura f ON f.id = s.fechadura_id
        WHERE
          (@hotel_id IS NULL OR f.hotel_id = @hotel_id)
          AND (@lockId IS NULL OR s.lock_id = @lockId)
          AND (@quarto_id IS NULL OR s.quarto_id = @quarto_id)
          AND (@reserva_id IS NULL OR s.reserva_id = @reserva_id)
        ORDER BY s.id DESC
      `);

    return res.json({
      sucesso: true,
      list: result.recordset
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function listarSenhasApi(req, res) {
  try {
    const { lockId } = req.params;
    const { hotel_id, pageNo = 1, pageSize = 100 } = req.query;

    if (!hotel_id || !lockId) {
      return res.status(400).json({ erro: "hotel_id e lockId sao obrigatorios" });
    }

    const pool = await getPool();
    const integracao = await getClassicCodeAtiva(pool, hotel_id);

    if (!integracao) {
      return res.status(400).json({ erro: "Classic Code nao esta ativo para este hotel" });
    }

    const apiResult = await TTLockService.listarSenhasApi({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId,
      pageNo,
      pageSize
    });

    return res.json({
      sucesso: true,
      api: apiResult
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function historicoSincronizacao(req, res) {
  try {
    const { hotel_id } = req.query;

    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("hotel_id", sql.Int, hotel_id)
      .query(`
        SELECT TOP 100 *
        FROM integracao_sync_historico
        WHERE hotel_id = @hotel_id
        ORDER BY id DESC
      `);

    return res.json({
      sucesso: true,
      list: result.recordset
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function abrirPorta(req, res) {
  try {
    const { lockId } = req.params;
    const { hotel_id } = req.body;

    if (!hotel_id || !lockId) {
      return res.status(400).json({ erro: "hotel_id e lockId sao obrigatorios" });
    }

    const pool = await getPool();
    const integracao = await getClassicCodeAtiva(pool, hotel_id);

    if (!integracao) {
      return res.status(400).json({ erro: "Classic Code nao esta ativo para este hotel" });
    }

    const apiResult = await TTLockService.abrirPorta({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId
    });

    return res.json({
      sucesso: apiResult.errcode === 0 || !apiResult.errcode,
      api: apiResult
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function travarPorta(req, res) {
  try {
    const { lockId } = req.params;
    const { hotel_id } = req.body;

    if (!hotel_id || !lockId) {
      return res.status(400).json({ erro: "hotel_id e lockId sao obrigatorios" });
    }

    const pool = await getPool();
    const integracao = await getClassicCodeAtiva(pool, hotel_id);

    if (!integracao) {
      return res.status(400).json({ erro: "Classic Code nao esta ativo para este hotel" });
    }

    const apiResult = await TTLockService.travarPorta({
      clientId: integracao.client_id,
      accessToken: integracao.access_token,
      lockId
    });

    return res.json({
      sucesso: apiResult.errcode === 0 || !apiResult.errcode,
      api: apiResult
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
}

async function listarFechadurasBanco(req, res) {
  try {
    const { hotel_id, quarto_id, somente_vinculadas } = req.query;

    if (!hotel_id) {
      return res.status(400).json({ erro: "hotel_id e obrigatorio" });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("hotel_id", sql.Int, hotel_id)
      .input("quarto_id", sql.Int, quarto_id || null)
      .input("somente_vinculadas", sql.Bit, somente_vinculadas === "true")
      .query(`
        SELECT
          f.id,
          f.integracao_id,
          f.hotel_id,
          f.quarto_id,
          f.lock_id,
          f.nome,
          f.alias,
          f.mac,
          f.andar_nome,
          f.gateway_conectado,
          f.bateria,
          f.ativa,
          f.created_at,
          f.updated_at,
          s.id AS senha_reserva_id,
          s.reserva_id,
          s.senha_id,
          s.nome AS senha_nome,
          s.senha,
          s.inicio,
          s.fim,
          s.status AS senha_status
        FROM integracao_fechadura f
        LEFT JOIN integracao_senha_reserva s
          ON s.fechadura_id = f.id
          AND s.status = 'ativa'
        WHERE f.hotel_id = @hotel_id
          AND (@quarto_id IS NULL OR f.quarto_id = @quarto_id)
          AND (@somente_vinculadas = 0 OR f.quarto_id IS NOT NULL)
        ORDER BY f.id DESC
      `);

    return res.json({
      sucesso: true,
      list: result.recordset
    });
  } catch (error) {
    return res.status(500).json({
      erro: error?.message ? String(error.message) : "Erro interno",
      detalhe: error?.originalError || error
    });
  }
}

async function detalharFechadura(req, res) {
  try {
    const { lockId } = req.params;
    const { hotel_id } = req.query;

    if (!hotel_id || !lockId) {
      return res.status(400).json({ erro: "hotel_id e lockId sao obrigatorios" });
    }

    const pool = await getPool();
    const integracao = await requireClassicCode(pool, Number(hotel_id));

    const result = await pool.request()
      .input("hotel_id", sql.Int, hotel_id)
      .input("lock_id", sql.VarChar, String(lockId))
      .query(`
        SELECT TOP 1
          f.id,
          f.integracao_id,
          f.hotel_id,
          f.quarto_id,
          f.lock_id,
          f.nome,
          f.alias,
          f.mac,
          f.andar_nome,
          f.gateway_conectado,
          f.bateria,
          f.dados_json,
          f.ativa,
          f.created_at,
          f.updated_at,
          s.id AS senha_reserva_id,
          s.reserva_id,
          s.senha_id,
          s.nome AS senha_nome,
          s.senha,
          s.inicio,
          s.fim,
          s.status AS senha_status,
          s.invalidada_em
        FROM integracao_fechadura f
        LEFT JOIN integracao_senha_reserva s
          ON s.fechadura_id = f.id
          AND s.status = 'ativa'
        WHERE f.hotel_id = @hotel_id
          AND f.lock_id = @lock_id
        ORDER BY s.id DESC
      `);

    const fechadura = result.recordset[0];

    if (!fechadura) {
      return res.status(404).json({ erro: "Fechadura nao encontrada" });
    }

    const [liveLocks, livePasswords, liveEkeys, liveCards, liveRecords, liveBattery] = await Promise.all([
      TTLockService.listarFechaduras({
        clientId: integracao.client_id,
        accessToken: integracao.access_token,
        pageNo: 1,
        pageSize: 100
      }),
      TTLockService.listarSenhasApi({
        clientId: integracao.client_id,
        accessToken: integracao.access_token,
        lockId,
        pageNo: 1,
        pageSize: 100
      }),
      TTLockService.listarEkeys({
        clientId: integracao.client_id,
        accessToken: integracao.access_token,
        pageNo: 1,
        pageSize: 100
      }),
      TTLockService.listarCartoes({
        clientId: integracao.client_id,
        accessToken: integracao.access_token,
        lockId,
        pageNo: 1,
        pageSize: 100
      }),
      TTLockService.listarRegistrosFechadura({
        clientId: integracao.client_id,
        accessToken: integracao.access_token,
        lockId,
        pageNo: 1,
        pageSize: 100
      }),
      TTLockService.consultarBateria({
        clientId: integracao.client_id,
        accessToken: integracao.access_token,
        lockId
      })
    ]);

    const localLock = fechadura;
    const liveLock = normalizeApiList(liveLocks).find((item) => String(item.lockId) === String(lockId)) || null;
    const lock = mergeLockData(liveLock, localLock);
    const passwords = normalizeApiList(livePasswords);
    const ekeys = normalizeApiList(liveEkeys).filter((item) => String(item.lockId) === String(lockId));
    const cards = normalizeApiList(liveCards);
    const records = normalizeApiList(liveRecords).map((item) => enrichAccessRecord(item));

    return res.json({
      sucesso: true,
      lock: {
        ...lock,
        electricQuantity: liveBattery?.electricQuantity ?? lock.electricQuantity,
        batteryApi: liveBattery
      },
      passwords,
      ekeys,
      cards,
      records,
      local: {
        quarto_id: localLock.quarto_id,
        senha_reserva_id: localLock.senha_reserva_id,
        reserva_id: localLock.reserva_id
      }
    });
  } catch (error) {
    return res.status(500).json({
      erro: error?.message ? String(error.message) : "Erro interno",
      detalhe: error?.originalError || error
    });
  }
}

export {
  salvarCredenciais,
  gerarTokenClassicCode,
  testarConexaoClassicCode,
  listarIntegracoes,
  listarEkeysApi,
  enviarEkeyApi,
  revogarEkeyApi,
  alterarPeriodoEkeyApi,
  salvarFechadura,
  vincularFechaduraQuarto,
  desvincularFechaduraQuarto,
  limparMapeamentosHotel,
  salvarSenhaReserva,
  sincronizarFechaduras,
  criarSenhaReserva,
  invalidarSenhaReserva,
  listarSenhasBanco,
  listarSenhasApi,
  listarCartoesApi,
  adicionarCartaoApi,
  alterarPeriodoCartaoApi,
  revogarCartaoApi,
  listarRegistrosAcesso,
  consultarBateriaFechadura,
  historicoSincronizacao,
  listarFechadurasBanco,
  detalharFechadura,
  abrirPorta,
  travarPorta
};
