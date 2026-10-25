// Automated Test Suite for Milestone B3: Matching Engine & Anti-Bias Scoring
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const Need = require('../src/models/Need.js');
const Donation = require('../src/models/Donation.js');
const { calculateMatchScore } = require('../src/services/matchEngine.js');
const { ROLES } = require('../src/config/roles.js');
const { DONATION_STATUS } = require('../src/config/donationStatus.js');

let donorUser;
let donorToken;
let approvedInst;
let criticalNeed;
let mediumNeed;
let testDonation;

beforeAll(async () => {
  await connectTestDB();

  donorUser = await User.create({
    email: 'donor_match@samanvitha.org',
    password: 'Password123!',
    name: 'Algorithmic Donor',
    role: ROLES.DONOR,
    address: 'Madhapur, Hyderabad',
  });
  donorToken = donorUser.generateAuthToken();

  const instUser = await User.create({
    email: 'inst_match@samanvitha.org',
    password: 'Password123!',
    name: 'Match Test Orphanage',
    role: ROLES.INSTITUTION,
  });

  approvedInst = await Institution.create({
    userId: instUser._id,
    name: 'Match Test Orphanage',
    institutionType: 'orphanage',
    contactPerson: 'Director Match',
    phone: '+91 91234 56789',
    email: 'inst_match@samanvitha.org',
    address: 'Madhapur, Hyderabad',
    capacity: 50,
    verificationStatus: 'Approved',
  });

  // Critical need: closer deadline, high demand
  criticalNeed = await Need.create({
    institutionId: approvedInst._id,
    institutionName: approvedInst.name,
    category: 'Rice and packaged essentials',
    itemType: 'Sona Masoori Rice (25kg bags)',
    requiredQuantity: 10,
    usableStock: 0,
    reservedQuantity: 0,
    unit: 'bags',
    urgency: 'Critical',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days
    address: 'Madhapur, Hyderabad',
    status: 'Open',
  });

  // Medium need: flexible deadline
  mediumNeed = await Need.create({
    institutionId: approvedInst._id,
    institutionName: approvedInst.name,
    category: 'Rice and packaged essentials',
    itemType: 'Basmati Rice (10kg bags)',
    requiredQuantity: 20,
    usableStock: 5,
    reservedQuantity: 0,
    unit: 'bags',
    urgency: 'Medium',
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days
    address: 'Shamshabad, Hyderabad',
    status: 'Open',
  });

  testDonation = await Donation.create({
    donorId: donorUser._id,
    donorName: donorUser.name,
    category: 'Rice and packaged essentials',
    itemType: 'Rice bags',
    quantity: 10,
    unit: 'bags',
    location: 'Madhapur, Hyderabad',
    status: DONATION_STATUS.LISTED,
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Milestone B3: Pure Matching Score Engine & Formula Verification', () => {
  it('correctly calculates weighted component scores: Urgency (35%), Demand (30%), Time (20%), Feasibility (15%)', () => {
    const donation = { quantity: 10, location: 'Madhapur, Hyderabad', latitude: 17.4483, longitude: 78.3915 };
    const need = {
      requiredQuantity: 10,
      usableStock: 0,
      reservedQuantity: 0,
      urgency: 'Critical', // score: 100 * 0.35 = 35.0
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // <= 3 days: 100 * 0.20 = 20.0
      address: 'Madhapur, Hyderabad', // distance 0 km (<= 2 km): 100 * 0.15 = 15.0
      latitude: 17.4483,
      longitude: 78.3915,
    };
    // Demand: 10/10 => 100 * 0.30 = 30.0
    // Total expected = 35 + 30 + 20 + 15 = 100.0

    const scoreData = calculateMatchScore(donation, need);
    expect(scoreData.finalScore).toBe(100);
    expect(scoreData.components.urgency.weightedScore).toBe(35);
    expect(scoreData.components.unfulfilledDemand.weightedScore).toBe(30);
    expect(scoreData.components.timeSensitivity.weightedScore).toBe(20);
    expect(scoreData.components.deliveryFeasibility.weightedScore).toBe(15);
  });

  it('proves anti-bias: wealth, popularity, or donor prestige attributes do not alter ranking', () => {
    const poorDonation = { quantity: 5, location: 'Hyderabad', wealthFactor: 0 };
    const billionaireDonation = { quantity: 5, location: 'Hyderabad', wealthFactor: 999999999 };
    const sampleNeed = {
      requiredQuantity: 10,
      usableStock: 0,
      reservedQuantity: 0,
      urgency: 'High',
      deadline: '2026-12-01',
      address: 'Hyderabad',
    };

    const score1 = calculateMatchScore(poorDonation, sampleNeed);
    const score2 = calculateMatchScore(billionaireDonation, sampleNeed);

    expect(score1.finalScore).toEqual(score2.finalScore);
  });
});

describe('Milestone B3: Match Suggestions API & Ranked Output', () => {
  it('GET /api/matches/suggestions/:donationId ranks Critical urgent need above Medium need', async () => {
    const res = await request(app)
      .get(`/api/matches/suggestions/${testDonation._id}`)
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    // The first ranked suggestion must be the Critical need
    expect(res.body.data[0].needId).toBe(criticalNeed._id.toString());
    expect(res.body.data[0].finalScore).toBeGreaterThan(res.body.data[1].finalScore);
  });
});

describe('Milestone B3: Atomic Match Reservation & Deficit Locking', () => {
  it('POST /api/matches/reserve reserves match and atomically updates Need reservedQuantity', async () => {
    const initialReserved = criticalNeed.reservedQuantity || 0;

    const res = await request(app)
      .post('/api/matches/reserve')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        donationId: testDonation._id,
        needId: criticalNeed._id,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.donation.status).toBe(DONATION_STATUS.RESERVED);

    // Verify atomic update on Need
    const updatedNeedInDb = await Need.findById(criticalNeed._id);
    expect(updatedNeedInDb.reservedQuantity).toBe(initialReserved + testDonation.quantity);
  });

  it('POST /api/matches/reserve rejects re-reserving an already reserved donation', async () => {
    const res = await request(app)
      .post('/api/matches/reserve')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        donationId: testDonation._id,
        needId: criticalNeed._id,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('handles concurrent reservation requests for the same donation atomically (guarantees exactly one winner, prevents duplicate allocation)', async () => {
    // 1. Create a fresh Listed donation
    const concurrentDonation = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Parijat Rice (50kg)',
      quantity: 5,
      unit: 'bags',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    const needBefore = await Need.findById(mediumNeed._id);
    const initialReserved = needBefore.reservedQuantity || 0;

    // 2. Fire concurrent reservation requests simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          donationId: concurrentDonation._id,
          needId: mediumNeed._id,
        }),
      request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          donationId: concurrentDonation._id,
          needId: mediumNeed._id,
        }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one must succeed (200) and one must be rejected (400)
    expect(statuses).toEqual([200, 400]);

    // 3. Verify in database: need reservedQuantity incremented by exactly one donation's quantity (5), never duplicate (10)
    const needAfter = await Need.findById(mediumNeed._id);
    expect(needAfter.reservedQuantity).toBe(initialReserved + concurrentDonation.quantity);

    // 4. Verify donation status in database is Reserved
    const donationInDb = await Donation.findById(concurrentDonation._id);
    expect(donationInDb.status).toBe(DONATION_STATUS.RESERVED);
  });
});

