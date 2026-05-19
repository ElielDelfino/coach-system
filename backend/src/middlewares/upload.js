const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const s3 = require('../config/s3');

const LIMITE_IMAGEM = 15 * 1024 * 1024;   // 15MB — fotos de progresso, thumbs, alimentos
const LIMITE_VIDEO  = 500 * 1024 * 1024;  // 500MB — vídeos de exercícios

const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const TIPOS_VIDEO  = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

function criarUpload({ pasta, tipos, limite }) {
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_S3_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.bin';
        cb(null, `${pasta}/${uuidv4()}${ext}`);
      },
    }),
    limits: { fileSize: limite },
    fileFilter: (req, file, cb) => {
      if (tipos.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de arquivo não permitido. Permitidos: ${tipos.join(', ')}`));
      }
    },
  });
}

function wrapUpload(uploadFn) {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Arquivo muito grande. Verifique o limite permitido.' });
      }
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
}

const uploadFotoAluno    = criarUpload({ pasta: 'alunos/fotos',       tipos: TIPOS_IMAGEM, limite: LIMITE_IMAGEM }).single('foto');
const uploadThumbExerc   = criarUpload({ pasta: 'exercicios/thumbs',  tipos: TIPOS_IMAGEM, limite: LIMITE_IMAGEM }).single('thumbnail');
const uploadVideoExerc   = criarUpload({ pasta: 'exercicios/videos',  tipos: TIPOS_VIDEO,  limite: LIMITE_VIDEO  }).single('video');
const uploadFotoAlimento = criarUpload({ pasta: 'alimentos/fotos',    tipos: TIPOS_IMAGEM, limite: LIMITE_IMAGEM }).single('foto');

module.exports = {
  uploadFotoAluno:    wrapUpload(uploadFotoAluno),
  uploadThumbExerc:   wrapUpload(uploadThumbExerc),
  uploadVideoExerc:   wrapUpload(uploadVideoExerc),
  uploadFotoAlimento: wrapUpload(uploadFotoAlimento),
};
