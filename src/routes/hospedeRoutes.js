import express from 'express';
import multer from 'multer';
import {
  createDependente,
  createHospede,
  getHospede,
  listDependentes,
  listRefeicoesParticipadas,
  listHospedes,
  removeDependente,
  removeHospede,
  updateRefeicaoPresenca,
  updateDependente,
  updateHospede,
} from '../controllers/Controller_Hospede/hospedeController.js';

const router = express.Router({ mergeParams: true });
const upload = multer();

router.get('/', listHospedes);
router.post('/', upload.none(), createHospede);
router.get('/:id', getHospede);
router.patch('/:id', upload.none(), updateHospede);
router.delete('/:id', removeHospede);

router.get('/:id/dependentes', listDependentes);
router.post('/:id/dependentes', upload.none(), createDependente);
router.patch('/:id/dependentes/:dependenteId', upload.none(), updateDependente);
router.delete('/:id/dependentes/:dependenteId', removeDependente);

router.get('/:id/refeicoes', listRefeicoesParticipadas);
router.patch('/:id/refeicoes/:pedidoConsumoId', upload.none(), updateRefeicaoPresenca);

export default router;