describe('Reservation Concurrency, Atomic Guards, Compensation & Release Invariance', () => {
  // Case 1: Donation of 10 units, two parallel requests of 6 units each: exactly one succeeds and the donation never goes negative
  it('Case 1: Donation of 10 units, two parallel requests of 6 units each: exactly one succeeds and donation never goes negative', async () => {
    const donation10 = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sona Masoori Rice (10kg)',
      quantity: 10,
      unit: 'bags',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    const need10 = await Need.create({
      institutionId: approvedInst._id,
      institutionName: approvedInst.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sona Masoori Rice (10kg)',
      requiredQuantity: 20,
      usableStock: 0,
      reservedQuantity: 0,
      unit: 'bags',
      urgency: 'High',
      deadline: '2026-12-31',
      address: 'Madhapur, Hyderabad',
      status: 'Open',
    });

    // Fire two parallel requests of 6 units each against the 10-unit donation
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          donationId: donation10._id,
          needId: need10._id,
          quantity: 6,
        }),
      request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          donationId: donation10._id,
          needId: need10._id,
          quantity: 6,
        }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    // Exactly one succeeds (200) and the other fails (400) due to insufficient available quantity
    expect(statuses).toEqual([200, 400]);

    // Check failure error message
    const failedRes = resA.status === 400 ? resA : resB;
    expect(failedRes.body.error).toMatch(/Insufficient available donation quantity/i);

    // Verify in database: original donation quantity must be exactly 4 (10 - 6), NEVER negative (-2)
    const originalInDb = await Donation.findById(donation10._id);
    expect(originalInDb.quantity).toBe(4);
    expect(originalInDb.status).toBe(DONATION_STATUS.LISTED);

    // Verify the need has exactly 6 units reserved
    const needInDb = await Need.findById(need10._id);
    expect(needInDb.reservedQuantity).toBe(6);

    // Verify exactly one reserved slice of 6 units was created
    const reservedSlices = await Donation.find({
      matchedNeedId: need10._id,
      status: DONATION_STATUS.RESERVED,
    });
    expect(reservedSlices.length).toBe(1);
    expect(reservedSlices[0].quantity).toBe(6);
  });

  // Case 2: Two different institutions request the same donation at the same time
  it('Case 2: Two different institutions request the same donation at the same time: exactly one succeeds and guard prevents over-allocation', async () => {
    // Institution 2 setup
    const instUser2 = await User.create({
      email: 'inst2_concurrency@samanvitha.org',
      password: 'Password123!',
      name: 'Second Concurrent Shelter',
      role: ROLES.INSTITUTION,
    });
    const inst2Token = instUser2.generateAuthToken();

    const inst2 = await Institution.create({
      userId: instUser2._id,
      name: 'Second Concurrent Shelter',
      institutionType: 'old_age_home',
      contactPerson: 'Director Two',
      phone: '+91 99887 76655',
      email: 'inst2_concurrency@samanvitha.org',
      address: 'Madhapur, Hyderabad',
      capacity: 40,
      verificationStatus: 'Approved',
    });

    // Need for Institution 1
    const inst1Need = await Need.create({
      institutionId: approvedInst._id,
      institutionName: approvedInst.name,
      category: 'Rice and packaged essentials',
      itemType: 'Kolam Rice',
      requiredQuantity: 10,
      usableStock: 0,
      reservedQuantity: 0,
      unit: 'bags',
      urgency: 'Critical',
      deadline: '2026-12-31',
      address: 'Madhapur, Hyderabad',
      status: 'Open',
    });

    // Need for Institution 2
    const inst2Need = await Need.create({
      institutionId: inst2._id,
      institutionName: inst2.name,
      category: 'Rice and packaged essentials',
      itemType: 'Kolam Rice',
      requiredQuantity: 10,
      usableStock: 0,
      reservedQuantity: 0,
      unit: 'bags',
      urgency: 'Critical',
      deadline: '2026-12-31',
      address: 'Madhapur, Hyderabad',
      status: 'Open',
    });

    // Shared donation of 10 units
    const sharedDonation = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Kolam Rice',
      quantity: 10,
      unit: 'bags',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    // Both institutions simultaneously submit reservation requests for the same donation
    const inst1User = await User.findOne({ email: 'inst_match@samanvitha.org' });
    const inst1Token = inst1User.generateAuthToken();

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${inst1Token}`)
        .send({
          donationId: sharedDonation._id,
          needId: inst1Need._id,
        }),
      request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${inst2Token}`)
        .send({
          donationId: sharedDonation._id,
          needId: inst2Need._id,
        }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one institution succeeds (200) and the other receives 400
    expect(statuses).toEqual([200, 400]);

    // Verify in database: winning institution has need.reservedQuantity = 10, losing institution has need.reservedQuantity = 0
    const [updatedNeed1, updatedNeed2, updatedDonation] = await Promise.all([
      Need.findById(inst1Need._id),
      Need.findById(inst2Need._id),
      Donation.findById(sharedDonation._id),
    ]);

    const totalReservedAcrossNeeds = updatedNeed1.reservedQuantity + updatedNeed2.reservedQuantity;
    expect(totalReservedAcrossNeeds).toBe(10); // Exactly 10 units reserved, NEVER 20!

    if (res1.status === 200) {
      expect(updatedNeed1.reservedQuantity).toBe(10);
      expect(updatedNeed2.reservedQuantity).toBe(0);
      expect(updatedDonation.matchedInstitutionId.toString()).toBe(approvedInst._id.toString());
    } else {
      expect(updatedNeed1.reservedQuantity).toBe(0);
      expect(updatedNeed2.reservedQuantity).toBe(10);
      expect(updatedDonation.matchedInstitutionId.toString()).toBe(inst2._id.toString());
    }
    expect(updatedDonation.status).toBe(DONATION_STATUS.RESERVED);
  });

  // Case 3: A forced failure in the second or third update step leaves no leaked reservedQuantity
  it('Case 3: Forced failure in Need update triggers compensation rollback and leaves no leaked reservedQuantity or orphaned status', async () => {
    const donationFailTest = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Wheat Flour (10kg)',
      quantity: 8,
      unit: 'bags',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    const needFailTest = await Need.create({
      institutionId: approvedInst._id,
      institutionName: approvedInst.name,
      category: 'Rice and packaged essentials',
      itemType: 'Wheat Flour (10kg)',
      requiredQuantity: 15,
      usableStock: 0,
      reservedQuantity: 0,
      unit: 'bags',
      urgency: 'Medium',
      deadline: '2026-12-31',
      address: 'Madhapur, Hyderabad',
      status: 'Open',
    });

    // Mock a DB failure during Step 2 (Need.findByIdAndUpdate)
    const spy = jest
      .spyOn(Need, 'findByIdAndUpdate')
      .mockRejectedValueOnce(new Error('Simulated network failure on Need document write'));

    const res = await request(app)
      .post('/api/matches/reserve')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        donationId: donationFailTest._id,
        needId: needFailTest._id,
      });

    // The request should fail with 500
    expect(res.status).toBe(500);

    // Restore the spy
    spy.mockRestore();

    // Verify compensation rollback:
    // 1. Need reservedQuantity must still be 0 (no leaked reservedQuantity!)
    const needInDb = await Need.findById(needFailTest._id);
    expect(needInDb.reservedQuantity).toBe(0);

    // 2. Donation must be rolled back to Listed (not stuck in Reserved)
    const donationInDb = await Donation.findById(donationFailTest._id);
    expect(donationInDb.status).toBe(DONATION_STATUS.LISTED);
    expect(donationInDb.matchedNeedId).toBeNull();
    expect(donationInDb.quantity).toBe(8);
  });

  // Case 4: Cancelling or expiring a reservation releases exactly the reserved quantity once, even if called twice
  it('Case 4: Cancelling or expiring a reservation releases exactly the reserved quantity once, even if called twice (idempotence)', async () => {
    // 4A: Cancellation idempotency
    const donationCancelTest = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Dal (10kg)',
      quantity: 7,
      unit: 'bags',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      matchedNeedId: mediumNeed._id,
      matchedInstitutionId: approvedInst._id,
      matchedInstitutionName: approvedInst.name,
      reservedAt: new Date(),
    });

    // Atomically set need reservedQuantity to 7 for this test
    await Need.findByIdAndUpdate(mediumNeed._id, { $inc: { reservedQuantity: 7 } });
    const needBeforeCancel = await Need.findById(mediumNeed._id);
    const expectedFinalReserved = needBeforeCancel.reservedQuantity - 7;

    // Call cancel twice concurrently via Promise.all
    const [cancelRes1, cancelRes2] = await Promise.all([
      request(app)
        .post(`/api/donations/${donationCancelTest._id}/cancel`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ reason: 'Accidental reservation' }),
      request(app)
        .post(`/api/donations/${donationCancelTest._id}/cancel`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ reason: 'Accidental reservation' }),
    ]);

    expect(cancelRes1.status).toBe(200);
    expect(cancelRes2.status).toBe(200);

    // Calling cancel a third time sequentially
    const cancelRes3 = await request(app)
      .post(`/api/donations/${donationCancelTest._id}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ reason: 'Duplicate test' });
    expect(cancelRes3.status).toBe(200);

    // Verify in database: need reservedQuantity was decremented by 7 EXACTLY ONCE
    const needAfterCancel = await Need.findById(mediumNeed._id);
    expect(needAfterCancel.reservedQuantity).toBe(expectedFinalReserved);

    const donationAfterCancel = await Donation.findById(donationCancelTest._id);
    expect(donationAfterCancel.status).toBe(DONATION_STATUS.CANCELLED);

    // 4B: Expiration idempotency
    const donationExpireTest = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sugar (25kg)',
      quantity: 5,
      unit: 'bags',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      matchedNeedId: mediumNeed._id,
      matchedInstitutionId: approvedInst._id,
      matchedInstitutionName: approvedInst.name,
      reservedAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    });

    await Need.findByIdAndUpdate(mediumNeed._id, { $inc: { reservedQuantity: 5 } });
    const needBeforeExpire = await Need.findById(mediumNeed._id);
    const expectedReservedAfterExpire = needBeforeExpire.reservedQuantity - 5;

    // Call expire twice concurrently via Promise.all
    const [expireRes1, expireRes2] = await Promise.all([
      request(app)
        .post('/api/matches/expire')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationId: donationExpireTest._id }),
      request(app)
        .post('/api/matches/expire')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationId: donationExpireTest._id }),
    ]);

    expect(expireRes1.status).toBe(200);
    expect(expireRes2.status).toBe(200);

    // Calling expire a third time sequentially
    const expireRes3 = await request(app)
      .post('/api/matches/expire')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ donationId: donationExpireTest._id });
    expect(expireRes3.status).toBe(200);

    // Verify in database: need reservedQuantity was decremented by 5 EXACTLY ONCE
    const needAfterExpire = await Need.findById(mediumNeed._id);
    expect(needAfterExpire.reservedQuantity).toBe(expectedReservedAfterExpire);

    const donationAfterExpire = await Donation.findById(donationExpireTest._id);
    expect(donationAfterExpire.status).toBe(DONATION_STATUS.LISTED);
    expect(donationAfterExpire.matchedNeedId).toBeNull();
  });
});
