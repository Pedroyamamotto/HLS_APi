import axios from "axios";

const DEFAULT_API_BASE = "https://euapi.sciener.com/v3";

function now() {
  return Date.now();
}

function normalizeApiBase(apiBase = DEFAULT_API_BASE) {
  const normalized = String(apiBase || DEFAULT_API_BASE).trim().replace(/\/+$/, "");
  return normalized || DEFAULT_API_BASE;
}

function resolveRestBaseUrl(apiBase = DEFAULT_API_BASE) {
  const normalized = normalizeApiBase(apiBase);
  return /\/v\d+$/i.test(normalized) ? normalized : `${normalized}/v3`;
}

function resolveOauthBaseUrl(apiBase = DEFAULT_API_BASE) {
  return normalizeApiBase(apiBase).replace(/\/v\d+$/i, "");
}

function extractHtmlErrorMessage(payload) {
  if (typeof payload !== "string") return null;

  const titleMatch = payload.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]?.trim()) return titleMatch[1].trim();

  const messageMatch = payload.match(/<p><b>message<\/b>\s*<u>([^<]*)<\/u><\/p>/i);
  if (messageMatch?.[1]?.trim()) return messageMatch[1].trim();

  const headingMatch = payload.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (headingMatch?.[1]?.trim()) return headingMatch[1].trim();

  return null;
}

function normalizeRemoteErrorPayload(payload, statusCode, fallbackMessage) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    return {
      errcode: statusCode || -1,
      errmsg: extractHtmlErrorMessage(payload) || fallbackMessage,
      raw: payload
    };
  }

  return {
    errcode: statusCode || -1,
    errmsg: fallbackMessage,
    raw: payload ?? null
  };
}

async function postForm(endpoint, data, options = {}) {
  const body = new URLSearchParams();

  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      body.append(key, data[key]);
    }
  });

  try {
    const response = await axios.post(`${resolveRestBaseUrl(options.apiBase)}${endpoint}`, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    return response.data;
  } catch (error) {
    if (error?.response?.data) {
      return normalizeRemoteErrorPayload(
        error.response.data,
        error.response.status,
        "Falha ao comunicar com a TTLock"
      );
    }

    const requestError = new Error(error?.message || "Falha ao comunicar com a TTLock");
    requestError.statusCode = error?.response?.status || 500;
    throw requestError;
  }
}

