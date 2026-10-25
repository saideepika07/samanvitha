// Need Routes - Resource Deficit & Public Board Endpoints
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const needController = require('../controllers/needController.js');
const auth = require('../middleware/auth.js');
const requireRole = require('../middleware/requireRole.js');
const validate = require('../middleware/validate.js');
const { ROLES } = require('../config/roles.js');
const { CATEGORY_LABELS } = require('../config/categories.js');

// Validation rule sets
const needValidation = [
  check('category')
    .notEmpty()
    .withMessage('Please select a resource category.')
    .isIn(CATEGORY_LABELS)
    .withMessage('Category must be one of the permitted categories.'),
  check('itemType')
    .trim()
    .notEmpty()
    .withMessage('Please provide specific item details or description.'),
  check('requiredQuantity')
    .isFloat({ min: 1 })
    .withMessage('Required quantity must be at least 1.'),
  check('unit')
    .trim()
    .notEmpty()
    .withMessage('Please specify a unit of measurement (e.g. sets, kg, bags).'),
  check('usableStock')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Usable stock cannot be negative.'),
];

// 1. Public Needs Board Directory (Unauthenticated, Approved Institutions only)
router.get('/public', needController.getPublicNeeds);

// 2. Needs listing (Filtered by query or current user context)
// Optional auth helper: if Bearer token present, authenticate; otherwise proceed as guest
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return auth(req, res, next);
  }
  next();
};

router.get('/', optionalAuth, needController.getNeeds);

// 3. Single need detail
router.get('/:id', needController.getNeedById);

// 4. Create new need (Approved Institution only)
router.post(
  '/',
  auth,
  requireRole(ROLES.INSTITUTION),
  needValidation,
  validate,
  needController.createNeed
);

// 5. Update need (Owning Institution or Admin)
router.put(
  '/:id',
  auth,
  requireRole(ROLES.INSTITUTION, ROLES.ADMIN),
  needController.updateNeed
);

// 6. Delete need (Owning Institution or Admin)
router.delete(
  '/:id',
  auth,
  requireRole(ROLES.INSTITUTION, ROLES.ADMIN),
  needController.deleteNeed
);

module.exports = router;
