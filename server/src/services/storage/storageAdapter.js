// Unified Storage Adapter for Samanvitha Community Network
// Drivers: 'local' (development default) | 'cloudinary' (required for production ephemeral disk)
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

// Local upload directories
const UPLOADS_ROOT = path.join(__dirname, '../../../uploads');
const DOCUMENTS_DIR = path.join(UPLOADS_ROOT, 'documents');
const PHOTOS_DIR = path.join(UPLOADS_ROOT, 'photos');

// Ensure local directories exist for local development driver
function ensureLocalDirs() {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }
}

// Verification documents validation (Private)
const ALLOWED_DOC_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_DOC_EXTS = ['.pdf', '.png', '.jpg', '.jpeg'];
const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Donation photos validation (Public)
const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Configure Cloudinary instance if credentials exist
 */
function initCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
    secure: true,
  });
}

/**
 * Validates storage driver and configuration on application boot.
 * Strictly prevents application startup in production with STORAGE_DRIVER=local.
 *
 * @param {Object} [overrideEnv] - Optional env override for unit testing
 */
function validateStorageConfig(overrideEnv = process.env) {
  const nodeEnv = (overrideEnv.NODE_ENV || 'development').toLowerCase();
  const driver = (overrideEnv.STORAGE_DRIVER || 'local').toLowerCase();

  if (nodeEnv === 'production') {
    if (driver === 'local') {
      const errorMsg =
        '\n================================================================================\n' +
        'CRITICAL CONFIGURATION ERROR: Ephemeral Disk Protection Active!\n' +
        '================================================================================\n' +
        "Render's free tier runs on an ephemeral disk: all locally stored files\n" +
        'disappear on redeploy or container restart.\n' +
        'STORAGE_DRIVER=local is STRICTLY FORBIDDEN in production.\n\n' +
        'Please set the following environment variables in your production environment:\n' +
        '  STORAGE_DRIVER=cloudinary\n' +
        '  CLOUDINARY_CLOUD_NAME=<your_cloud_name>\n' +
        '  CLOUDINARY_API_KEY=<your_api_key>\n' +
        '  CLOUDINARY_API_SECRET=<your_api_secret>\n' +
        '================================================================================\n';

      console.error(errorMsg);
      throw new Error(
        'STORAGE_DRIVER=local is forbidden in production on Render ephemeral disk. Configure STORAGE_DRIVER=cloudinary.'
      );
    }

    if (driver === 'cloudinary') {
      const hasCloudName = Boolean(overrideEnv.CLOUDINARY_CLOUD_NAME);
      const hasApiKey = Boolean(overrideEnv.CLOUDINARY_API_KEY);
      const hasApiSecret = Boolean(overrideEnv.CLOUDINARY_API_SECRET);

      if (!hasCloudName || !hasApiKey || !hasApiSecret) {
        throw new Error(
          'STORAGE_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in production.'
        );
      }
    }
  }

  return { driver, nodeEnv };
}

/**
 * Generates a safe, sanitized filename stripped of directory traversal sequences.
 */
function sanitizeFilename(originalName = 'file', customExt = '') {
  const ext = (customExt || path.extname(originalName) || '').toLowerCase();
  const rawBase = path.basename(originalName, ext);
  const cleanBase = rawBase
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 35) || 'upload';
  const uniqueToken = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  return `${cleanBase}-${uniqueToken}${ext}`;
}

/**
 * Uploads a buffer directly to Cloudinary using upload_stream
 */
function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * Storage Adapter Interface
 */
