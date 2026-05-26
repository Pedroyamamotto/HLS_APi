import express from 'express';
import multer from 'multer';
import { uploadImagemPerfil } from '../middlewares/uploadImagemPerfil.js';
import {
  createHotel,
  getHotel,
  linkHotelToLisensa,
  listHotels,
  removeHotel,
  updateHotel,
  getPolitica,
  createPolitica,
  updatePolitica,
  deletePolitica,
  listRefeicoes,
  createRefeicao,
  updateRefeicao,
  deleteRefeicao,
  markRefeicaoPresence,
  getPoliciesTiming,
  savePoliciesTiming,
  getCardEncoderIntegration,
  saveCardEncoderIntegration,
} from '../controllers/Controller_Hotel/hotelController.js';

const router = express.Router();
const upload = multer();
const uploadHotelImagem = uploadImagemPerfil.fields([
  { name: 'imagemHotel', maxCount: 1 },
  { name: 'foto', maxCount: 1 },
  { name: 'imagem', maxCount: 1 },
  { name: 'arquivo', maxCount: 1 },
]);

// Hotel CRUD
router.get('/', listHotels);
router.post('/', uploadHotelImagem, createHotel);
router.get('/:id', getHotel);
router.patch('/:id', uploadHotelImagem, updateHotel);
router.delete('/:id', removeHotel);
router.post('/:id/vincular-lisensa', upload.none(), linkHotelToLisensa);

// Política do hotel
router.get('/:id/politica', getPolitica);
router.post('/:id/politica', upload.none(), createPolitica);
router.patch('/:id/politica', upload.none(), updatePolitica);
router.delete('/:id/politica', deletePolitica);

// Refeições por hotel
router.get('/:id/refeicoes', listRefeicoes);
router.post('/:id/refeicoes', upload.none(), createRefeicao);
router.patch('/:id/refeicoes/:refeicaoId', upload.none(), updateRefeicao);
router.delete('/:id/refeicoes/:refeicaoId', deleteRefeicao);
router.post('/:id/refeicoes/:refeicaoId/presenca', upload.none(), markRefeicaoPresence);
router.post('/:id/refeicoes/:refeicaoId/presensa', upload.none(), markRefeicaoPresence);

// Payload unificado para a tela Policies & Timing
router.get('/:id/policies-timing', getPoliciesTiming);
router.put('/:id/policies-timing', savePoliciesTiming);

// Configuração da integração com gravador de cartão (Card Encoder)
router.get('/:id/integracoes/card-encoder', getCardEncoderIntegration);
router.patch('/:id/integracoes/card-encoder', upload.none(), saveCardEncoderIntegration);

export default router;