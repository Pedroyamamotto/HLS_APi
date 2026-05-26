import express from 'express';
import multer from 'multer';
import {
  createAndar,
  createCategoria,
  createQuarto,
  getAndar,
  getArquiteturaHotel,
  getCategoria,
  getQuarto,
  listAndares,
  listCategorias,
  listQuartos,
  removeAndar,
  removeCategoria,
  removeQuarto,
  updateAndar,
  updateCategoria,
  updateQuarto,
} from '../controllers/Controller_Estrutura/estruturaController.js';

const router = express.Router({ mergeParams: true });
const upload = multer();

router.get('/arquitetura', getArquiteturaHotel);

router.get('/andares', listAndares);
router.post('/andares', upload.none(), createAndar);
router.get('/andares/:andarId', getAndar);
router.patch('/andares/:andarId', upload.none(), updateAndar);
router.delete('/andares/:andarId', removeAndar);

router.get('/categorias-quarto', listCategorias);
router.post('/categorias-quarto', upload.none(), createCategoria);
router.get('/categorias-quarto/:categoriaId', getCategoria);
router.patch('/categorias-quarto/:categoriaId', upload.none(), updateCategoria);
router.delete('/categorias-quarto/:categoriaId', removeCategoria);

router.get('/quartos', listQuartos);
router.post('/quartos', upload.none(), createQuarto);
router.get('/quartos/:quartoId', getQuarto);
router.patch('/quartos/:quartoId', upload.none(), updateQuarto);
router.delete('/quartos/:quartoId', removeQuarto);

export default router;
