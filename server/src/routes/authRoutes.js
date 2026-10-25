// Authentication Routes
const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateMe,
  logout,
  forgotPassword,
  validateResetToken,
  resetPassword,
} = require('../controllers/authController.js');

const { protect } = require('../middleware/auth.js');
const { authLimiter } = require('../middleware/rateLimiter.js');
const validate = require('../middleware/validate.js');

// Validation schemas
const registerValidation = [
  check('name', 'Name is required.').trim().notEmpty(),
  check('email', 'Please provide a valid email address.').isEmail().normalizeEmail(),
  check('password', 'Password must be at least 8 characters long and contain a number and a letter.')
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/),
  check('role').custom((value) => {
    if (value === 'admin') {
      throw new Error('Administrator accounts cannot be created via public registration.');
    }
    if (!['donor', 'institution'].includes(value)) {
      throw new Error('Account role is required (donor or institution).');
    }
    return true;
  }),
  validate,
];

const loginValidation = [
  check('email', 'Please provide a valid email address.').isEmail().normalizeEmail(),
  check('password', 'Password is required.').notEmpty(),
  validate,
];

const forgotPasswordValidation = [
  check('email', 'Please provide a valid email address.').isEmail().normalizeEmail(),
  validate,
];

const resetPasswordValidation = [
  check('newPassword', 'Password must be at least 8 characters long and contain a number and a letter.')
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/),
  validate,
];

// Public Auth Endpoints
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);

// Password Reset Flow Endpoints
router.post('/forgot-password', authLimiter, forgotPasswordValidation, forgotPassword);
router.get('/reset-password/:token/validate', validateResetToken);
router.post('/reset-password/:token', authLimiter, resetPasswordValidation, resetPassword);

// Protected Auth Endpoints
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/logout', protect, logout);

module.exports = router;
