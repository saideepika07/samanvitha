// Automated Test Suite for Milestone B2: Institutions & Verification
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const VerificationRecord = require('../src/models/VerificationRecord.js');
const { ROLES } = require('../src/config/roles.js');
const fs = require('fs');
const path = require('path');

let adminToken;
let inst1Token;
let inst1Id;
let inst1User;
let inst2Token;
let inst2Id;
let donorToken;

beforeAll(async () => {
  await connectTestDB();

  // Create admin
  const admin = await User.create({
    email: 'admin@samanvitha.org',
    password: 'AdminPassword123!',
    name: 'Admin Reviewer',
    role: ROLES.ADMIN,
  });
  adminToken = admin.generateAuthToken();

  // Create institution 1 (Approved)
  inst1User = await User.create({
    email: 'inst1@samanvitha.org',
    password: 'Password123!',
    name: 'Care Orphanage',
    role: ROLES.INSTITUTION,
    institutionType: 'orphanage',
  });
  inst1Token = inst1User.generateAuthToken();

  const inst1Doc = await Institution.create({
    userId: inst1User._id,
    name: 'Care Orphanage',
    institutionType: 'orphanage',
    contactPerson: 'Director Rao',
    phone: '+91 99999 11111',
    email: 'inst1@samanvitha.org',
    address: 'Peerzadiguda, Hyderabad',
    capacity: 50,
    verificationStatus: 'Approved',
  });
  inst1Id = inst1Doc._id.toString();

  // Create institution 2 (Pending)
  const inst2User = await User.create({
    email: 'inst2@samanvitha.org',
    password: 'Password123!',
    name: 'Hope Home',
    role: ROLES.INSTITUTION,
    institutionType: 'old_age_home',
  });
  inst2Token = inst2User.generateAuthToken();

  const inst2Doc = await Institution.create({
    userId: inst2User._id,
    name: 'Hope Home',
    institutionType: 'old_age_home',
    contactPerson: 'Manager Rao',
    phone: '+91 99999 22222',
    email: 'inst2@samanvitha.org',
    address: 'Shamshabad, Hyderabad',
    capacity: 30,
    verificationStatus: 'Pending',
  });
  inst2Id = inst2Doc._id.toString();

  // Create donor
  const donor = await User.create({
    email: 'donor@samanvitha.org',
    password: 'Password123!',
    name: 'Donor Ram',
    role: ROLES.DONOR,
  });
  donorToken = donor.generateAuthToken();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Milestone B2: Institution Profile & Verification Document Access', () => {
  it('GET /api/institutions/me returns the authenticated institution profile', async () => {
    const res = await request(app)
      .get('/api/institutions/me')
      .set('Authorization', `Bearer ${inst1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Care Orphanage');
    expect(res.body.data.verificationStatus).toBe('Approved');
  });

  it('PUT /api/institutions/me updates profile fields but prevents self-approving verification status', async () => {
    const res = await request(app)
      .put('/api/institutions/me')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({
        capacity: 45,
        address: 'New Shamshabad Road, Hyderabad',
        verificationStatus: 'Approved', // Should be ignored / forbidden from self-setting
      });

    expect(res.status).toBe(200);
    expect(res.body.data.capacity).toBe(45);
    expect(res.body.data.address).toBe('New Shamshabad Road, Hyderabad');

    // Confirm verification status remained Pending!
    const dbInst = await Institution.findById(inst2Id);
    expect(dbInst.verificationStatus).toBe('Pending');
  });

  it('POST /api/institutions/me/documents uploads a verification file with metadata', async () => {
    // Create temporary test file
    const tempFilePath = path.join(__dirname, 'test-doc.pdf');
    fs.writeFileSync(tempFilePath, '%PDF-1.4 test verification document content');

    const res = await request(app)
      .post('/api/institutions/me/documents')
      .set('Authorization', `Bearer ${inst1Token}`)
      .attach('document', tempFilePath);

    // Clean up temporary test file
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].originalName).toBe('test-doc.pdf');
    expect(res.body.data[0].mimeType).toBe('application/pdf');
  });

  it('GET /api/institutions/:id/documents/:docId allows the owner to view the file', async () => {
    const inst = await Institution.findById(inst1Id);
    const docId = inst.documents[0]._id.toString();

    const res = await request(app)
      .get(`/api/institutions/${inst1Id}/documents/${docId}`)
      .set('Authorization', `Bearer ${inst1Token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('GET /api/institutions/:id/documents/:docId denies access to unauthorized users (403)', async () => {
    const inst = await Institution.findById(inst1Id);
    const docId = inst.documents[0]._id.toString();

    // inst2 tries to read inst1's confidential verification document
    const res = await request(app)
      .get(`/api/institutions/${inst1Id}/documents/${docId}`)
      .set('Authorization', `Bearer ${inst2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/institutions/:id/documents/:docId allows admin to review the file', async () => {
    const inst = await Institution.findById(inst1Id);
    const docId = inst.documents[0]._id.toString();

    const res = await request(app)
      .get(`/api/institutions/${inst1Id}/documents/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });
});

describe('Milestone B2: Admin Verification Review & Audit Log', () => {
  it('GET /api/admin/institutions rejects non-admin users (403)', async () => {
    const res = await request(app)
      .get('/api/admin/institutions')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).toBe(403);
  });

  it('GET /api/admin/institutions lists all institutions for admin review', async () => {
    const res = await request(app)
      .get('/api/admin/institutions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
  });

  it('PUT /api/admin/institutions/:id/verification approves institution and creates audit entry', async () => {
    const res = await request(app)
      .put(`/api/admin/institutions/${inst2Id}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Approved',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('Approved');

    // Verify audit log in database
    const auditRecord = await VerificationRecord.findOne({
      institutionId: inst2Id,
      newStatus: 'Approved',
    });
    expect(auditRecord).toBeTruthy();
    expect(auditRecord.action).toBe('APPROVED');
    expect(auditRecord.reviewerEmail).toBe('admin@samanvitha.org');
  });

  it('PUT /api/admin/institutions/:id/verification rejects institution with required reason', async () => {
    const res = await request(app)
      .put(`/api/admin/institutions/${inst2Id}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Rejected',
        reason: 'Proof of NGO registration certificate missing expiration seal.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('Rejected');
    expect(res.body.data.rejectionReason).toContain('Proof of NGO registration');

    const auditRecord = await VerificationRecord.findOne({
      institutionId: inst2Id,
      newStatus: 'Rejected',
    });
    expect(auditRecord).toBeTruthy();
    expect(auditRecord.reason).toContain('Proof of NGO registration');
  });
});
