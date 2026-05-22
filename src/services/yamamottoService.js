import axios from 'axios';

const YAMAMOTTO_BASE_URL = process.env.YAMAMOTTO_BASE_URL || 'https://api-v2.yama.ia.br/';
const YAMAMOTTO_INTEGRATION_KEY = process.env.YAMAMOTTO_INTEGRATION_KEY || process.env.YAMAMOTTO_API_KEY || 'api_key_aqui';
const YAMAMOTTO_AGENT_KEY = process.env.YAMAMOTTO_AGENT_KEY || process.env.YAMAMOTTO_INTEGRATION_KEY || process.env.YAMAMOTTO_API_KEY || 'agent_key_aqui';
const YAMAMOTTO_AGENT_ID = process.env.YAMAMOTTO_AGENT_ID || 'AGENT-DEFAULT';
const YAMAMOTTO_HOTEL_ID = process.env.YAMAMOTTO_HOTEL_ID || 'master';

console.log(`[YAMAMOTTO] Configurado:
  Base URL: ${YAMAMOTTO_BASE_URL}
  Agent ID: ${YAMAMOTTO_AGENT_ID}
  Integration Key: ${YAMAMOTTO_INTEGRATION_KEY.substring(0, 20)}...`);

/**
 * Cliente HTTP para operações públicas (x-api-key)
 */
