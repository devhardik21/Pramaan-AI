const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIME_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25) * 1024 * 1024;

const buildStorage = (subfolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(
        process.cwd(),
        process.env.UPLOAD_DIR || './uploads',
        subfolder
      );
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = ALLOWED_MIME_TYPES[file.mimetype] || path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error('Unsupported file type. Allowed: PDF, JPEG, PNG'), {
        code: 'UNSUPPORTED_FILE_TYPE',
      }),
      false
    );
  }
};

const documentUpload = multer({
  storage: buildStorage('documents'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

const evidenceUpload = multer({
  storage: buildStorage('evidence'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

const regulatoryUpload = multer({
  storage: buildStorage('regulatory'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for regulatory docs
  fileFilter,
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 25}MB`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err && err.code === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

module.exports = { documentUpload, evidenceUpload, regulatoryUpload, handleUploadError };
