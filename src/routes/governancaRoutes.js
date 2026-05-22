import express from 'express';
import multer from 'multer';
import {
  criarHistorico,
  getHistoricoQuarto,
  getUltimosEventosQuarto,
  getHistoricoHotel,
  getResumoEventos,
  getChecklistConfig,
  putChecklistConfig,
  deleteChecklistConfig,
  postChecklistSecao,
  postChecklistItem,
} from '../controllers/Controller_Governanca/governancaController.js';

const router = express.Router({ mergeParams: true });
const upload = multer();

// Histórico por quarto
router.post('/quartos/:quartoId/historico-governanca', upload.none(), criarHistorico);
router.get('/quartos/:quartoId/historico-governanca', getHistoricoQuarto);
router.get('/quartos/:quartoId/historico-governanca/ultimos', getUltimosEventosQuarto);

// Histórico geral do hotel
router.get('/historico-governanca',        getHistoricoHotel);
router.get('/historico-governanca/resumo', getResumoEventos);

// Configuração do template de checklist por hotel e tipo
router.get('/checklist-config', getChecklistConfig);
router.put('/checklist-config', upload.none(), putChecklistConfig);
router.delete('/checklist-config', deleteChecklistConfig);
router.post('/checklist-config/secoes', upload.none(), postChecklistSecao);
router.post('/checklist-config/secoes/:secaoId/itens', upload.none(), postChecklistItem);

export default router;
