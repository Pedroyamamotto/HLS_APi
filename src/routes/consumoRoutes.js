import express from 'express';
import multer from 'multer';
import {
  deleteLancamentoConsumo,
  getCatalogoConsumo,
  getHospedesConsumo,
  getResumoHospedeConsumo,
  getValorHospedeConsumo,
  postLancamentoConsumo,
} from '../controllers/Controller_Consumo/consumoController.js';

const router = express.Router({ mergeParams: true });
const upload = multer();

router.use((req, res, next) => {
  // Evita respostas 304 em endpoints de consumo para a UI sempre receber payload fresco.
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

router.get('/catalogo', getCatalogoConsumo);
router.get('/hospedes', getHospedesConsumo);
router.get('/hospedes/:hospedeId/resumo', getResumoHospedeConsumo);
router.get('/hospedes/:hospedeId/valor', getValorHospedeConsumo);
router.post('/lancamentos', upload.none(), postLancamentoConsumo);
router.delete('/lancamentos/:lancamentoId', deleteLancamentoConsumo);

export default router;
