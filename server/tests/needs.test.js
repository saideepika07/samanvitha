// Automated Test Suite for Milestone B2: Needs & Public Directory
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const Need = require('../src/models/Need.js');
const { ROLES } = require('../src/config/roles.js');

let approvedInstUser;
let approvedInstToken;
let approvedInstId;

let pendingInstUser;
let pendingInstToken;
let pendingInstId;

let otherInstUser;
let otherInstToken;

let testNeedId;

beforeAll(async () => {
  await connectTestDB();

  // 1. Approved Institution
  approvedInstUser = await User.create({
    email: 'approved@samanvitha.org',
    password: 'Password123!',
    name: 'Approved Care Home',
    role: ROLES.INSTITUTION,
  });
  approvedInstToken = approvedInstUser.generateAuthToken();

  const appInst = await Institution.create({
    userId: approvedInstUser._id,
    name: 'Approved Care Home',
    institutionType: 'orphanage',
    contactPerson: 'Director Rao',
    phone: '+91 91111 22222',
    email: 'approved@samanvitha.org',
    address: 'Peerzadiguda, Hyderabad',
    capacity: 40,
    verificationStatus: 'Approved',
  });
  approvedInstId = appInst._id.toString();

  // 2. Pending Institution
  pendingInstUser = await User.create({
    email: 'pending@samanvitha.org',
    password: 'Password123!',
    name: 'Pending Old Age Home',
    role: ROLES.INSTITUTION,
  });
  pendingInstToken = pendingInstUser.generateAuthToken();

  const pendInst = await Institution.create({
    userId: pendingInstUser._id,
    name: 'Pending Old Age Home',
    institutionType: 'old_age_home',
    contactPerson: 'Incharge Padmavathi',
    phone: '+91 93333 44444',
    email: 'pending@samanvitha.org',
    address: 'Shamshabad, Hyderabad',
    capacity: 25,
    verificationStatus: 'Pending',
  });
  pendingInstId = pendInst._id.toString();

  // 3. Other Approved Institution (for ownership checks)
  otherInstUser = await User.create({
    email: 'other@samanvitha.org',
    password: 'Password123!',
    name: 'Other Care Center',
    role: ROLES.INSTITUTION,
  });
  otherInstToken = otherInstUser.generateAuthToken();

  await Institution.create({
    userId: otherInstUser._id,
    name: 'Other Care Center',
    institutionType: 'orphanage',
    contactPerson: 'Staff Member',
    phone: '+91 95555 66666',
    email: 'other@samanvitha.org',
    address: 'Nizampet, Hyderabad',
    capacity: 35,
    verificationStatus: 'Approved',
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Milestone B2: Need Creation & Verification Constraints', () => {
  it('POST /api/needs succeeds for an Approved institution', async () => {
    const res = await request(app)
      .post('/api/needs')
      .set('Authorization', `Bearer ${approvedInstToken}`)
      .send({
        category: 'Books and educational supplies',
        itemType: 'Ruled Notebooks (192 pgs) & Ballpoint Pens',
        requiredQuantity: 100,
        usableStock: 20,
        unit: 'sets',
        urgency: 'High',
        deadline: '2026-11-20',
        acceptableCondition: 'New only',
        notes: 'Midterm preparation supplies',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.itemType).toBe('Ruled Notebooks (192 pgs) & Ballpoint Pens');
    expect(res.body.data.remainingNeed).toBe(80); // 100 - 20 - 0 = 80
    testNeedId = res.body.data.id;
  });

  it('POST /api/needs blocks a Pending institution with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/needs')
      .set('Authorization', `Bearer ${pendingInstToken}`)
      .send({
        category: 'Rice and packaged essentials',
        itemType: 'Sona Masoori Rice (25kg bags)',
        requiredQuantity: 10,
        usableStock: 2,
        unit: 'bags',
        urgency: 'Critical',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Only approved institutions can create or publish needs');
  });

  it('POST /api/needs validates required fields and fails for invalid category or quantity', async () => {
    const res = await request(app)
      .post('/api/needs')
      .set('Authorization', `Bearer ${approvedInstToken}`)
      .send({
        category: 'Invalid Unpermitted Category',
        itemType: 'Test Item',
        requiredQuantity: -5,
        unit: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Milestone B2: Public Needs Board & Remaining Deficit Formula', () => {
  it('GET /api/needs/public lists only needs from Approved institutions', async () => {
    const res = await request(app).get('/api/needs/public');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const foundNeed = res.body.data.find((n) => n.id === testNeedId);
    expect(foundNeed).toBeTruthy();
    expect(foundNeed.remainingNeed).toBe(80);
    expect(foundNeed.status).toBe('Open');
  });

  it('GET /api/needs/public filters by category correctly', async () => {
    const res = await request(app)
      .get('/api/needs/public')
      .query({ category: 'Books and educational supplies' });

    expect(res.status).toBe(200);
    expect(res.body.data.every((n) => n.category === 'Books and educational supplies')).toBe(true);
  });

  it('GET /api/needs/public filters by urgency correctly', async () => {
    const res = await request(app)
      .get('/api/needs/public')
      .query({ urgency: 'High' });

    expect(res.status).toBe(200);
    expect(res.body.data.every((n) => n.urgency === 'High')).toBe(true);
  });
});

describe('Milestone B2: Need Updates & Deficit Recalculation', () => {
  it('PUT /api/needs/:id updates usable stock and recalculates remaining deficit', async () => {
    // Current: required = 100, usable = 20 -> remaining = 80
    // Update: usable = 50 -> remaining should become 50
    const res = await request(app)
      .put(`/api/needs/${testNeedId}`)
      .set('Authorization', `Bearer ${approvedInstToken}`)
      .send({
        usableStock: 50,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.usableStock).toBe(50);
    expect(res.body.data.remainingNeed).toBe(50);
  });

  it('PUT /api/needs/:id automatically sets status to Fulfilled when deficit reaches 0', async () => {
    const res = await request(app)
      .put(`/api/needs/${testNeedId}`)
      .set('Authorization', `Bearer ${approvedInstToken}`)
      .send({
        usableStock: 100, // Stock now meets required quantity
      });

    expect(res.status).toBe(200);
    expect(res.body.data.remainingNeed).toBe(0);
    expect(res.body.data.status).toBe('Fulfilled');
  });

  it('PUT /api/needs/:id prevents a non-owner institution from editing another home\'s need', async () => {
    const res = await request(app)
      .put(`/api/needs/${testNeedId}`)
      .set('Authorization', `Bearer ${otherInstToken}`)
      .send({
        notes: 'Unauthorized alteration',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/needs/:id prevents non-owner from deleting need', async () => {
    const res = await request(app)
      .delete(`/api/needs/${testNeedId}`)
      .set('Authorization', `Bearer ${otherInstToken}`);

    expect(res.status).toBe(403);
  });

  it('DELETE /api/needs/:id allows owner institution to remove need', async () => {
    const res = await request(app)
      .delete(`/api/needs/${testNeedId}`)
      .set('Authorization', `Bearer ${approvedInstToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await Need.findById(testNeedId);
    expect(check).toBeNull();
  });
});
