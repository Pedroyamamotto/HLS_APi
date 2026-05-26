import express from 'express';
import authRoutes from '../routes/authRoutes.js';
import hotelRoutes from '../routes/hotelRoutes.js';
import hospedeRoutes from '../routes/hospedeRoutes.js';
import lisensaRoutes from '../routes/lisensaRoutes.js';
import estruturaRoutes from '../routes/estruturaRoutes.js';
import produtoRoutes from '../routes/produtoRoutes.js';
import usuarioHotelRoutes from '../routes/usuarioHotelRoutes.js';
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

// Endpoint de definição Swagger
router.get('/swagger-definition', (req, res) => {
	res.json(swaggerDefinition);
});

// Rotas de autenticação
router.use('/auth', authRoutes);

// Rotas de hotéis
router.use('/hoteis', hotelRoutes);

// Rotas de hóspedes por hotel
router.use('/hotel/:hotelId/hospedes', hospedeRoutes);

// Rotas de usuários por hotel + security matrix
router.use('/hotel/:hotelId/users', usuarioHotelRoutes);

// Rotas de estrutura por hotel (andares, categorias e quartos)
router.use('/hotel/:hotelId', estruturaRoutes);

// Rotas do catálogo de produtos e serviços
router.use('/produtos', produtoRoutes);
router.use('/servicos', produtoRoutes);

// Endpoint legado descontinuado: usar sempre escopo por hotel
router.use('/hospedes', (req, res) => {
	return res.status(410).json({
		erro: 'Endpoint descontinuado. Use /hotel/:hotelId/hospedes',
	});
});

// Rotas de lisensa
router.use('/lisensa', lisensaRoutes);

// Páginas públicas HTML
router.get('/verify', verifyPage);
router.get('/verified', verifiedPage);
router.get('/user-not-found', userNotFoundPage);
router.get('/code-verify', codeVerifyPage);
router.get('/email-template', emailTemplatePage);

// Rota de health check
router.get('/health', health);

// Fallback 404 para navegação no navegador
router.use(notFoundPage);

export { router };
