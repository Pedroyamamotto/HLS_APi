import express from 'express';
import multer from 'multer';
import {
  createProduto,
  getProduto,
  listProdutos,
  removeProduto,
  updateProduto,
} from '../controllers/Controller_Produto/produtoController.js';

const router = express.Router();
const upload = multer();

router.get('/', listProdutos);
router.post('/', upload.none(), createProduto);
router.get('/:produtoId', getProduto);
router.patch('/:produtoId', upload.none(), updateProduto);
router.delete('/:produtoId', removeProduto);

export default router;