// Automated Tests for Reservation Expiry, Atomic Decrements & Concurrency
const mongoose = require('mongoose');
const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const Need = require('../src/models/Need.js');
const Donation = require('../src/models/Donation.js');
const Notification = require('../src/models/Notification.js');
const { ROLES } = require('../src/config/roles.js');
const { DONATION_STATUS, RESERVATION_EXPIRY_HOURS } = require('../src/config/donationStatus.js');
const {
  expireDonationRecord,
  expireStaleReservations,
  isPastDeadline,
} = require('../src/services/reservationExpiryService.js');

let donorUser;
let donorToken;
let instUser;
let instToken;
let testInstitution;
let testNeed;

beforeAll(async () => {
  await connectTestDB();

  donorUser = await User.create({
    email: 'expiry_donor@samanvitha.org',
    password: 'Password123!',
    name: 'Expiry Donor',
    role: ROLES.DONOR,
    address: 'Banjara Hills, Hyderabad',
  });
  donorToken = donorUser.generateAuthToken();

  instUser = await User.create({
    email: 'expiry_inst@samanvitha.org',
    password: 'Password123!',
    name: 'Expiry Care Home User',
    role: ROLES.INSTITUTION,
  });
  instToken = instUser.generateAuthToken();

  testInstitution = await Institution.create({
    userId: instUser._id,
    name: 'Grace Children Home',
    institutionType: 'orphanage',
    contactPerson: 'Sister Mary',
    phone: '+91 98888 77777',
    email: 'expiry_inst@samanvitha.org',
    address: 'Banjara Hills, Hyderabad',
    capacity: 60,
    verificationStatus: 'Approved',
  });
});

