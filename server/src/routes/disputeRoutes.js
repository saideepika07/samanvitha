// Dispute Routes - Delivery Issue Tracking & Admin Reconciliation
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const disputeController = require('../controllers/disputeController.js');
const auth = require('../middleware/auth.js');
const requireRole = require('../middleware/requireRole.js');
const validate = require('../middleware/validate.js');
const { ROLES } = require('../config/roles.js');

const disputeValidation = [
  check('issueType')
    .trim()
    .notEmpty()
    .withMessage('Please specify the issue type (e.g. Delivery Delay, Condition Mismatch).'),
  check('description')
    .trim()
    .notEmpty()
    .withMessage('Please provide details explaining the delivery discrepancy.'),
];

router.use(auth);

// Get disputes (Scoped by user role)
router.get('/', disputeController.getDisputes);

// Get single dispute
router.get('/:id', disputeController.getDisputeById);

// Submit new dispute
router.post('/', disputeValidation, validate, disputeController.createDispute);

// Resolve dispute (Admin only)
router.put('/:id/resolve', requireRole(ROLES.ADMIN), disputeController.resolveDispute);

module.exports = router;
