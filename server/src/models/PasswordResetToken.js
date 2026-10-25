// Password Reset Token Model
// -----------------------------------------------------------------------------
// Security rules:
// 1. Raw tokens are NEVER stored or logged in the database.
// 2. Only a one-way SHA-256 hash of the random token is stored.
// 3. Tokens expire strictly after 15 minutes.
// 4. Tokens are single-use (used: true).
// -----------------------------------------------------------------------------

const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  hashedToken: {
    type: String,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  used: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Static helper: Compute one-way SHA-256 hash of a raw token
passwordResetTokenSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

// Static helper: Generate a fresh 32-byte cryptographically secure token and save its hash
passwordResetTokenSchema.statics.generateAndSave = async function (userId) {
  // 32 bytes of secure random bytes -> 64-character hex string
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = this.hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Exactly 15 minutes

  await this.create({
    userId,
    hashedToken,
    expiresAt,
    used: false,
  });

  return { rawToken, expiresAt };
};

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

module.exports = PasswordResetToken;
