import express from 'express';
import multer from 'multer';
import {
  liberarQuartoCheckin,
  invalidarQuartoCheckout,
  recadastrarCartaoQuarto,
  estenderCartaoQuarto,
  consultarStatusQuarto,
  listarOperacoesReserva,
  emitirCartaoAdicionalQuarto,
  lerCartaoQuarto,
  registrarCartaoPerdidoQuarto,
  atualizarSnrOperacao,
  agenteBuscarProxima,
  agenteHeartbeat,
  agenteEnviarResultado,
} from '../controllers/Controller_Reserva/liberarQuartoController.js';

const router = express.Router({ mergeParams: true });
const upload = multer();

/**
 * POST /hotel/:hotelId/liberar-quarto/issue
 * Emite cartão RFID (Check-in)
 */
router.post('/issue', upload.none(), liberarQuartoCheckin);

/**
 * POST /hotel/:hotelId/liberar-quarto/checkout
 * Invalida cartão RFID (Checkout)
 */
router.post('/checkout', upload.none(), invalidarQuartoCheckout);

/**
 * POST /hotel/:hotelId/liberar-quarto/recadastro
 * Segunda via: invalida cartão antigo e emite novo cartão
 */
router.post('/recadastro', upload.none(), recadastrarCartaoQuarto);

/**
 * POST /hotel/:hotelId/liberar-quarto/extend
 * Estende validade do cartão (Extensão de estadia)
 */
router.post('/extend', upload.none(), estenderCartaoQuarto);

/**
 * POST /hotel/:hotelId/liberar-quarto/additional
 * Emite cartão adicional sem invalidar os anteriores
 */
router.post('/additional', upload.none(), emitirCartaoAdicionalQuarto);

/**
 * POST /hotel/:hotelId/liberar-quarto/read-card
 * Solicita leitura do cartão no encoder
 * Resultado final disponível via GET /status/:operationId
 */
router.post('/read-card', upload.none(), lerCartaoQuarto);

/**
 * POST /hotel/:hotelId/liberar-quarto/lost-card
 * Fluxo de perda de cartão: invalida anterior e reemite novo
 */
router.post('/lost-card', upload.none(), registrarCartaoPerdidoQuarto);

/**
 * GET /hotel/:hotelId/liberar-quarto/status/:operationId
 * Consulta status completo de uma operação específica
 * (operationId, requestId, type, status, message, cardSnr, room, createdAtUtc, updatedAtUtc)
 */
router.get('/status/:operationId', consultarStatusQuarto);

/**
 * PATCH /hotel/:hotelId/liberar-quarto/status/:operationId/cardsnr
 * Atualiza o SNR do cartão manualmente
 */
router.patch('/status/:operationId/cardsnr', upload.none(), atualizarSnrOperacao);

/**
 * GET /hotel/:hotelId/liberar-quarto/reserva/:reservaId
 * Lista todas as operações de liberar quarto de uma reserva
 */
router.get('/reserva/:reservaId', listarOperacoesReserva);

// ─── Rotas do Agente ──────────────────────────────────────────────────────────

/**
 * GET /hotel/:hotelId/liberar-quarto/agent/next
 * Busca a próxima operação pendente para o agente
 * Query: agentId (opcional, usa env YAMAMOTTO_AGENT_ID como padrão)
 */
router.get('/agent/next', agenteBuscarProxima);

/**
 * POST /hotel/:hotelId/liberar-quarto/agent/heartbeat
 * Registra o agente como online
 */
router.post('/agent/heartbeat', upload.none(), agenteHeartbeat);

/**
 * POST /hotel/:hotelId/liberar-quarto/agent/:operationId/result
 * Envia o resultado da operação executada pelo agente
 */
router.post('/agent/:operationId/result', upload.none(), agenteEnviarResultado);

export default router;
