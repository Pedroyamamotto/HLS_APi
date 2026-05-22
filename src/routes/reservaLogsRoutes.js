import express from 'express';
import {
  getLogsQuarto,
  getLogsReserva,
} from '../controllers/Controller_Reserva/reservaLogsController.js';

const router = express.Router({ mergeParams: true });

router.get('/reservas/:reservaId/logs', getLogsReserva);
router.get('/quartos/:quartoId/logs-reserva', getLogsQuarto);

export default router;