async function gerarTokenAcesso({ clientId, clientSecret, username, password, apiBase }) {
  const body = new URLSearchParams({
    clientId,
    clientSecret,
    username,
    password,
    grant_type: "password"
  });

  try {
    const response = await axios.post(`${resolveOauthBaseUrl(apiBase)}/oauth2/token`, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    return response.data;
  } catch (error) {
    if (error?.response?.data) {
      return normalizeRemoteErrorPayload(
        error.response.data,
        error.response.status,
        "Falha ao gerar token da TTLock"
      );
    }

    const requestError = new Error(error?.message || "Falha ao gerar token da TTLock");
    requestError.statusCode = error?.response?.status || 500;
    throw requestError;
  }
}

async function listarFechaduras({ clientId, accessToken, pageNo = 1, pageSize = 100, apiBase }) {
  return postForm("/lock/listByHotel", {
    clientId,
    accessToken,
    pageNo,
    pageSize,
    date: now()
  }, { apiBase });
}

async function listarEkeys({ clientId, accessToken, pageNo = 1, pageSize = 100 }) {
  return postForm("/key/list", {
    clientId,
    accessToken,
    pageNo,
    pageSize,
    date: now()
  });
}

async function enviarEkey({
  clientId,
  accessToken,
  lockId,
  receiverUsername,
  keyName,
  startDate,
  endDate,
  remoteEnable = 1,
  createUser = 1
}) {
  return postForm("/key/send", {
    clientId,
    accessToken,
    lockId,
    receiverUsername,
    keyName,
    startDate,
    endDate,
    remoteEnable,
    createUser,
    date: now()
  });
}

async function apagarEkey({ clientId, accessToken, keyId }) {
  return postForm("/key/delete", {
    clientId,
    accessToken,
    keyId,
    date: now()
  });
}

async function alterarPeriodoEkey({ clientId, accessToken, keyId, startDate, endDate }) {
  return postForm("/key/changePeriod", {
    clientId,
    accessToken,
    keyId,
    startDate,
    endDate,
    date: now()
  });
}

async function criarSenha({ clientId, accessToken, lockId, keyboardPwd, keyboardPwdName, startDate, endDate }) {
  return postForm("/keyboardPwd/add", {
    clientId,
    accessToken,
    lockId,
    keyboardPwd,
    keyboardPwdName,
    startDate,
    endDate,
    addType: 2,
    date: now()
  });
}

async function apagarSenha({ clientId, accessToken, lockId, keyboardPwdId }) {
  return postForm("/keyboardPwd/delete", {
    clientId,
    accessToken,
    lockId,
    keyboardPwdId,
    deleteType: 2,
    date: now()
  });
}

async function listarSenhasApi({ clientId, accessToken, lockId, pageNo = 1, pageSize = 100 }) {
  return postForm("/lock/listKeyboardPwd", {
    clientId,
    accessToken,
    lockId,
    pageNo,
    pageSize,
    date: now()
  });
}

async function listarCartoes({ clientId, accessToken, lockId, pageNo = 1, pageSize = 100 }) {
  return postForm("/identityCard/list", {
    clientId,
    accessToken,
    lockId,
    pageNo,
    pageSize,
    date: now()
  });
}

async function adicionarCartao({ clientId, accessToken, lockId, cardNumber, cardName, startDate, endDate, addType = 2 }) {
  return postForm("/identityCard/addForReversedCardNumber", {
    clientId,
    accessToken,
    lockId,
    cardNumber,
    cardName,
    startDate,
    endDate,
    addType,
    date: now()
  });
}

async function alterarPeriodoCartao({ clientId, accessToken, lockId, cardId, startDate, endDate, changeType = 2 }) {
  return postForm("/identityCard/changePeriod", {
    clientId,
    accessToken,
    lockId,
    cardId,
    startDate,
    endDate,
    changeType,
    date: now()
  });
}

async function apagarCartao({ clientId, accessToken, lockId, cardId, deleteType = 2 }) {
  return postForm("/identityCard/delete", {
    clientId,
    accessToken,
    lockId,
    cardId,
    deleteType,
    date: now()
  });
}

async function listarRegistrosFechadura({ clientId, accessToken, lockId, startDate = 0, endDate = 0, pageNo = 1, pageSize = 100 }) {
  return postForm("/lockRecord/list", {
    clientId,
    accessToken,
    lockId,
    startDate,
    endDate,
    pageNo,
    pageSize,
    date: now()
  });
}

async function consultarBateria({ clientId, accessToken, lockId }) {
  return postForm("/lock/queryElectricQuantity", {
    clientId,
    accessToken,
    lockId,
    date: now()
  });
}

async function abrirPorta({ clientId, accessToken, lockId }) {
  return postForm("/lock/unlock", {
    clientId,
    accessToken,
    lockId,
    date: now()
  });
}

async function travarPorta({ clientId, accessToken, lockId }) {
  return postForm("/lock/lock", {
    clientId,
    accessToken,
    lockId,
    date: now()
  });
}

export {
  gerarTokenAcesso,
  listarFechaduras,
  listarEkeys,
  enviarEkey,
  apagarEkey,
  alterarPeriodoEkey,
  criarSenha,
  apagarSenha,
  listarSenhasApi,
  listarCartoes,
  adicionarCartao,
  alterarPeriodoCartao,
  apagarCartao,
  listarRegistrosFechadura,
  consultarBateria,
  abrirPorta,
  travarPorta
};