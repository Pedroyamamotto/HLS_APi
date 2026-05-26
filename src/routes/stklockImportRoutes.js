import express from 'express';
import multer from 'multer';
import {
  getStklockImportStatus,
  startStklockImport,
} from '../controllers/Controller_Importacao/stklockImportController.js';

const router = express.Router({ mergeParams: true });

const upload = multer({
  dest: 'tmp/imports',
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.post('/stklock', upload.single('database'), startStklockImport);
router.get('/stklock/:jobId/status', getStklockImportStatus);

export default router;
