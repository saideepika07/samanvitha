// Donation Routes - Pledges & Lifecycle
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const donationController = require('../controllers/donationController.js');
const auth = require('../middleware/auth.js');
const requireRole = require('../middleware/requireRole.js');
const validate = require('../middleware/validate.js');
const { ROLES } = require('../config/roles.js');
const { CATEGORY_LABELS } = require('../config/categories.js');
const { uploadPhoto } = require('../middleware/upload.js');

const donationValidation = [
  check('category')
    .notEmpty()
    .withMessage('Please select a category.')
    .isIn(CATEGORY_LABELS)
    .withMessage('Category must be one of the permitted categories.'),
  check('itemType')
    .trim()
    .notEmpty()
    .withMessage('Please specify the items being donated.'),
  check('quantity')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be at least 1.'),
  check('unit')
    .trim()
    .notEmpty()
    .withMessage('Please specify a unit of measurement.'),
  check('location')
    .trim()
    .notEmpty()
    .withMessage('Please provide your pickup or dispatch location.'),
  check('latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90.'),
  check('longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180.'),
];

// All donation routes require authentication
router.use(auth);

// 1. Specific scoped queries
router.get('/my', requireRole(ROLES.DONOR), donationController.getMyDonations);
router.get('/institution/incoming', requireRole(ROLES.INSTITUTION), donationController.getInstitutionIncoming);
router.get('/institution/received', requireRole(ROLES.INSTITUTION), donationController.getInstitutionReceived);

// 2. General queries & CRUD
router.get('/', donationController.getAllDonations);
router.get('/:id', donationController.getDonationById);
router.post('/upload-photo', requireRole(ROLES.DONOR), uploadPhoto.single('photo'), donationController.uploadDonationPhoto);
router.post('/', requireRole(ROLES.DONOR), donationValidation, validate, donationController.createDonation);
router.put('/:id/status', donationController.updateDonationStatus);
router.post('/:id/cancel', donationController.cancelDonation);

module.exports = router;
