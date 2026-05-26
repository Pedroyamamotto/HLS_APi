import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const extensao = path.extname(file.originalname || '').toLowerCase();
    const nomeBase = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${nomeBase}${extensao}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Apenas imagens sao permitidas'));
  }

  cb(null, true);
}

export const uploadImagemPerfil = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