const storageAdapter = {
  getDriver() {
    return (process.env.STORAGE_DRIVER || 'local').toLowerCase();
  },

  /**
   * Save a private institutional verification document (PDF, PNG, JPG).
   * In Cloudinary: Uploaded with type "authenticated" (strictly private, no public URL).
   * In Local: Stored in private documents directory.
   */
  async saveVerificationDocument(file) {
    if (!file) throw new Error('No file provided for upload.');

    // Validate size
    if (file.size > MAX_DOC_SIZE_BYTES) {
      throw new Error('Verification document exceeds maximum size of 5MB.');
    }

    // Validate mime & extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_DOC_MIMES.includes(file.mimetype) || !ALLOWED_DOC_EXTS.includes(ext)) {
      throw new Error('Invalid file type. Verification documents must be PDF, PNG, JPG, or JPEG.');
    }

    const safeFilename = sanitizeFilename(file.originalname, ext);
    const driver = this.getDriver();

    if (driver === 'cloudinary') {
      initCloudinary();
      const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
      if (!buffer) throw new Error('Unable to read document file buffer.');

      const cleanPublicId = path.basename(safeFilename, ext);
      const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';

      // STRICT PRIVATE UPLOAD: type 'authenticated' prevents public unsigned access
      const uploadResult = await uploadBufferToCloudinary(buffer, {
        folder: 'samanvitha/verification_docs',
        type: 'authenticated', // NEVER 'upload' (which would be public)
        resource_type: isPdf ? 'raw' : 'image',
        public_id: cleanPublicId,
      });

      return {
        filename: safeFilename,
        originalName: file.originalname,
        path: uploadResult.secure_url || uploadResult.url,
        publicId: uploadResult.public_id,
        resourceType: uploadResult.resource_type || (isPdf ? 'raw' : 'image'),
        format: uploadResult.format || (isPdf ? 'pdf' : ext.replace('.', '')),
        mimeType: file.mimetype,
        size: file.size,
        storageDriver: 'cloudinary',
        uploadedAt: new Date(),
      };
    }

    // Local Driver
    ensureLocalDirs();
    const destinationPath = path.join(DOCUMENTS_DIR, safeFilename);

    if (file.buffer) {
      fs.writeFileSync(destinationPath, file.buffer);
    } else if (file.path && file.path !== destinationPath) {
      fs.copyFileSync(file.path, destinationPath);
    }

    return {
      filename: safeFilename,
      originalName: file.originalname,
      path: destinationPath,
      mimeType: file.mimetype,
      size: file.size,
      storageDriver: 'local',
      uploadedAt: new Date(),
    };
  },

  /**
   * Retrieves access to a private verification document.
   * Only called after authorization has verified caller is owning institution or admin.
   *
   * For Cloudinary: Generates a short-lived signed URL (e.g. 10 minutes) or download URL.
   * For Local: Returns the local file path for streaming.
   */
  async getPrivateDocumentAccess(doc, { expiresIn = 600 } = {}) {
    if (!doc) throw new Error('Document record is required.');

    const isCloudinary = doc.storageDriver === 'cloudinary' || Boolean(doc.publicId);

    if (isCloudinary) {
      initCloudinary();
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
      const resourceType = doc.resourceType || (doc.mimeType === 'application/pdf' ? 'raw' : 'image');

      // Generate short-lived signed URL for authenticated asset
      let signedUrl = '';
      if (typeof cloudinary.utils.private_download_url === 'function') {
        signedUrl = cloudinary.utils.private_download_url(doc.publicId, doc.format || 'pdf', {
          type: 'authenticated',
          expires_at: expiresAt,
          resource_type: resourceType,
        });
      }

      if (!signedUrl && typeof cloudinary.utils.url === 'function') {
        signedUrl = cloudinary.utils.url(doc.publicId, {
          type: 'authenticated',
          sign_url: true,
          expires_at: expiresAt,
          resource_type: resourceType,
          format: doc.format,
        });
      }

      return {
        type: 'signed_url',
        url: signedUrl,
        expiresAt,
        mimeType: doc.mimeType,
        originalName: doc.originalName,
      };
    }

    // Local file access
    return {
      type: 'local',
      path: path.resolve(doc.path),
      mimeType: doc.mimeType,
      originalName: doc.originalName,
    };
  },

  /**
   * Save a donation photo (Public delivery).
   * Keeps strict type limits (jpg, png, webp), 5MB size limit, and safe filenames.
   */
  async saveDonationPhoto(file) {
    if (!file) throw new Error('No photo provided for upload.');

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      throw new Error('Donation photo exceeds maximum size of 5MB.');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_PHOTO_MIMES.includes(file.mimetype) || !ALLOWED_PHOTO_EXTS.includes(ext)) {
      throw new Error('Invalid file type. Donation photos must be JPG, PNG, or WebP.');
    }

    const safeFilename = sanitizeFilename(file.originalname, ext);
    const driver = this.getDriver();

    if (driver === 'cloudinary') {
      initCloudinary();
      const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
      if (!buffer) throw new Error('Unable to read photo file buffer.');

      const cleanPublicId = path.basename(safeFilename, ext);
      const uploadResult = await uploadBufferToCloudinary(buffer, {
        folder: 'samanvitha/donations',
        type: 'upload', // Standard public delivery
        resource_type: 'image',
        public_id: cleanPublicId,
      });

      return {
        url: uploadResult.secure_url || uploadResult.url,
        publicId: uploadResult.public_id,
        filename: safeFilename,
        mimeType: file.mimetype,
        storageDriver: 'cloudinary',
      };
    }

    // Local Driver
    ensureLocalDirs();
    const destinationPath = path.join(PHOTOS_DIR, safeFilename);

    if (file.buffer) {
      fs.writeFileSync(destinationPath, file.buffer);
    } else if (file.path && file.path !== destinationPath) {
      fs.copyFileSync(file.path, destinationPath);
    }

    return {
      url: `/uploads/photos/${safeFilename}`,
      path: destinationPath,
      filename: safeFilename,
      mimeType: file.mimetype,
      storageDriver: 'local',
    };
  },

  /**
   * Processes a base64 donation photo data URI (e.g. data:image/png;base64,...).
   * Validates type and 5MB size limit, stores safely, and returns the URL.
   */
  async saveDonationPhotoBase64(base64String) {
    if (!base64String || typeof base64String !== 'string') return null;

    // If it's already a regular HTTP(S) URL or /uploads/ path, return as is
    if (/^https?:\/\//i.test(base64String) || /^\/uploads\//i.test(base64String)) {
      return base64String;
    }

    const matches = base64String.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
    if (!matches) {
      // Not a base64 data URI, return as-is
      return base64String;
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];

    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    const ext = mimeToExt[mimeType];
    if (!ext || !ALLOWED_PHOTO_MIMES.includes(mimeType)) {
      throw new Error('Invalid image format in donation photo. Must be JPEG, PNG, or WebP.');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_PHOTO_SIZE_BYTES) {
      throw new Error('Donation photo exceeds 5MB size limit.');
    }

    return this.saveDonationPhoto({
      buffer,
      originalname: `donation_photo${ext}`,
      mimetype: mimeType,
      size: buffer.length,
    });
  },
};

module.exports = {
  storageAdapter,
  validateStorageConfig,
  ensureLocalDirs,
  sanitizeFilename,
  DOCUMENTS_DIR,
  PHOTOS_DIR,
  ALLOWED_DOC_MIMES,
  ALLOWED_DOC_EXTS,
  MAX_DOC_SIZE_BYTES,
  ALLOWED_PHOTO_MIMES,
  ALLOWED_PHOTO_EXTS,
  MAX_PHOTO_SIZE_BYTES,
};
