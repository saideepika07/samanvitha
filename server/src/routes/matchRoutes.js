// Match Routes - Algorithmic Suggestions & Match Reservations
const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController.js');
const auth = require('../middleware/auth.js');

router.use(auth);

// Get ranked match suggestions for a donation
router.get('/suggestions/:donationId', matchController.getMatchSuggestions);

// Reserve a match between a donation and an institution need
router.post('/reserve', matchController.reserveMatch);

// Expire/release an unfulfilled reservation back to listed pool
router.post('/expire', matchController.expireReservation);

module.exports = router;
