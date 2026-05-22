import express from 'express';
import multer from 'multer';
import { criarChave } from '../controllers/chekingController.js';

const router = express.Router();
const upload = multer();

// POST /cheking/config/Chave
router.post('/config/Chave', upload.none(), criarChave);

export default router;
