// Authentication & Password Reset Controller
const User = require('../models/User.js');
const Institution = require('../models/Institution.js');
const PasswordResetToken = require('../models/PasswordResetToken.js');
const emailService = require('../services/emailService.js');
const asyncHandler = require('../utils/asyncHandler.js');
const { ROLES } = require('../config/roles.js');

const NEUTRAL_RESET_MESSAGE = 'If an account exists for this email, reset instructions have been sent.';

/**
 * @desc    Register a new donor or institution account
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, accountType, institutionType, address, capacity, latitude, longitude } = req.body;

  let parsedLat = null;
  let parsedLng = null;

  if (latitude !== undefined && latitude !== null && latitude !== '') {
    const num = Number(latitude);
    if (isNaN(num) || num < -90 || num > 90) {
      return res.status(400).json({
        success: false,
        error: 'Latitude must be a valid number between -90 and 90.',
      });
    }
    parsedLat = num;
  }

  if (longitude !== undefined && longitude !== null && longitude !== '') {
    const num = Number(longitude);
    if (isNaN(num) || num < -180 || num > 180) {
      return res.status(400).json({
        success: false,
        error: 'Longitude must be a valid number between -180 and 180.',
      });
    }
    parsedLng = num;
  }

  // Strict Security Rule: Administrator accounts can NEVER be created via public registration
  if (role === ROLES.ADMIN) {
    return res.status(400).json({
      success: false,
      error: 'Administrator accounts cannot be created via public registration.',
    });
  }

  const normalizedEmail = (email || '').trim().toLowerCase();

  // Check for duplicate account
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'An account with this email address already exists. Please log in.',
    });
  }

  // Create user (password is automatically hashed via Mongoose pre-save hook)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
    phone: phone || '',
    accountType: role === ROLES.DONOR ? accountType || 'individual' : null,
    institutionType: role === ROLES.INSTITUTION ? institutionType || 'orphanage' : null,
    address: address || '',
    status: 'active',
  });

  let institutionId = null;
  let verificationStatus = null;
  if (role === ROLES.INSTITUTION) {
    const inst = await Institution.create({
      userId: user._id,
      name: user.name,
      institutionType: user.institutionType || 'orphanage',
      contactPerson: user.name,
      phone: user.phone || 'Provided at registration',
      email: user.email,
      address: user.address || 'Address provided at registration',
      capacity: Number(capacity) || 30,
      latitude: parsedLat,
      longitude: parsedLng,
      verificationStatus: 'Pending',
      verificationNotice: 'Prototype review pending administrative submission review.',
    });
    institutionId = inst._id.toString();
    verificationStatus = inst.verificationStatus;
  }

  const token = user.generateAuthToken();
  const userData = user.toJSON();
  if (institutionId) {
    userData.institutionId = institutionId;
    userData.verificationStatus = verificationStatus;
  }

  res.status(201).json({
    success: true,
    data: userData,
    token,
    message: 'Registration successful! Please log in with your credentials.',
  });
});

/**
 * @desc    Authenticate user & return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both email and password.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.',
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: 'This account has been suspended. Please contact administrator support.',
    });
  }

  const token = user.generateAuthToken();
  const userData = user.toJSON();

  if (user.role === ROLES.INSTITUTION) {
    const inst = await Institution.findOne({ userId: user._id });
    if (inst) {
      userData.institutionId = inst._id.toString();
      userData.verificationStatus = inst.verificationStatus;
    }
  }

  res.status(200).json({
    success: true,
    data: userData,
    token,
  });
});

/**
 * @desc    Get currently authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Bearer token)
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const userData = user.toJSON();

  if (user.role === ROLES.INSTITUTION) {
    const inst = await Institution.findOne({ userId: user._id });
    if (inst) {
      userData.institutionId = inst._id.toString();
      userData.verificationStatus = inst.verificationStatus;
    }
  }

  res.status(200).json({
    success: true,
    data: userData,
  });
});

/**
 * @desc    Update current authenticated user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  const { name, phone, address, accountType, location } = req.body;
  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (address !== undefined) user.address = address.trim();
  if (location !== undefined && !address) user.address = location.trim();
  if (accountType && user.role === ROLES.DONOR) user.accountType = accountType;

  await user.save();

  const userData = user.toJSON();
  if (user.role === ROLES.INSTITUTION) {
    const inst = await Institution.findOne({ userId: user._id });
    if (inst) {
      userData.institutionId = inst._id.toString();
      userData.verificationStatus = inst.verificationStatus;
    }
  }

  res.status(200).json({
    success: true,
    data: userData,
  });
});

/**
 * @desc    Logout user / invalidate client session
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * @desc    Request password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public (Rate limited)
 * @rule    ALWAYS returns the same neutral message to prevent email enumeration
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Look up user silently
  if (normalizedEmail) {
    const user = await User.findOne({ email: normalizedEmail, status: 'active' });

    if (user) {
      // Invalidate existing unused tokens for this user
      await PasswordResetToken.updateMany(
        { userId: user._id, used: false },
        { $set: { used: true } }
      );

      // Generate secure 32-byte token and store ONLY its SHA-256 hash in DB
      const { rawToken } = await PasswordResetToken.generateAndSave(user._id);

      // Send reset instructions via Nodemailer (or DEV ONLY console logging if unconfigured)
      await emailService.sendPasswordResetEmail({
        to: user.email,
        rawToken,
        userName: user.name,
      });
    }
  }

  // ALWAYS return the exact same neutral message
  res.status(200).json({
    success: true,
    message: NEUTRAL_RESET_MESSAGE,
  });
});

/**
 * @desc    Validate a reset password token before showing the reset form
 * @route   GET /api/auth/reset-password/:token/validate
 * @access  Public
 */
const validateResetToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(200).json({
      success: true,
      valid: false,
      reason: 'not_found',
      message: 'This password reset link is invalid or missing.',
    });
  }

  const hashedToken = PasswordResetToken.hashToken(token);
  const resetRecord = await PasswordResetToken.findOne({ hashedToken });

  if (!resetRecord) {
    return res.status(200).json({
      success: true,
      valid: false,
      reason: 'not_found',
      message: 'This password reset link is invalid or does not exist.',
    });
  }

  if (resetRecord.used) {
    return res.status(200).json({
      success: true,
      valid: false,
      reason: 'already_used',
      message: 'This password reset link has already been used. Please request a new one.',
    });
  }

  if (new Date() > resetRecord.expiresAt) {
    return res.status(200).json({
      success: true,
      valid: false,
      reason: 'expired',
      message: 'This password reset link has expired. Reset links are valid for 15 minutes.',
    });
  }

  // Token is valid; fetch user email context
  const user = await User.findById(resetRecord.userId).select('email');

  res.status(200).json({
    success: true,
    valid: true,
    email: user ? user.email : '',
  });
});

/**
 * @desc    Reset password using valid token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public (Rate limited)
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  // Strict password rule: minimum 8 characters, at least one letter and one number
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long.',
    });
  }

  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  if (!hasLetter || !hasNumber) {
    return res.status(400).json({
      success: false,
      error: 'Password must contain at least one letter and one number.',
    });
  }

  const hashedToken = PasswordResetToken.hashToken(token);
  const resetRecord = await PasswordResetToken.findOne({ hashedToken });

  if (!resetRecord) {
    return res.status(400).json({
      success: false,
      reason: 'not_found',
      error: 'This password reset link is invalid or does not exist.',
    });
  }

  if (resetRecord.used) {
    return res.status(400).json({
      success: false,
      reason: 'already_used',
      error: 'This password reset link has already been used. Please request a new one.',
    });
  }

  if (new Date() > resetRecord.expiresAt) {
    return res.status(400).json({
      success: false,
      reason: 'expired',
      error: 'This password reset link has expired. Reset links are valid for 15 minutes.',
    });
  }

  const user = await User.findById(resetRecord.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User account associated with this token was not found.',
    });
  }

  // Update password (pre-save hook will hash with bcrypt)
  user.password = newPassword;
  await user.save();

  // Mark token as used (single use) and invalidate all other reset tokens for this user
  resetRecord.used = true;
  await resetRecord.save();

  await PasswordResetToken.updateMany(
    { userId: user._id, used: false },
    { $set: { used: true } }
  );

  res.status(200).json({
    success: true,
    message: 'Password updated. Please log in.',
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  logout,
  forgotPassword,
  validateResetToken,
  resetPassword,
  NEUTRAL_RESET_MESSAGE,
};
