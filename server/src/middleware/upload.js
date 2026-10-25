// Multer Upload Middleware for Samanvitha
// Memory storage adapter handles both local disk and Cloudinary transparently.
// - Verification Documents: Restricted to PDF, PNG, JPG, JPEG (max 5MB, strictly PRIVATE).
// - Donation Photos: Restricted to JPG, PNG, WebP (max 5MB, public delivery).

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DOCUMENTS_DIR } = require('../services/storage/storageAdapter.js');

// Ensure local directory exists
const UPLOAD_DIR = DOCUMENTS_DIR;
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Memory storage holds files in memory up to the 5MB limit
// preventing write pollution on Render's ephemeral disk.
const memoryStorage = multer.memoryStorage();

// File filter for verification documents
const documentFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Verification documents must be PDF or image files (PNG, JPG, JPEG).'
      ),
      false
    );
  }
};

// File filter for donation photos
const photoFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Donation photos must be PNG, JPG, or WebP images.'
      ),
      false
    );
  }
};

const upload = multer({
  storage: memoryStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
  },
});

const uploadPhoto = multer({
  storage: memoryStorage,
  fileFilter: photoFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
  },
});

module.exports = {
  upload,
  uploadPhoto,
  UPLOAD_DIR,
};
