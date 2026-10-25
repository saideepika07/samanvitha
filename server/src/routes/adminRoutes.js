// Admin Routes - Verification Review & Governance
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController.js');
const auth = require('../middleware/auth.js');
const requireRole = require('../middleware/requireRole.js');
const { ROLES } = require('../config/roles.js');

// Protect all admin routes with authentication and Admin role enforcement
router.use(auth);
router.use(requireRole(ROLES.ADMIN));

router.get('/institutions', adminController.getAllInstitutions);
router.get('/institutions/:id', adminController.getInstitutionById);
router.put('/institutions/:id/verification', adminController.updateInstitutionVerification);
router.get('/institutions/:id/audit', adminController.getInstitutionAuditLogs);
router.get('/activity-logs', adminController.getActivityLogs);
router.get('/analytics', adminController.getAnalytics);
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

module.exports = router;
