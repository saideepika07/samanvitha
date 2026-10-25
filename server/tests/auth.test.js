// Auth API Integration Tests
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const { ROLES } = require('../src/config/roles.js');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication API (B1)', () => {
  describe('POST /api/auth/register', () => {
    it('should register a donor successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Donor User',
        email: 'donor@example.com',
        password: 'Password123!',
        role: ROLES.DONOR,
        accountType: 'individual',
        phone: '+91 9999999999',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('donor@example.com');
      expect(res.body.data.role).toBe(ROLES.DONOR);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.password).toBeUndefined(); // Never expose password
    });

    it('should register an institution successfully and initialize profile', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Hope Children Home',
        email: 'hope@example.com',
        password: 'Password123!',
        role: ROLES.INSTITUTION,
        institutionType: 'orphanage',
        phone: '+91 9888888888',
        address: 'Secunderabad',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ROLES.INSTITUTION);
    });

    it('should reject registration as admin', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Hacker Admin',
        email: 'hacker@example.com',
        password: 'Password123!',
        role: ROLES.ADMIN,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Administrator accounts cannot be created/i);
    });

    it('should reject duplicate email registration', async () => {
      await User.create({
        name: 'Existing Member',
        email: 'existing@example.com',
        password: 'Password123!',
        role: ROLES.DONOR,
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Another User',
        email: 'existing@example.com',
        password: 'Password123!',
        role: ROLES.DONOR,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should reject weak password (< 8 chars or no numbers/letters)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Weak Password User',
        email: 'weak@example.com',
        password: 'short',
        role: ROLES.DONOR,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Valid Member',
        email: 'member@example.com',
        password: 'Password123!',
        role: ROLES.DONOR,
        status: 'active',
      });
    });

    it('should authenticate user with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'member@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.email).toBe('member@example.com');
    });

    it('should reject incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'member@example.com',
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Invalid email or password/i);
    });

    it('should reject nonexistent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for suspended user accounts', async () => {
      await User.create({
        name: 'Suspended Account',
        email: 'suspended@example.com',
        password: 'Password123!',
        role: ROLES.DONOR,
        status: 'suspended',
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'suspended@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/suspended/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile for authenticated user', async () => {
      const user = await User.create({
        name: 'Profile User',
        email: 'me@example.com',
        password: 'Password123!',
        role: ROLES.DONOR,
      });
      const token = user.generateAuthToken();

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('me@example.com');
      expect(res.body.data.name).toBe('Profile User');
    });

    it('should reject request without bearer token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
