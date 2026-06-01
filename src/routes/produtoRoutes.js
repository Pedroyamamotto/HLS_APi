import express from 'express';
import { uploadImagemPerfil } from '../middlewares/uploadImagemPerfil.js';
import {
  createProduto,
  getProduto,
  listProdutos,
  removeProduto,
  updateProduto,
} from '../controllers/Controller_Produto/produtoController.js';

const router = express.Router();
const uploadProdutoImagem = uploadImagemPerfil.fields([
  { name: 'imagemProduto', maxCount: 1 },
  { name: 'foto', maxCount: 1 },
  { name: 'imagem', maxCount: 1 },
  { name: 'arquivo', maxCount: 1 },
]);

router.get('/', listProdutos);
router.post('/', uploadProdutoImagem, createProduto);
router.get('/:produtoId', getProduto);
router.patch('/:produtoId', uploadProdutoImagem, updateProduto);
router.delete('/:produtoId', removeProduto);

export default router;
