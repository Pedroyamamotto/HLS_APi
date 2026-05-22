/**
 * Mock do Serviço Yamamotto para Testes
 * Simula as respostas da API sem depender de conectividade externa
 */

let operacoesSimuladas = new Map();

// Simular operações em progresso
function gerarOperationId() {
  return `mock-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mock: Emitir cartão (Check-in)
 */
export async function emitirCartaoCheckinMock({ numeroQuarto, dataCheckin, dataCheckout, requestId }) {
  const operationId = gerarOperationId();
  
  // Simular processamento
  operacoesSimuladas.set(operationId, {
    status: 'accepted',
    tipo: 'issue',
    quarto: numeroQuarto,
    requestId,
    criadoEm: new Date(),
  });

  // Simular que após 2s muda para "processing"
  setTimeout(() => {
    if (operacoesSimuladas.has(operationId)) {
      operacoesSimuladas.get(operationId).status = 'processing';
    }
  }, 1000);

  // Simular que após 4s completa
  setTimeout(() => {
    if (operacoesSimuladas.has(operationId)) {
      operacoesSimuladas.get(operationId).status = 'completed';
      operacoesSimuladas.get(operationId).cardSnr = `CARD-${Math.random().toString().substr(2, 8)}`;
    }
  }, 3000);

  return {
    operationId,
    status: 'accepted',
    requestId,
  };
}

/**
 * Mock: Invalidar cartão (Checkout)
 */
export async function invalidarCartaoCheckoutMock({ numeroQuarto, tempoEspera = 5000, requestId }) {
  const operationId = gerarOperationId();
  
  operacoesSimuladas.set(operationId, {
    status: 'accepted',
    tipo: 'checkout',
    quarto: numeroQuarto,
    requestId,
    criadoEm: new Date(),
  });

  setTimeout(() => {
    if (operacoesSimuladas.has(operationId)) {
      operacoesSimuladas.get(operationId).status = 'processing';
    }
  }, 1500);

  setTimeout(() => {
    if (operacoesSimuladas.has(operationId)) {
      operacoesSimuladas.get(operationId).status = 'completed';
    }
  }, 3500);

  return {
    operationId,
    status: 'accepted',
    requestId,
  };
}

/**
 * Mock: Estender validade (Extend)
 */
export async function estenderValidadeCartaoMock({ numeroQuarto, dataCheckin, dataCheckout, requestId }) {
  const operationId = gerarOperationId();
  
  operacoesSimuladas.set(operationId, {
    status: 'accepted',
    tipo: 'extend',
    quarto: numeroQuarto,
    requestId,
    criadoEm: new Date(),
  });

  setTimeout(() => {
    if (operacoesSimuladas.has(operationId)) {
      operacoesSimuladas.get(operationId).status = 'processing';
    }
  }, 1000);

  setTimeout(() => {
    if (operacoesSimuladas.has(operationId)) {
      operacoesSimuladas.get(operationId).status = 'completed';
      operacoesSimuladas.get(operationId).cardSnr = `CARD-${Math.random().toString().substr(2, 8)}`;
    }
  }, 3000);

  return {
    operationId,
    status: 'accepted',
    requestId,
  };
}

/**
 * Mock: Consultar status
 */
export async function consultarStatusOperacaoMock(operationId) {
  const operacao = operacoesSimuladas.get(operationId);
  
  if (!operacao) {
    return {
      operationId,
      status: 'failed',
      cardSnr: null,
    };
  }

  return {
    operationId,
    status: operacao.status,
    cardSnr: operacao.cardSnr || null,
  };
}

/**
 * Limpar operações simuladas
 */
export function limparOperacoesMock() {
  operacoesSimuladas.clear();
}

export default {
  emitirCartaoCheckinMock,
  invalidarCartaoCheckoutMock,
  estenderValidadeCartaoMock,
  consultarStatusOperacaoMock,
  limparOperacoesMock,
};
