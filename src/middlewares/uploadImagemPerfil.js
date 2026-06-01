import multer from 'multer';

function fileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Apenas imagens sao permitidas'));
  }

  cb(null, true);
}

export const uploadImagemPerfil = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
