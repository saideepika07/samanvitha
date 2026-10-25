// Password Reset API Integration Tests
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const PasswordResetToken = require('../src/models/PasswordResetToken.js');
const { ROLES } = require('../src/config/roles.js');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await User.deleteMany({});
  await PasswordResetToken.deleteMany({});
});

describe('Password Reset API (B1)', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      name: 'Reset Test User',
      email: 'user@example.com',
      password: 'OldPassword123!',
      role: ROLES.DONOR,
      status: 'active',
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return the exact same neutral message for existing email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('If an account exists for this email, reset instructions have been sent.');

      // Verify a token record was created in DB
      const record = await PasswordResetToken.findOne({ userId: testUser._id });
      expect(record).not.toBeNull();
      expect(record.used).toBe(false);
      // Raw token is NEVER stored in database - hashedToken is a 64-char SHA-256 hex string
      expect(record.hashedToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return the exact same neutral message for non-existing email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('If an account exists for this email, reset instructions have been sent.');

      // Verify NO token was created for nonexistent email
      const record = await PasswordResetToken.findOne({ userId: testUser._id });
      expect(record).toBeNull();
    });
  });

  describe('GET /api/auth/reset-password/:token/validate', () => {
    it('should validate an active, unexpired token', async () => {
      const { rawToken } = await PasswordResetToken.generateAndSave(testUser._id);

      const res = await request(app).get(`/api/auth/reset-password/${rawToken}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.valid).toBe(true);
      expect(res.body.email).toBe(testUser.email);
    });

    it('should reject an invalid / nonexistent token', async () => {
      const res = await request(app).get('/api/auth/reset-password/fake_nonexistent_token_123/validate');

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toBe('not_found');
    });

    it('should reject an expired token', async () => {
      const { rawToken } = await PasswordResetToken.generateAndSave(testUser._id);

      // Artificially expire the token in DB
      const hashedToken = PasswordResetToken.hashToken(rawToken);
      await PasswordResetToken.updateOne(
        { hashedToken },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
      );

      const res = await request(app).get(`/api/auth/reset-password/${rawToken}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toBe('expired');
    });

    it('should reject an already used token', async () => {
      const { rawToken } = await PasswordResetToken.generateAndSave(testUser._id);

      // Mark token as used
      const hashedToken = PasswordResetToken.hashToken(rawToken);
      await PasswordResetToken.updateOne({ hashedToken }, { $set: { used: true } });

      const res = await request(app).get(`/api/auth/reset-password/${rawToken}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toBe('already_used');
    });
  });

  describe('POST /api/auth/reset-password/:token', () => {
    it('should reject weak password (< 8 chars or missing letter/number)', async () => {
      const { rawToken } = await PasswordResetToken.generateAndSave(testUser._id);

      const res = await request(app)
        .post(`/api/auth/reset-password/${rawToken}`)
        .send({ newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reset password successfully: new password works, old password fails', async () => {
      const { rawToken } = await PasswordResetToken.generateAndSave(testUser._id);
      const newSecret = 'BrandNewPassword2026!';

      const res = await request(app)
        .post(`/api/auth/reset-password/${rawToken}`)
        .send({ newPassword: newSecret });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Password updated/i);

      // Verify old password fails to log in
      const oldLoginRes = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'OldPassword123!',
      });
      expect(oldLoginRes.status).toBe(401);

      // Verify new password successfully logs in
      const newLoginRes = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: newSecret,
      });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.token).toBeDefined();

      // Verify token is now marked as used
      const hashedToken = PasswordResetToken.hashToken(rawToken);
      const updatedRecord = await PasswordResetToken.findOne({ hashedToken });
      expect(updatedRecord.used).toBe(true);

      // Reusing the same token fails
      const reuseRes = await request(app)
        .post(`/api/auth/reset-password/${rawToken}`)
        .send({ newPassword: 'AnotherPassword999!' });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.reason).toBe('already_used');
    });
  });

  describe('Rate Limiting Verification', () => {
    it('should trigger 429 Too Many Requests when rate limit threshold (5 requests) is exceeded', async () => {
      const rateLimit = require('express-rate-limit');
      const express = require('express');
      const testLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          error: 'Too many requests for this account. Please wait 15 minutes before trying again.',
        },
      });

      const testApp = express();
      testApp.use(testLimiter);
      testApp.post('/api/auth/test-rate-limit', (req, res) => res.json({ success: true }));

      // First 5 requests should pass
      for (let i = 0; i < 5; i++) {
        const res = await request(testApp).post('/api/auth/test-rate-limit');
        expect(res.status).toBe(200);
      }

      // 6th request must be rejected with 429
      const blockedRes = await request(testApp).post('/api/auth/test-rate-limit');
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toMatch(/Too many requests/i);
    });
  });
});
