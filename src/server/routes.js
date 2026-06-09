import express from 'express';
import multer from 'multer';

import authRoutes from '../routes/authRoutes.js';
import hotelRoutes from '../routes/hotelRoutes.js';
import hospedeRoutes from '../routes/hospedeRoutes.js';
import lisensaRoutes from '../routes/lisensaRoutes.js';
import estruturaRoutes from '../routes/estruturaRoutes.js';
import produtoRoutes from '../routes/produtoRoutes.js';
import usuarioHotelRoutes from '../routes/usuarioHotelRoutes.js';
import reservasRoutes from '../routes/reservasRoutes.js';
import consumoRoutes from '../routes/consumoRoutes.js';
import reservaLogsRoutes from '../routes/reservaLogsRoutes.js';
import integrationsRoutes from '../routes/integrationsRoutes.js';

import {
  listReservasByHotel,
  createReserva,
} from '../controllers/Controller_Reserva/reservasController.js';

import {
  health,
} from '../controllers/Controller_Health/healthController.js';

import {
  verifyPage,
  verifiedPage,
  userNotFoundPage,
  codeVerifyPage,
  emailTemplatePage,
  notFoundPage,
} from '../controllers/Controller_Pages/pagesController.js';

import swaggerDefinition from '../swagger.js';

const router = express.Router();
const upload = multer();

router.get('/swagger-definition', (req, res) => {
  res.json(swaggerDefinition);
});

router.use('/auth', authRoutes);

router.use('/hoteis', hotelRoutes);

router.use('/hotel/:hotelId/hospedes', hospedeRoutes);

router.get('/hotel/:hotelId/reservas', listReservasByHotel);
router.post('/hotel/:hotelId/reservas', upload.none(), createReserva);

router.use('/hotel/:hotelId/consumo', consumoRoutes);

router.use('/reservas', reservasRoutes);

router.use('/hotel/:hotelId', reservaLogsRoutes);
router.use('/hotel/:hotelId/users', usuarioHotelRoutes);

router.use('/hotel/:hotelId', estruturaRoutes);

router.use('/produtos', produtoRoutes);
router.use('/servicos', produtoRoutes);

router.use('/hospedes', (req, res) => {
  return res.status(410).json({
    erro: 'Endpoint descontinuado. Use /hotel/:hotelId/hospedes',
  });
});

router.use('/lisensa', lisensaRoutes);
router.use('/api/integrations', integrationsRoutes);

router.get('/verify', verifyPage);
router.get('/verified', verifiedPage);
router.get('/user-not-found', userNotFoundPage);
router.get('/code-verify', codeVerifyPage);
router.get('/email-template', emailTemplatePage);

router.get('/health', health);

router.use(notFoundPage);

export { router };