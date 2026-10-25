// Rate Limiting Middleware
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 200, // relaxed in test mode
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this network. Please try again after 15 minutes.',
  },
});

// Strict rate limiter for Authentication and Password Reset endpoints
// Allows maximum 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 5, // 5 requests per 15m in prod/dev
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by IP + normalized body email if present to limit per IP and per account
    const emailKey = req.body && req.body.email ? req.body.email.toLowerCase().trim() : '';
    return `${req.ip}_${emailKey}`;
  },
  message: {
    success: false,
    error: 'Too many requests for this account. Please wait 15 minutes before trying again.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
