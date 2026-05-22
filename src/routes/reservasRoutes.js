import express from 'express';
import multer from 'multer';
import {
  getReserva,
  listReservas,
  updateReserva,
  deleteReserva,
  getReservasByGuest,
  updateReservaStatus,
} from '../controllers/Controller_Reserva/reservasController.js';

const router = express.Router();
const upload = multer();

// Listagem global de reservas
router.get('/', listReservas);

// Reservas por hóspede
router.get('/hospede/:hospedeId', getReservasByGuest);

// Atualizar status (antes de /:id para não conflitar)
router.patch('/:id/status', upload.none(), updateReservaStatus);

// Reserva por ID
router.get('/:id', getReserva);
router.patch('/:id', upload.none(), updateReserva);
router.delete('/:id', deleteReserva);

export default router;
