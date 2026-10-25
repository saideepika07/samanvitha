// Authentication Middleware - JWT Verification & User Context Attachment
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const asyncHandler = require('../utils/asyncHandler.js');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route. Please provide a valid authentication token.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'samanvitha_default_jwt_secret');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'The user account associated with this token no longer exists.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'This account has been suspended. Please contact administrator support.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.name === 'TokenExpiredError' 
        ? 'Your session has expired. Please sign in again.' 
        : 'Invalid authentication token.',
    });
  }
});

module.exports = protect;
module.exports.protect = protect;
module.exports.auth = protect;
