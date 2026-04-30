const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter
const ALLOWED_FILE_MESSAGE = 'Invalid file type. Upload PDF, DOC, DOCX, JPG, JPEG, or PNG files only.';

const fileFilter = (req, file, cb) => {
  // Allowed file extensions
  const allowedExts = /pdf|doc|docx|jpg|jpeg|png/i;
  const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
  
  // Basic mimetype check (allowing generic octet-stream and msword)
  const allowedMimeTypes = /pdf|msword|wordprocessingml|jpg|jpeg|png|image|octet-stream/i;
  const mimetype = allowedMimeTypes.test(file.mimetype);

  if (extname) {
    return cb(null, true);
  } else {
    const error = new Error(ALLOWED_FILE_MESSAGE);
    error.code = 'INVALID_FILE_TYPE';
    error.statusCode = 400;
    cb(error);
  }
};

// Configure multer for single file upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: fileFilter
});

// Configure multer for multiple file uploads (up to 10 files)
const uploadMultiple = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB per file
    files: 10 // Maximum 10 files
  },
  fileFilter: fileFilter
});

module.exports = {
  multer,
  ALLOWED_FILE_MESSAGE,
  upload,
  uploadMultiple,
  uploadSingle: upload.single.bind(upload),
  uploadArray: uploadMultiple.array.bind(uploadMultiple),
  uploadFields: uploadMultiple.fields.bind(uploadMultiple)
};
