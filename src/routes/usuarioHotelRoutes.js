import express from 'express';
import { autenticarToken } from '../middlewares/authMiddleware.js';
import { uploadImagemPerfil } from '../middlewares/uploadImagemPerfil.js';
import {
  listUsers,
  getUser,
  updateUser,
  removeUser,
  getSecurityMatrix,
  updateRolePermissions,
} from '../controllers/usuarioHotelController.js';

const router = express.Router({ mergeParams: true });

// Todas as rotas exigem autenticação
router.use(autenticarToken);

// ── Security Matrix (rotas estáticas ANTES de /:userId) ───────────────────────
// GET   /hotel/:hotelId/users/security-matrix
// PATCH /hotel/:hotelId/users/security-matrix/roles/:roleId

router.get('/security-matrix',                 getSecurityMatrix);
router.patch('/security-matrix/roles/:roleId', updateRolePermissions);

// ── Usuários do hotel ──────────────────────────────────────────────────────────
// GET    /hotel/:hotelId/users
// GET    /hotel/:hotelId/users/:userId
// PATCH  /hotel/:hotelId/users/:userId
// DELETE /hotel/:hotelId/users/:userId

router.get('/',           listUsers);
router.get('/:userId',    getUser);
router.patch('/:userId', uploadImagemPerfil.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'avatar', maxCount: 1 },
  { name: 'imagem', maxCount: 1 },
  { name: 'arquivo', maxCount: 1 },
  { name: 'imagemPerfil', maxCount: 1 },
]), updateUser);
router.patch('/:userId/imagem-perfil', uploadImagemPerfil.single('imagemPerfil'), updateUser);
router.delete('/:userId', removeUser);

export default router;
