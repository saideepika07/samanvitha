// Automated Test Suite for Milestone B3: Donations Lifecycle & Inventory Sync
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const Need = require('../src/models/Need.js');
const Donation = require('../src/models/Donation.js');
const { ROLES } = require('../src/config/roles.js');
const { DONATION_STATUS } = require('../src/config/donationStatus.js');

let donor1Token;
let donor1User;
let donor2Token;
let instUser;
let instToken;
let targetInstitution;
let targetNeed;
let createdPledgeId;

beforeAll(async () => {
  await connectTestDB();

  // Donor 1
  donor1User = await User.create({
    email: 'donor1_life@samanvitha.org',
    password: 'Password123!',
    name: 'Primary Donor',
    role: ROLES.DONOR,
    address: 'Madhapur, Hyderabad',
  });
  donor1Token = donor1User.generateAuthToken();

  // Donor 2
  const donor2User = await User.create({
    email: 'donor2_life@samanvitha.org',
    password: 'Password123!',
    name: 'Secondary Donor',
    role: ROLES.DONOR,
    address: 'Koti, Hyderabad',
  });
  donor2Token = donor2User.generateAuthToken();

  // Institution User
  instUser = await User.create({
    email: 'inst_life@samanvitha.org',
    password: 'Password123!',
    name: 'Lifecycle Orphanage',
    role: ROLES.INSTITUTION,
  });
  instToken = instUser.generateAuthToken();

  targetInstitution = await Institution.create({
    userId: instUser._id,
    name: 'Lifecycle Orphanage',
    institutionType: 'orphanage',
    contactPerson: 'Director Life',
    phone: '+91 91234 56789',
    email: 'inst_life@samanvitha.org',
    address: 'Peerzadiguda, Hyderabad',
    capacity: 40,
    verificationStatus: 'Approved',
  });

  // Target Need: required 50, usable 10, reserved 0 -> remaining = 40
  targetNeed = await Need.create({
    institutionId: targetInstitution._id,
    institutionName: targetInstitution.name,
    category: 'Clothes (including sarees)',
    itemType: 'Warm Sweaters (Ages 8-12)',
    requiredQuantity: 50,
    usableStock: 10,
    reservedQuantity: 0,
    unit: 'items',
    urgency: 'High',
    address: 'Peerzadiguda, Hyderabad',
    status: 'Open',
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Milestone B3: Donation Creation & Direct Need Pledge', () => {
  it('POST /api/donations allows donor to direct-pledge to an open need', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        category: 'Clothes (including sarees)',
        itemType: 'Warm Sweaters (Ages 8-12)',
        quantity: 20,
        unit: 'items',
        condition: 'New with tags',
        location: 'Madhapur, Hyderabad',
        matchedNeedId: targetNeed._id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(DONATION_STATUS.RESERVED);
    createdPledgeId = res.body.data.id;

    // Verify atomic reserve on the Need
    const needInDb = await Need.findById(targetNeed._id);
    expect(needInDb.reservedQuantity).toBe(20);
    expect(needInDb.remainingNeed).toBe(20); // 50 - 10 - 20 = 20
  });

  it('GET /api/donations/my returns donor’s active and reserved pledges', async () => {
    const res = await request(app)
      .get('/api/donations/my')
      .set('Authorization', `Bearer ${donor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((d) => d.id === createdPledgeId)).toBe(true);
  });
});

describe('Milestone B3: Donation Status Transitions & Inventory Synchronization', () => {
  it('PUT /api/donations/:id/status allows donor to update to Ready for delivery and Delivered', async () => {
    const readyRes = await request(app)
      .put(`/api/donations/${createdPledgeId}/status`)
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        status: DONATION_STATUS.READY_FOR_DELIVERY,
      });

    expect(readyRes.status).toBe(200);
    expect(readyRes.body.data.status).toBe(DONATION_STATUS.READY_FOR_DELIVERY);

    const deliveredRes = await request(app)
      .put(`/api/donations/${createdPledgeId}/status`)
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        status: DONATION_STATUS.DELIVERED,
      });

    expect(deliveredRes.status).toBe(200);
    expect(deliveredRes.body.data.status).toBe(DONATION_STATUS.DELIVERED);
  });

  it('PUT /api/donations/:id/status allows matched institution to confirm Received, converting reserved to usableStock', async () => {
    // Current Need state: usableStock = 10, reservedQuantity = 20
    // On Received: usableStock becomes 30 (10 + 20), reservedQuantity becomes 0 (20 - 20)
    const res = await request(app)
      .put(`/api/donations/${createdPledgeId}/status`)
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        status: DONATION_STATUS.RECEIVED,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(DONATION_STATUS.RECEIVED);

    const needInDb = await Need.findById(targetNeed._id);
    expect(needInDb.reservedQuantity).toBe(0);
    expect(needInDb.usableStock).toBe(30);
    expect(needInDb.remainingNeed).toBe(20); // 50 - 30 - 0 = 20
  });

  it('acknowledging twice or transitioning Received -> Completed updates usableStock and reservedQuantity exactly once', async () => {
    // Current Need state: usableStock = 30, reservedQuantity = 0
    // The donation is currently at status: RECEIVED.
    // Call acknowledge/status update again with Completed:
    const res = await request(app)
      .put(`/api/donations/${createdPledgeId}/status`)
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        status: DONATION_STATUS.COMPLETED,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(DONATION_STATUS.COMPLETED);

    // Verify stock did NOT increment twice
    const needInDb = await Need.findById(targetNeed._id);
    expect(needInDb.reservedQuantity).toBe(0);
    expect(needInDb.usableStock).toBe(30); // remains 30, not 50
    expect(needInDb.remainingNeed).toBe(20);

    // Call it again with Completed (duplicate acknowledgment call):
    const duplicateRes = await request(app)
      .put(`/api/donations/${createdPledgeId}/status`)
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        status: DONATION_STATUS.COMPLETED,
      });

    expect(duplicateRes.status).toBe(200);
    const needAfterDup = await Need.findById(targetNeed._id);
    expect(needAfterDup.reservedQuantity).toBe(0);
    expect(needAfterDup.usableStock).toBe(30); // still 30
    expect(needAfterDup.remainingNeed).toBe(20);
  });

  it('cancellation releases reservedQuantity back to the need deficit', async () => {
    // 1. Create a fresh reserved donation of 15 items
    const newDonRes = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        category: 'Clothes (including sarees)',
        itemType: 'Warm Sweaters (Ages 8-12)',
        quantity: 15,
        unit: 'items',
        location: 'Madhapur, Hyderabad',
        matchedNeedId: targetNeed._id,
      });

    const secondDonId = newDonRes.body.data.id;
    let needInDb = await Need.findById(targetNeed._id);
    expect(needInDb.reservedQuantity).toBe(15);

    // 2. Cancel the donation
    const cancelRes = await request(app)
      .post(`/api/donations/${secondDonId}/cancel`)
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        reason: 'Unable to deliver due to personal circumstances.',
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe(DONATION_STATUS.CANCELLED);

    // 3. Verify reserved quantity was released back to 0!
    needInDb = await Need.findById(targetNeed._id);
    expect(needInDb.reservedQuantity).toBe(0);
  });

  it('blocks unauthorized donors from modifying or cancelling another donor’s pledge', async () => {
    const res = await request(app)
      .post(`/api/donations/${createdPledgeId}/cancel`)
      .set('Authorization', `Bearer ${donor2Token}`)
      .send({
        reason: 'Attempted unauthorized cancellation',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
