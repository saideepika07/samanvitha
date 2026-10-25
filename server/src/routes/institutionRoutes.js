// Institution Routes - Profile & Document Uploads
const express = require('express');
const router = express.Router();
const institutionController = require('../controllers/institutionController.js');
const auth = require('../middleware/auth.js');
const requireRole = require('../middleware/requireRole.js');
const { upload } = require('../middleware/upload.js');
const { ROLES } = require('../config/roles.js');

// Current institution profile
router.get('/me', auth, requireRole(ROLES.INSTITUTION), institutionController.getMyInstitution);
router.put('/me', auth, requireRole(ROLES.INSTITUTION), institutionController.updateMyInstitution);

// Upload verification documents (restricted to 5MB, PDF/PNG/JPG)
router.post(
  '/me/documents',
  auth,
  requireRole(ROLES.INSTITUTION),
  upload.single('document'),
  institutionController.uploadDocument
);

// Private document retrieval (Admin or Owning Institution only)
router.get('/:id/documents/:docId', auth, institutionController.getDocument);

module.exports = router;
