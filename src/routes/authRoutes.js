import express from 'express';
import multer from 'multer';
import {
  register,
  auth,
  vercacao,
  reenviaCodigo,
  updateUser,
  changePassword,
  deleteUser,
  recuperarSenhaHandler,
  redefinirSenhaHandler,
} from '../controllers/Controller_Auth/authController.js';
import {
  autenticarToken,
  logout,
} from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer();

router.post('/register', upload.none(), register);
router.post('/login', upload.none(), auth);
router.post('/verificacao', upload.none(), vercacao);
router.post('/vercacao', upload.none(), vercacao);
router.post('/reenviar-codigo', upload.none(), reenviaCodigo);
router.post('/logout', autenticarToken, logout);
router.patch('/usuario', autenticarToken, upload.none(), updateUser);
router.patch('/senha', autenticarToken, upload.none(), changePassword);
router.delete('/usuario', autenticarToken, deleteUser);

/**
 * POST /auth/recuperar-senha - Envia código de recuperação por email (sem token)
 * Body: { Email }
 */
router.post('/recuperar-senha', upload.none(), recuperarSenhaHandler);

/**
 * POST /auth/redefinir-senha - Confirma código e define nova senha (sem token)
 * Body: { Email, Code, NovaSenha }
 */
router.post('/redefinir-senha', upload.none(), redefinirSenhaHandler);

export default router;