beforeEach(async () => {
  await Notification.deleteMany({});
  await Donation.deleteMany({});
  await Need.deleteMany({});

  testNeed = await Need.create({
    institutionId: testInstitution._id,
    institutionName: testInstitution.name,
    category: 'Rice and packaged essentials',
    itemType: 'Sona Masoori Rice',
    requiredQuantity: 50,
    usableStock: 0,
    reservedQuantity: 0,
    unit: 'bags',
    urgency: 'Critical',
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    address: 'Banjara Hills, Hyderabad',
    status: 'Open',
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Reservation Expiry Service & Atomic Guarantees', () => {
  test('RESERVATION_EXPIRY_HOURS defaults to 72 or env value', () => {
    expect(RESERVATION_EXPIRY_HOURS).toBeGreaterThanOrEqual(1);
    expect(typeof RESERVATION_EXPIRY_HOURS).toBe('number');
  });

  test('isPastDeadline correctly identifies past vs future deadlines', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(isPastDeadline(yesterday)).toBe(true);
    expect(isPastDeadline(tomorrow)).toBe(false);
    expect(isPastDeadline(null)).toBe(false);
  });

  test('1. Expiry releases the reserved quantity exactly once and notifies both parties', async () => {
    const reservedQuantity = 10;
    // Set need's reservedQuantity
    await Need.findByIdAndUpdate(testNeed._id, { reservedQuantity });

    // Donation reserved 75 hours ago (stale > 72h)
    const staleReservedAt = new Date(Date.now() - 75 * 60 * 60 * 1000);
    const donation = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sona Masoori Rice',
      quantity: reservedQuantity,
      unit: 'bags',
      location: 'Banjara Hills, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      reservedAt: staleReservedAt,
      matchedNeedId: testNeed._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    // Run expiration sweep
    const expiredDonations = await expireStaleReservations(72);
    expect(expiredDonations).toHaveLength(1);
    expect(expiredDonations[0]._id.toString()).toBe(donation._id.toString());

    // Verify donation reverted to Listed and associations cleared
    const updatedDonation = await Donation.findById(donation._id);
    expect(updatedDonation.status).toBe(DONATION_STATUS.LISTED);
    expect(updatedDonation.matchedNeedId).toBeNull();
    expect(updatedDonation.matchedInstitutionId).toBeNull();
    expect(updatedDonation.reservedAt).toBeNull();

    // Verify need's reservedQuantity decremented exactly once
    const updatedNeed = await Need.findById(testNeed._id);
    expect(updatedNeed.reservedQuantity).toBe(0);

    // Verify notifications created for both donor and institution
    const donorNotifications = await Notification.find({ userId: donorUser._id });
    expect(donorNotifications.length).toBeGreaterThanOrEqual(1);
    expect(donorNotifications[0].title).toBe('Reservation Expired');
    expect(donorNotifications[0].type).toBe('reservation');

    const instNotifications = await Notification.find({ userId: instUser._id });
    expect(instNotifications.length).toBeGreaterThanOrEqual(1);
    expect(instNotifications[0].title).toBe('Reservation Expired');
    expect(instNotifications[0].type).toBe('reservation');
  });

  test('2. Running the sweep twice does not double-decrement (idempotency)', async () => {
    const quantity = 15;
    await Need.findByIdAndUpdate(testNeed._id, { reservedQuantity: quantity });

    const staleReservedAt = new Date(Date.now() - 80 * 60 * 60 * 1000);
    const donation = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sona Masoori Rice',
      quantity,
      unit: 'bags',
      location: 'Banjara Hills, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      reservedAt: staleReservedAt,
      matchedNeedId: testNeed._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
    });

    // First sweep
    const firstSweep = await expireStaleReservations(72);
    expect(firstSweep).toHaveLength(1);

    const needAfterFirst = await Need.findById(testNeed._id);
    expect(needAfterFirst.reservedQuantity).toBe(0);

    // Second sweep immediately afterwards
    const secondSweep = await expireStaleReservations(72);
    expect(secondSweep).toHaveLength(0);

    const needAfterSecond = await Need.findById(testNeed._id);
    expect(needAfterSecond.reservedQuantity).toBe(0); // MUST NOT become -15
  });

  test('3. Concurrent expiry and a donor action do not corrupt quantities', async () => {
    const quantity = 8;
    await Need.findByIdAndUpdate(testNeed._id, { reservedQuantity: quantity });

    const staleReservedAt = new Date(Date.now() - 75 * 60 * 60 * 1000);
    const donation = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sona Masoori Rice',
      quantity,
      unit: 'bags',
      location: 'Banjara Hills, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      reservedAt: staleReservedAt,
      matchedNeedId: testNeed._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
    });

    // Simulate parallel race: Expiry service vs Donor marking "Ready for delivery"
    const [expiryResult, donorActionResult] = await Promise.all([
      expireDonationRecord(donation),
      Donation.findOneAndUpdate(
        { _id: donation._id, status: DONATION_STATUS.RESERVED },
        { $set: { status: DONATION_STATUS.READY_FOR_DELIVERY } },
        { new: true }
      ),
    ]);

    const finalDonation = await Donation.findById(donation._id);
    const finalNeed = await Need.findById(testNeed._id);

    // Exactly one winner:
    if (expiryResult.expired) {
      // Expiry won
      expect(donorActionResult).toBeNull();
      expect(finalDonation.status).toBe(DONATION_STATUS.LISTED);
      expect(finalNeed.reservedQuantity).toBe(0);
    } else {
      // Donor action won
      expect(donorActionResult).not.toBeNull();
      expect(finalDonation.status).toBe(DONATION_STATUS.READY_FOR_DELIVERY);
      expect(finalNeed.reservedQuantity).toBe(quantity);
    }
  });

  test('4. A donation already Ready for delivery never expires', async () => {
    const quantity = 12;
    await Need.findByIdAndUpdate(testNeed._id, { reservedQuantity: quantity });

    // Donation created 100 hours ago but marked 'Ready for delivery'
    const staleReservedAt = new Date(Date.now() - 100 * 60 * 60 * 1000);
    const donation = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sona Masoori Rice',
      quantity,
      unit: 'bags',
      location: 'Banjara Hills, Hyderabad',
      status: DONATION_STATUS.READY_FOR_DELIVERY,
      reservedAt: staleReservedAt,
      matchedNeedId: testNeed._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
    });

    // Attempt sweep
    const sweepResult = await expireStaleReservations(72);
    expect(sweepResult).toHaveLength(0);

    // Attempt direct record expiration
    const directResult = await expireDonationRecord(donation);
    expect(directResult.expired).toBe(false);

    // Verify donation and need remain completely unchanged
    const unexpiredDonation = await Donation.findById(donation._id);
    expect(unexpiredDonation.status).toBe(DONATION_STATUS.READY_FOR_DELIVERY);
    expect(unexpiredDonation.matchedNeedId.toString()).toBe(testNeed._id.toString());

    const need = await Need.findById(testNeed._id);
    expect(need.reservedQuantity).toBe(quantity);
  });

  test('5. Stale reservation past its own deadline transitions to Expired', async () => {
    const quantity = 5;
    await Need.findByIdAndUpdate(testNeed._id, { reservedQuantity: quantity });

    const pastDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const staleReservedAt = new Date(Date.now() - 90 * 60 * 60 * 1000);

    const donation = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sona Masoori Rice',
      quantity,
      unit: 'bags',
      location: 'Banjara Hills, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      reservedAt: staleReservedAt,
      deadline: pastDeadline,
      matchedNeedId: testNeed._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
    });

    const expiredList = await expireStaleReservations(72);
    expect(expiredList).toHaveLength(1);

    const updatedDonation = await Donation.findById(donation._id);
    expect(updatedDonation.status).toBe(DONATION_STATUS.EXPIRED);

    const updatedNeed = await Need.findById(testNeed._id);
    expect(updatedNeed.reservedQuantity).toBe(0);
  });

  test('6. Lazy expiry cleans up stale reservations during read requests', async () => {
    const quantity = 7;
    await Need.findByIdAndUpdate(testNeed._id, { reservedQuantity: quantity });

    const staleReservedAt = new Date(Date.now() - 85 * 60 * 60 * 1000);
    const donation = await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Rice and packaged essentials',
      itemType: 'Sona Masoori Rice',
      quantity,
      unit: 'bags',
      location: 'Banjara Hills, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      reservedAt: staleReservedAt,
      matchedNeedId: testNeed._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
    });

    // Make a public GET /api/needs/public read request (simulating Render wakeup read)
    const res = await request(app).get('/api/needs/public');
    expect(res.status).toBe(200);

    // The stale reservation should have been automatically cleaned up by lazy expiry
    const updatedDonation = await Donation.findById(donation._id);
    expect(updatedDonation.status).toBe(DONATION_STATUS.LISTED);

    const updatedNeed = await Need.findById(testNeed._id);
    expect(updatedNeed.reservedQuantity).toBe(0);
  });
});
