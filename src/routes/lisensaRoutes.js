import express from 'express';
import multer from 'multer';
import { createLisensa } from '../controllers/Controller_LIsensa/CreatLIsensa.js';
import { editLisensa } from '../controllers/Controller_LIsensa/EditarLisensa.js';
import { authLisensa } from '../controllers/Controller_LIsensa/athLIsensa.js';
import { deleteLisensa } from '../controllers/Controller_LIsensa/DeletLIsensa.js';
import {
	bindHotelToLisensa,
	getHotelsByLisensa,
	getLisensaDetails,
} from '../controllers/Controller_LIsensa/GetLisensa.js';

const router = express.Router();
const upload = multer();

router.post('/', upload.none(), createLisensa);
router.post('/vincular-hotel', upload.none(), bindHotelToLisensa);
router.get('/:numeroLicensa/hoteis', getHotelsByLisensa);
router.patch('/:id', upload.none(), editLisensa);
router.post('/autenticar', upload.none(), authLisensa);
router.get('/:numeroLicensa', getLisensaDetails);
router.delete('/:id', deleteLisensa);

export default router;