const yamamottoClient = axios.create({
  baseURL: YAMAMOTTO_BASE_URL,
  headers: {
    'x-api-key': YAMAMOTTO_INTEGRATION_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Cliente HTTP para endpoints do agente (x-agent-key)
 */
const yamamottoAgentClient = axios.create({
  baseURL: YAMAMOTTO_BASE_URL,
  headers: {
    'x-agent-key': YAMAMOTTO_AGENT_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Gera um requestId único para evitar duplicidade
 */
function gerarRequestId(prefixo) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefixo}-${timestamp}-${random}`;
}

/**
 * Emitir cartão RFID (Check-in)
 * Cria uma operação de emissão de cartão para o hóspede
 * 
 * @param {Object} params
 * @param {string} params.numeroQuarto - Número do quarto
 * @param {string} params.dataCheckin - Data/hora de check-in (ISO 8601)
 * @param {string} params.dataCheckout - Data/hora de checkout (ISO 8601)
 * @param {string} params.hotelId - Identificador do hotel esperado pela API externa
 * @param {number} params.waitMs - Tempo de espera em ms para a operação
 * @param {string} params.requestId - ID único da requisição (opcional)
 * @returns {Promise<Object>} { operationId, status }
 */
export async function emitirCartaoCheckin({
  numeroQuarto,
  dataCheckin,
  dataCheckout,
  hotelId = YAMAMOTTO_HOTEL_ID,
  waitMs = 5000,
  requestId,
}) {
  try {
    const id = requestId || gerarRequestId('CHECKIN');
    
    const payload = {
      requestId: id,
      room: String(numeroQuarto),
      checkin: dataCheckin,
      checkout: dataCheckout,
      hotelId,
      waitMs,
    };

    console.log('[YAMAMOTTO] Enviando emissão de cartão (check-in):', payload);

    const resposta = await yamamottoClient.post('/operations/issue', payload);

    console.log('[YAMAMOTTO] Resposta check-in:', resposta.data);

    return {
      operationId: resposta.data.operationId,
      status: resposta.data.status,
      requestId: id,
    };
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro ao emitir cartão:', erro.response?.data || erro.message);
    throw new Error(
      `Falha ao emitir cartão: ${erro.response?.data?.message || erro.message}`
    );
  }
}

/**
 * Invalidar cartão RFID (Checkout)
 * Cancela o acesso do hóspede
 * 
 * @param {Object} params
 * @param {string} params.numeroQuarto - Número do quarto
 * @param {number} params.tempoEspera - Tempo de espera em ms (opcional, padrão 5000)
 * @param {string} params.hotelId - Identificador do hotel esperado pela API externa
 * @param {string} params.requestId - ID único da requisição (opcional)
 * @returns {Promise<Object>} { operationId, status }
 */
export async function invalidarCartaoCheckout({
  numeroQuarto,
  tempoEspera = 5000,
  hotelId = YAMAMOTTO_HOTEL_ID,
  quantidade = 1,
  requestId,
}) {
  try {
    const id = requestId || gerarRequestId('CHECKOUT');
    const quantidadeCartoes = Math.max(1, Number(quantidade || 1) || 1);
    
    const payload = {
      requestId: id,
      room: String(numeroQuarto),
      waitMs: tempoEspera,
      hotelId,
    };

    if (quantidadeCartoes > 0) {
      payload.quantity = quantidadeCartoes;
    }

    console.log('[YAMAMOTTO] Enviando invalidação de cartão (checkout):', payload);

    const resposta = await yamamottoClient.post('/operations/checkout', payload);

    console.log('[YAMAMOTTO] Resposta checkout:', resposta.data);

    return {
      operationId: resposta.data.operationId,
      status: resposta.data.status,
      requestId: id,
      quantity: quantidadeCartoes,
    };
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro ao invalidar cartão:', erro.response?.data || erro.message);
    throw new Error(
      `Falha ao invalidar cartão: ${erro.response?.data?.message || erro.message}`
    );
  }
}

/**
 * Estender validade do cartão RFID (Extend)
 * Prolonga o acesso quando há extensão de estadia
 * 
 * @param {Object} params
 * @param {string} params.numeroQuarto - Número do quarto
 * @param {string} params.dataCheckin - Data/hora original de check-in (ISO 8601)
 * @param {string} params.dataCheckout - Nova data/hora de checkout (ISO 8601)
 * @param {string} params.hotelId - Identificador do hotel esperado pela API externa
 * @param {string} params.requestId - ID único da requisição (opcional)
 * @returns {Promise<Object>} { operationId, status }
 */
export async function estenderValidadeCartao({
  numeroQuarto,
  dataCheckin,
  dataCheckout,
  hotelId = YAMAMOTTO_HOTEL_ID,
  requestId,
}) {
  try {
    const id = requestId || gerarRequestId('EXTEND');
    
    const payload = {
      requestId: id,
      room: String(numeroQuarto),
      checkin: dataCheckin,
      checkout: dataCheckout,
      hotelId,
    };

    console.log('[YAMAMOTTO] Enviando extensão de cartão:', payload);

    const resposta = await yamamottoClient.post('/operations/extend', payload);

    console.log('[YAMAMOTTO] Resposta extend:', resposta.data);

    return {
      operationId: resposta.data.operationId,
      status: resposta.data.status,
      requestId: id,
    };
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro ao estender cartão:', erro.response?.data || erro.message);
    throw new Error(
      `Falha ao estender cartão: ${erro.response?.data?.message || erro.message}`
    );
  }
}

/**
 * Consultar status de uma operação
 * Verifica o progresso de qualquer operação (issue, checkout, extend)
 * 
 * @param {string} operationId - ID da operação
 * @returns {Promise<Object>} { operationId, status, cardSnr? }
 */
export async function consultarStatusOperacao(operationId) {
  try {
    console.log('[YAMAMOTTO] Consultando status de operação:', operationId);

    const resposta = await yamamottoClient.get(`/operations/${operationId}`);

    console.log('[YAMAMOTTO] Status da operação:', resposta.data);

    const d = resposta.data;
    return {
      operationId: d.operationId,
      requestId: d.requestId || null,
      type: d.type || null,
      status: d.status,
      message: d.message || null,
      cardSnr: d.cardSnr || null,
      room: d.room || null,
      createdAtUtc: d.createdAtUtc || null,
      updatedAtUtc: d.updatedAtUtc || null,
    };
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro ao consultar status:', erro.response?.data || erro.message);
    throw new Error(
      `Falha ao consultar operação: ${erro.response?.data?.message || erro.message}`
    );
  }
}

/**
 * Atualizar SNR do cartão manualmente
 * PATCH /operations/{operationId}/cardsnr
 *
 * @param {string} operationId
 * @param {string} cardSnr
 * @returns {Promise<Object>}
 */
export async function atualizarCardSnr(operationId, cardSnr) {
  try {
    console.log('[YAMAMOTTO] Atualizando cardSnr da operação:', operationId, cardSnr);
    const resposta = await yamamottoClient.patch(`/operations/${operationId}/cardsnr`, { cardSnr });
    console.log('[YAMAMOTTO] Resposta atualizarCardSnr:', resposta.data);
    return resposta.data;
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro ao atualizar cardSnr:', erro.response?.data || erro.message);
    throw new Error(`Falha ao atualizar cardSnr: ${erro.response?.data?.message || erro.message}`);
  }
}

/**
 * Emitir cartão adicional (sem invalidar anteriores)
 * POST /operations/additional
 *
 * @param {Object} params
 * @param {string} params.numeroQuarto
 * @param {string} params.dataCheckin
 * @param {string} params.dataCheckout
 * @param {string} params.hotelId
 * @param {number} params.waitMs
 * @param {number} [params.quantidade]
 * @param {string} [params.requestId]
 * @returns {Promise<Object>} { operationId, operationIds?, status, requestId }
 */
export async function emitirCartaoAdicional({
  numeroQuarto,
  dataCheckin,
  dataCheckout,
  hotelId = YAMAMOTTO_HOTEL_ID,
  waitMs = 5000,
  quantidade,
  requestId,
}) {
  try {
    const id = requestId || gerarRequestId('ADDITIONAL');
    const payload = {
      requestId: id,
      room: String(numeroQuarto),
      checkin: dataCheckin,
      checkout: dataCheckout,
      hotelId,
      waitMs,
    };
    if (quantidade && quantidade > 1) payload.quantity = quantidade;

    console.log('[YAMAMOTTO] Enviando cartão adicional:', payload);
    const resposta = await yamamottoClient.post('/operations/additional', payload);
    console.log('[YAMAMOTTO] Resposta additional:', resposta.data);

    return {
      operationId: resposta.data.operationId,
      operationIds: resposta.data.operationIds || null,
      status: resposta.data.status,
      requestId: id,
    };
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro ao emitir cartão adicional:', erro.response?.data || erro.message);
    throw new Error(`Falha ao emitir cartão adicional: ${erro.response?.data?.message || erro.message}`);
  }
}

/**
 * Solicitar leitura de cartão no encoder
 * POST /operations/read-card
 * O resultado final fica disponível em GET /operations/{id}
 *
 * @param {Object} params
 * @param {string} params.hotelId
 * @param {number} params.waitMs
 * @param {string} [params.requestId]
 * @returns {Promise<Object>} { operationId, status, requestId }
 */
export async function solicitarLeituraCartao({
  hotelId = YAMAMOTTO_HOTEL_ID,
  waitMs = 5000,
  requestId,
}) {
  try {
    const id = requestId || gerarRequestId('READCARD');
    const payload = { requestId: id, hotelId, waitMs };

    console.log('[YAMAMOTTO] Solicitando leitura de cartão:', payload);
    const resposta = await yamamottoClient.post('/operations/read-card', payload);
    console.log('[YAMAMOTTO] Resposta read-card:', resposta.data);

    return {
      operationId: resposta.data.operationId,
      status: resposta.data.status,
      requestId: id,
    };
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro ao solicitar leitura:', erro.response?.data || erro.message);
    throw new Error(`Falha ao solicitar leitura de cartão: ${erro.response?.data?.message || erro.message}`);
  }
}

/**
 * Registrar perda de cartão
 * POST /operations/lost-card
 * Fluxo: invalidação do cartão anterior + reemissão
 *
 * @param {Object} params
 * @param {string} params.numeroQuarto
 * @param {string} params.dataCheckin
 * @param {string} params.dataCheckout
 * @param {string} params.hotelId
 * @param {number} params.waitMs
 * @param {string} [params.previousCardSnr]
 * @param {string} [params.requestId]
 * @returns {Promise<Object>} { operationId, operationIds?, status, requestId }
 */
export async function registrarCartaoPerdido({
  numeroQuarto,
  dataCheckin,
  dataCheckout,
  hotelId = YAMAMOTTO_HOTEL_ID,
  waitMs = 5000,
  previousCardSnr,
  requestId,
}) {
  try {
    const id = requestId || gerarRequestId('LOSTCARD');
    const payload = {
      requestId: id,
      room: String(numeroQuarto),
      checkin: dataCheckin,
      checkout: dataCheckout,
      hotelId,
      waitMs,
    };
    if (previousCardSnr) payload.previousCardSnr = previousCardSnr;

    console.log('[YAMAMOTTO] Registrando cartão perdido:', payload);
    const resposta = await yamamottoClient.post('/operations/lost-card', payload);
    console.log('[YAMAMOTTO] Resposta lost-card:', resposta.data);

    return {
      operationId: resposta.data.operationId,
      operationIds: resposta.data.operationIds || null,
      status: resposta.data.status,
      requestId: id,
    };
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro ao registrar cartão perdido:', erro.response?.data || erro.message);
    throw new Error(`Falha ao registrar cartão perdido: ${erro.response?.data?.message || erro.message}`);
  }
}

// ─── Endpoints do Agente ─────────────────────────────────────────────────────

/**
 * Buscar próxima operação pendente para o agente
 * GET /agent/next
 *
 * @param {Object} params
 * @param {string} params.agentId
 * @param {string} params.hotelId
 * @returns {Promise<Object|null>} operação pendente ou null
 */
export async function buscarProximaOperacaoAgente({ agentId, hotelId }) {
  try {
    console.log('[YAMAMOTTO-AGENT] Buscando próxima operação:', { agentId, hotelId });
    const resposta = await yamamottoAgentClient.get('/agent/next', {
      params: { agentId, hotelId },
    });
    console.log('[YAMAMOTTO-AGENT] Próxima operação:', resposta.data);
    return resposta.data || null;
  } catch (erro) {
    if (erro.response?.status === 204 || erro.response?.status === 404) return null;
    console.error('[YAMAMOTTO-AGENT] Erro ao buscar próxima operação:', erro.response?.data || erro.message);
    throw new Error(`Falha ao buscar próxima operação: ${erro.response?.data?.message || erro.message}`);
  }
}

/**
 * Registrar heartbeat do agente
 * POST /agent/heartbeat
 *
 * @param {Object} params
 * @param {string} params.agentId
 * @param {string} params.hotelId
 * @param {string} params.machineName
 * @returns {Promise<Object>}
 */
export async function registrarHeartbeatAgente({ agentId, hotelId, machineName }) {
  try {
    console.log('[YAMAMOTTO-AGENT] Heartbeat:', { agentId, hotelId, machineName });
    const resposta = await yamamottoAgentClient.post('/agent/heartbeat', { agentId, hotelId, machineName });
    console.log('[YAMAMOTTO-AGENT] Resposta heartbeat:', resposta.data);
    return resposta.data;
  } catch (erro) {
    console.error('[YAMAMOTTO-AGENT] Erro no heartbeat:', erro.response?.data || erro.message);
    throw new Error(`Falha no heartbeat do agente: ${erro.response?.data?.message || erro.message}`);
  }
}

/**
 * Enviar resultado de operação executada pelo agente
 * POST /agent/operations/{operationId}/result
 *
 * @param {Object} params
 * @param {string} params.operationId
 * @param {string} params.agentId
 * @param {boolean} params.success
 * @param {string} params.message
 * @param {string} [params.cardSnr]
 * @param {string} [params.room]
 * @param {string} [params.checkin]
 * @param {string} [params.checkout]
 * @returns {Promise<Object>}
 */
export async function enviarResultadoOperacaoAgente({
  operationId,
  agentId,
  success,
  message,
  cardSnr,
  room,
  checkin,
  checkout,
}) {
  try {
    const body = { agentId, success, message };
    if (cardSnr !== undefined) body.cardSnr = cardSnr;
    if (room !== undefined) body.room = room;
    if (checkin !== undefined) body.checkin = checkin;
    if (checkout !== undefined) body.checkout = checkout;

    console.log('[YAMAMOTTO-AGENT] Enviando resultado de operação:', operationId, body);
    const resposta = await yamamottoAgentClient.post(`/agent/operations/${operationId}/result`, body);
    console.log('[YAMAMOTTO-AGENT] Resposta resultado:', resposta.data);
    return resposta.data;
  } catch (erro) {
    console.error('[YAMAMOTTO-AGENT] Erro ao enviar resultado:', erro.response?.data || erro.message);
    throw new Error(`Falha ao enviar resultado da operação: ${erro.response?.data?.message || erro.message}`);
  }
}

export default {
  emitirCartaoCheckin,
  invalidarCartaoCheckout,
  estenderValidadeCartao,
  consultarStatusOperacao,
  atualizarCardSnr,
  emitirCartaoAdicional,
  solicitarLeituraCartao,
  registrarCartaoPerdido,
  buscarProximaOperacaoAgente,
  registrarHeartbeatAgente,
  enviarResultadoOperacaoAgente,
  criarOperacao,
};

export async function criarOperacao(type, payload) {
  try {
    console.log(`[YAMAMOTTO] Criando operacao '${type}' com payload:`, payload);
    const resposta = await yamamottoClient.post(`/operations/${type}`, payload);
    console.log('[YAMAMOTTO] Resposta criarOperacao:', resposta.data);
    return resposta.data;
  } catch (erro) {
    console.error('[YAMAMOTTO] Erro criarOperacao:', erro.response?.data || erro.message);
    throw new Error(`Falha ao criar operação: ${erro.response?.data?.message || erro.message}`);
  }
}
