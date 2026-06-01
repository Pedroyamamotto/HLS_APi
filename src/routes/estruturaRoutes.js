import express from 'express';
import multer from 'multer';
import { uploadImagemPerfil } from '../middlewares/uploadImagemPerfil.js';

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

const uploadCategoriaImagem = uploadImagemPerfil.fields([
  { name: 'imagemCategoria', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'foto', maxCount: 1 },
  { name: 'imagem', maxCount: 1 },
  { name: 'arquivo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

const uploadQuartoImagem = uploadImagemPerfil.fields([
  { name: 'imagemQuarto', maxCount: 1 },
  { name: 'foto', maxCount: 1 },
  { name: 'imagem', maxCount: 1 },
  { name: 'arquivo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

router.get('/arquitetura', getArquiteturaHotel);

router.get('/andares', listAndares);
router.post('/andares', upload.none(), createAndar);
router.get('/andares/:andarId', getAndar);
router.patch('/andares/:andarId', upload.none(), updateAndar);
router.delete('/andares/:andarId', removeAndar);

router.get('/categorias-quarto', listCategorias);
router.post('/categorias-quarto', uploadCategoriaImagem, createCategoria);
router.get('/categorias-quarto/:categoriaId', getCategoria);
router.patch('/categorias-quarto/:categoriaId', uploadCategoriaImagem, updateCategoria);
router.delete('/categorias-quarto/:categoriaId', removeCategoria);

router.get('/quartos', listQuartos);
router.post('/quartos', uploadQuartoImagem, createQuarto);
router.get('/quartos/:quartoId', getQuarto);
router.patch('/quartos/:quartoId', uploadQuartoImagem, updateQuarto);
router.delete('/quartos/:quartoId', removeQuarto);

export default router;