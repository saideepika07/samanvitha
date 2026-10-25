// Automated Test Suite for Milestone B4: Disputes & Admin Reconciliation
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Dispute = require('../src/models/Dispute.js');
const Notification = require('../src/models/Notification.js');
const ActivityLog = require('../src/models/ActivityLog.js');
const { ROLES } = require('../src/config/roles.js');

let adminToken;
let donorToken;
let donorUser;
let createdDisputeId;

beforeAll(async () => {
  await connectTestDB();

  const admin = await User.create({
    email: 'admin_dispute@samanvitha.org',
    password: 'AdminPassword123!',
    name: 'Admin Arbitrator',
    role: ROLES.ADMIN,
  });
  adminToken = admin.generateAuthToken();

  donorUser = await User.create({
    email: 'donor_dispute@samanvitha.org',
    password: 'Password123!',
    name: 'Complainant Donor',
    role: ROLES.DONOR,
  });
  donorToken = donorUser.generateAuthToken();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Milestone B4: Dispute Submission & Scoped Listing', () => {
  it('POST /api/disputes submits a new delivery/condition dispute', async () => {
    const res = await request(app)
      .post('/api/disputes')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        donorName: 'Complainant Donor',
        institutionName: 'Sample Orphanage 1',
        issueType: 'Delivery Delay',
        description: 'Road blockage due to flash floods delayed transit by 48 hours.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Open');
    createdDisputeId = res.body.data.id;

    // Verify activity log was recorded
    const log = await ActivityLog.findOne({ action: 'DISPUTE_SUBMITTED' });
    expect(log).toBeTruthy();
  });

  it('GET /api/disputes returns dispute to the applicant', async () => {
    const res = await request(app)
      .get('/api/disputes')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((d) => d.id === createdDisputeId)).toBe(true);
  });

  it('GET /api/disputes allows Admin to inspect all disputes', async () => {
    const res = await request(app)
      .get('/api/disputes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });
});

describe('Milestone B4: Administrative Resolution & Automatic Notification', () => {
  it('PUT /api/disputes/:id/resolve blocks non-admin users (403)', async () => {
    const res = await request(app)
      .put(`/api/disputes/${createdDisputeId}/resolve`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        status: 'Resolved',
        resolutionNotes: 'Attempted self-resolution',
      });

    expect(res.status).toBe(403);
  });

  it('PUT /api/disputes/:id/resolve allows Admin to resolve dispute and dispatches user notification', async () => {
    const res = await request(app)
      .put(`/api/disputes/${createdDisputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Resolved',
        resolutionNotes: 'Dispatched volunteer delivery vehicle to complete handoff.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Resolved');
    expect(res.body.data.resolutionNotes).toContain('Dispatched volunteer delivery');

    // Verify automatic notification was created for the applicant
    const notification = await Notification.findOne({
      userId: donorUser._id,
      type: 'dispute',
    });
    expect(notification).toBeTruthy();
    expect(notification.title).toBe('Dispute Resolved');
    expect(notification.message).toContain('Dispatched volunteer delivery vehicle');

    // Verify activity log recorded resolution
    const log = await ActivityLog.findOne({ action: 'DISPUTE_RESOLVED' });
    expect(log).toBeTruthy();
  });
});
