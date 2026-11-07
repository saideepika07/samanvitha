// Automated Test Suite for Over-Allocation Prevention & Partial Reservations
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
const { reconcileInconsistentNeeds, scanInconsistentNeeds } = require('../scripts/reconcileInconsistentNeeds.js');

let donor1, donor1Token;
let donor2, donor2Token;
let instUser, instToken, testInstitution;

beforeAll(async () => {
  await connectTestDB();

  // Create Donor 1
  donor1 = await User.create({
    email: 'donor_overalloc_1@samanvitha.org',
    password: 'Password123!',
    name: 'Primary Donor',
    role: ROLES.DONOR,
    address: 'Madhapur, Hyderabad',
  });
  donor1Token = donor1.generateAuthToken();

  // Create Donor 2
  donor2 = await User.create({
    email: 'donor_overalloc_2@samanvitha.org',
    password: 'Password123!',
    name: 'Secondary Donor',
    role: ROLES.DONOR,
    address: 'Jubilee Hills, Hyderabad',
  });
  donor2Token = donor2.generateAuthToken();

  // Create Institution
  instUser = await User.create({
    email: 'inst_overalloc@samanvitha.org',
    password: 'Password123!',
    name: 'Care Home OverAlloc',
    role: ROLES.INSTITUTION,
  });
  instToken = instUser.generateAuthToken();

  testInstitution = await Institution.create({
    userId: instUser._id,
    name: 'Care Home OverAlloc',
    institutionType: 'orphanage',
    contactPerson: 'Director OverAlloc',
    phone: '+91 91234 56789',
    email: 'inst_overalloc@samanvitha.org',
    address: 'Madhapur, Hyderabad',
    capacity: 50,
    verificationStatus: 'Approved',
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Over-Allocation Prevention & Partial Reservation Tests', () => {
  // Test 1: donation 20 vs remaining 15 reserves 15 and leaves 5 Listed
  it('1. donation 20 vs remaining 15 reserves 15 and leaves 5 Listed', async () => {
    // Need: required 30, usableStock 15 -> remaining = 15
    const need = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Books and educational supplies',
      itemType: 'School Notebooks',
      requiredQuantity: 30,
      usableStock: 15,
      reservedQuantity: 0,
      unit: 'items',
      urgency: 'High',
      status: 'Open',
    });

    // Donation of 20 units
    const donation = await Donation.create({
      donorId: donor1._id,
      donorName: donor1.name,
      category: 'Books and educational supplies',
      itemType: 'School Notebooks',
      quantity: 20,
      unit: 'items',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    const res = await request(app)
      .post('/api/matches/reserve')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        donationId: donation._id,
        needId: need._id,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify need reservedQuantity is 15 (never 20!) and status is Fulfilled
    const updatedNeed = await Need.findById(need._id);
    expect(updatedNeed.reservedQuantity).toBe(15);
    expect(updatedNeed.usableStock).toBe(15);
    expect(updatedNeed.usableStock + updatedNeed.reservedQuantity).toBe(30);
    expect(updatedNeed.remainingNeed).toBe(0);

    // Verify original donation kept 5 units as Listed
    const updatedOriginal = await Donation.findById(donation._id);
    expect(updatedOriginal.quantity).toBe(5);
    expect(updatedOriginal.status).toBe(DONATION_STATUS.LISTED);
    expect(updatedOriginal.matchedNeedId).toBeNull();
    expect(updatedOriginal.availableQuantity).toBe(5);

    // Verify reserved slice of 15 units exists
    const reservedSlice = await Donation.findOne({
      matchedNeedId: need._id,
      status: DONATION_STATUS.RESERVED,
    });
    expect(reservedSlice).not.toBeNull();
    expect(reservedSlice.quantity).toBe(15);
    expect(reservedSlice.reservedQuantity).toBe(15);
    expect(reservedSlice.availableQuantity).toBe(0);
  });

  // Test 2: donation 10 vs remaining 0 is rejected
  it('2. donation 10 vs remaining 0 is rejected with a clear message', async () => {
    // Need: required 20, usableStock 20 -> remaining = 0
    const fulfilledNeed = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Rice and packaged essentials',
      itemType: 'Basmati Rice',
      requiredQuantity: 20,
      usableStock: 20,
      reservedQuantity: 0,
      unit: 'bags',
      urgency: 'Medium',
      status: 'Fulfilled',
    });

    const donation = await Donation.create({
      donorId: donor1._id,
      donorName: donor1.name,
      category: 'Rice and packaged essentials',
      itemType: 'Basmati Rice',
      quantity: 10,
      unit: 'bags',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    const res = await request(app)
      .post('/api/matches/reserve')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        donationId: donation._id,
        needId: fulfilledNeed._id,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already been completely fulfilled or reserved/i);

    // Verify database was untouched
    const needInDb = await Need.findById(fulfilledNeed._id);
    expect(needInDb.reservedQuantity).toBe(0);

    const donationInDb = await Donation.findById(donation._id);
    expect(donationInDb.quantity).toBe(10);
    expect(donationInDb.status).toBe(DONATION_STATUS.LISTED);
  });

  // Test 3: two donors of 10 each vs remaining 15 at the same time reserve at most 15 in total
  it('3. two donors of 10 each vs remaining 15 at the same time reserve at most 15 in total', async () => {
    // Need: required 20, usableStock 5 -> remaining = 15
    const concurrentNeed = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Clothes (including sarees)',
      itemType: 'Warm Jackets',
      requiredQuantity: 20,
      usableStock: 5,
      reservedQuantity: 0,
      unit: 'items',
      urgency: 'Critical',
      status: 'Open',
    });

    // Donor 1 has 10 units
    const donA = await Donation.create({
      donorId: donor1._id,
      donorName: donor1.name,
      category: 'Clothes (including sarees)',
      itemType: 'Warm Jackets',
      quantity: 10,
      unit: 'items',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    // Donor 2 has 10 units
    const donB = await Donation.create({
      donorId: donor2._id,
      donorName: donor2.name,
      category: 'Clothes (including sarees)',
      itemType: 'Warm Jackets',
      quantity: 10,
      unit: 'items',
      location: 'Jubilee Hills, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    // Fire both reservation requests concurrently
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${donor1Token}`)
        .send({
          donationId: donA._id,
          needId: concurrentNeed._id,
          quantity: 10,
        }),
      request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${donor2Token}`)
        .send({
          donationId: donB._id,
          needId: concurrentNeed._id,
          quantity: 10,
        }),
    ]);

    // Check the Need state in DB: stock + reserved MUST NOT exceed required (20)
    const needInDb = await Need.findById(concurrentNeed._id);
    const totalAllocated = needInDb.usableStock + needInDb.reservedQuantity;
    expect(totalAllocated).toBeLessThanOrEqual(20);
    expect(needInDb.reservedQuantity).toBeLessThanOrEqual(15);

    // Exactly one reservation succeeded for 10 units; the second was rejected because 5 < 10
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 400]);

    expect(needInDb.reservedQuantity).toBe(10);
  });

  // Test 4: acknowledge adds exactly the reserved quantity
  it('4. acknowledge adds exactly the reserved quantity (not the full donation quantity)', async () => {
    // Need: required 30, usableStock 10, reservedQuantity 12 -> remaining = 8
    const need = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Books and educational supplies',
      itemType: 'Geometry Sets',
      requiredQuantity: 30,
      usableStock: 10,
      reservedQuantity: 12,
      unit: 'sets',
      urgency: 'Medium',
      status: 'Open',
    });

    // A donation with quantity 20, but reservedQuantity is 12 (simulating a partial reservation)
    const reservedDonation = await Donation.create({
      donorId: donor1._id,
      donorName: donor1.name,
      category: 'Books and educational supplies',
      itemType: 'Geometry Sets',
      quantity: 12,
      reservedQuantity: 12,
      unit: 'sets',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.DELIVERED,
      matchedNeedId: need._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
      reservedAt: new Date(),
    });

    // Institution marks donation as Received
    const res = await request(app)
      .put(`/api/donations/${reservedDonation._id}/status`)
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        status: DONATION_STATUS.RECEIVED,
      });

    expect(res.status).toBe(200);

    // Verify usableStock incremented by exactly 12 (from 10 to 22), NOT any other quantity
    const needInDb = await Need.findById(need._id);
    expect(needInDb.usableStock).toBe(22);
    expect(needInDb.reservedQuantity).toBe(0);
    expect(needInDb.remainingNeed).toBe(8);

    // Transitioning from Received to Completed must not add quantity again
    const completeRes = await request(app)
      .put(`/api/donations/${reservedDonation._id}/status`)
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        status: DONATION_STATUS.COMPLETED,
      });

    expect(completeRes.status).toBe(200);
    const needAfterComplete = await Need.findById(need._id);
    expect(needAfterComplete.usableStock).toBe(22);
    expect(needAfterComplete.reservedQuantity).toBe(0);
  });

  // Test 5: cancel and expiry release exactly the reserved quantity once
  it('5. cancel and expiry release exactly the reserved quantity once', async () => {
    // 5A: Cancellation
    const cancelNeed = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Rice and packaged essentials',
      itemType: 'Moong Dal',
      requiredQuantity: 25,
      usableStock: 5,
      reservedQuantity: 14,
      unit: 'kg',
      urgency: 'High',
      status: 'Open',
    });

    const donationToCancel = await Donation.create({
      donorId: donor1._id,
      donorName: donor1.name,
      category: 'Rice and packaged essentials',
      itemType: 'Moong Dal',
      quantity: 14,
      reservedQuantity: 14,
      unit: 'kg',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      matchedNeedId: cancelNeed._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
      reservedAt: new Date(),
    });

    const cancelRes = await request(app)
      .post(`/api/donations/${donationToCancel._id}/cancel`)
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({ reason: 'Change of travel plans' });

    expect(cancelRes.status).toBe(200);

    const needAfterCancel = await Need.findById(cancelNeed._id);
    expect(needAfterCancel.reservedQuantity).toBe(0);

    // Calling cancel a second time must not decrement below 0
    await request(app)
      .post(`/api/donations/${donationToCancel._id}/cancel`)
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({ reason: 'Duplicate' });

    const needAfterSecondCancel = await Need.findById(cancelNeed._id);
    expect(needAfterSecondCancel.reservedQuantity).toBe(0);

    // 5B: Expiry
    const expireNeed = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Rice and packaged essentials',
      itemType: 'Toor Dal',
      requiredQuantity: 30,
      usableStock: 10,
      reservedQuantity: 11,
      unit: 'kg',
      urgency: 'Medium',
      status: 'Open',
    });

    const donationToExpire = await Donation.create({
      donorId: donor1._id,
      donorName: donor1.name,
      category: 'Rice and packaged essentials',
      itemType: 'Toor Dal',
      quantity: 11,
      reservedQuantity: 11,
      unit: 'kg',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.RESERVED,
      matchedNeedId: expireNeed._id,
      matchedInstitutionId: testInstitution._id,
      matchedInstitutionName: testInstitution.name,
      reservedAt: new Date(Date.now() - 100 * 60 * 60 * 1000), // stale
    });

    const expireRes = await request(app)
      .post('/api/matches/expire')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({ donationId: donationToExpire._id });

    expect(expireRes.status).toBe(200);

    const needAfterExpire = await Need.findById(expireNeed._id);
    expect(needAfterExpire.reservedQuantity).toBe(0);

    // Calling expire again must not decrement below 0
    await request(app)
      .post('/api/matches/expire')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({ donationId: donationToExpire._id });

    const needAfterSecondExpire = await Need.findById(expireNeed._id);
    expect(needAfterSecondExpire.reservedQuantity).toBe(0);
  });

  // Test 6: the partial remainder of a donation can be reserved by another need
  it('6. the partial remainder of a donation can be reserved by another need', async () => {
    // Need A: required 20, usableStock 5 -> remaining = 15
    const needA = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Books and educational supplies',
      itemType: 'Drawing Books',
      requiredQuantity: 20,
      usableStock: 5,
      reservedQuantity: 0,
      unit: 'items',
      urgency: 'Medium',
      status: 'Open',
    });

    // Need B: required 10, usableStock 0 -> remaining = 10
    const needB = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Books and educational supplies',
      itemType: 'Drawing Books',
      requiredQuantity: 10,
      usableStock: 0,
      reservedQuantity: 0,
      unit: 'items',
      urgency: 'High',
      status: 'Open',
    });

    // Donation of 20 units
    const donation = await Donation.create({
      donorId: donor1._id,
      donorName: donor1.name,
      category: 'Books and educational supplies',
      itemType: 'Drawing Books',
      quantity: 20,
      unit: 'items',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.LISTED,
    });

    // 1st Reservation: against Need A (reserves 15, leaves 5 Listed)
    const res1 = await request(app)
      .post('/api/matches/reserve')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        donationId: donation._id,
        needId: needA._id,
      });

    expect(res1.status).toBe(200);
    const needAInDb = await Need.findById(needA._id);
    expect(needAInDb.reservedQuantity).toBe(15);

    // Verify original donation now has quantity 5 and is still Listed
    const donationAfterSlice1 = await Donation.findById(donation._id);
    expect(donationAfterSlice1.quantity).toBe(5);
    expect(donationAfterSlice1.status).toBe(DONATION_STATUS.LISTED);

    // 2nd Reservation: reserve the remaining 5 units against Need B
    const res2 = await request(app)
      .post('/api/matches/reserve')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        donationId: donation._id,
        needId: needB._id,
      });

    expect(res2.status).toBe(200);

    // Verify Need B has 5 units reserved
    const needBInDb = await Need.findById(needB._id);
    expect(needBInDb.reservedQuantity).toBe(5);

    // Verify original donation transitioned to RESERVED for Need B with quantity 5
    const finalDonation = await Donation.findById(donation._id);
    expect(finalDonation.quantity).toBe(5);
    expect(finalDonation.status).toBe(DONATION_STATUS.RESERVED);
    expect(finalDonation.matchedNeedId.toString()).toBe(needB._id.toString());
  });

  // Test 7: Reconciliation script detects inconsistent needs and leaves data intact in dry run
  it('7. script lists needs where usableStock + reservedQuantity > requiredQuantity without modifying in dry run', async () => {
    // Create an inconsistent need: required 30, usable 20, reserved 20 -> total 40 > 30 (excess 10)
    const inconsistentNeed = await Need.create({
      institutionId: testInstitution._id,
      institutionName: testInstitution.name,
      category: 'Clothes (including sarees)',
      itemType: 'Thermal Wear',
      requiredQuantity: 30,
      usableStock: 20,
      reservedQuantity: 20,
      unit: 'sets',
      urgency: 'High',
      status: 'Fulfilled',
    });

    // Run scan
    const found = await scanInconsistentNeeds();
    const hasInconsistent = found.some((n) => n._id.toString() === inconsistentNeed._id.toString());
    expect(hasInconsistent).toBe(true);

    // Run dry run reconciliation
    const dryRunResult = await reconcileInconsistentNeeds({ confirm: false });
    expect(dryRunResult.found).toBeGreaterThanOrEqual(1);
    expect(dryRunResult.reconciled).toBe(0);

    // Verify in database: data was NOT changed in dry run
    const needAfterDryRun = await Need.findById(inconsistentNeed._id);
    expect(needAfterDryRun.reservedQuantity).toBe(20);
    expect(needAfterDryRun.usableStock).toBe(20);

    // Run with --confirm: applies reconciliation
    const confirmedResult = await reconcileInconsistentNeeds({ confirm: true });
    expect(confirmedResult.reconciled).toBeGreaterThanOrEqual(1);

    const needAfterConfirm = await Need.findById(inconsistentNeed._id);
    // Target reserved was clamped to max(0, 30 - 20) = 10
    expect(needAfterConfirm.reservedQuantity).toBe(10);
    expect(needAfterConfirm.usableStock + needAfterConfirm.reservedQuantity).toBe(30);
  });

  describe('Edge Cases When Editing a Need (Rules 1-4)', () => {
    // Rule 1: Reject requiredQuantity < reservedQuantity with a clear message
    it('Rule 1: rejects requiredQuantity < reservedQuantity with clear message', async () => {
      const need = await Need.create({
        institutionId: testInstitution._id,
        institutionName: testInstitution.name,
        category: 'Books and educational supplies',
        itemType: 'Exam Pens',
        requiredQuantity: 30,
        usableStock: 5,
        reservedQuantity: 15,
        unit: 'items',
        urgency: 'Medium',
        status: 'Open',
      });

      // Try editing requiredQuantity to 10 (< reservedQuantity of 15)
      const res = await request(app)
        .put(`/api/needs/${need._id}`)
        .set('Authorization', `Bearer ${instToken}`)
        .send({
          requiredQuantity: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe(
        'Required quantity cannot be lower than the quantity already reserved (15)'
      );

      // Verify DB was unchanged
      const dbNeed = await Need.findById(need._id);
      expect(dbNeed.requiredQuantity).toBe(30);
    });

    // Rule 2: If new requiredQuantity < usableStock + reservedQuantity but not lower than reservedQuantity, allow and treat as met (Fulfilled)
    it('Rule 2: allows new requiredQuantity < usableStock + reservedQuantity when >= reservedQuantity and marks as Fulfilled', async () => {
      const need = await Need.create({
        institutionId: testInstitution._id,
        institutionName: testInstitution.name,
        category: 'Books and educational supplies',
        itemType: 'Math Workbooks',
        requiredQuantity: 30,
        usableStock: 15,
        reservedQuantity: 10, // sum stock + reserved = 25
        unit: 'items',
        urgency: 'Medium',
        status: 'Open',
      });

      // Edit requiredQuantity to 20 (< 25, but >= reserved 10)
      const res = await request(app)
        .put(`/api/needs/${need._id}`)
        .set('Authorization', `Bearer ${instToken}`)
        .send({
          requiredQuantity: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiredQuantity).toBe(20);
      expect(res.body.data.remainingNeed).toBe(0);
      expect(res.body.data.status).toBe('Fulfilled');

      // Verify in DB
      const dbNeed = await Need.findById(need._id);
      expect(dbNeed.requiredQuantity).toBe(20);
      expect(dbNeed.status).toBe('Fulfilled');
    });

    // Rule 3: Badge calculations for Surplus, Over-allocated, and Fulfilled
    it('Rule 3: identifies Surplus, Over-allocated, and Fulfilled states accurately', async () => {
      // Case A: Surplus - usableStock >= requiredQuantity and reservedQuantity is 0
      const surplusNeed = await Need.create({
        institutionId: testInstitution._id,
        institutionName: testInstitution.name,
        category: 'Rice and packaged essentials',
        itemType: 'Basmati Rice',
        requiredQuantity: 20,
        usableStock: 25,
        reservedQuantity: 0,
        unit: 'kg',
        urgency: 'Low',
        status: 'Fulfilled',
      });

      const jsonSurplus = surplusNeed.toJSON();
      expect(jsonSurplus.isSurplus).toBe(true);
      expect(jsonSurplus.isOverAllocated).toBe(false);
      expect(jsonSurplus.remainingNeed).toBe(0);

      // Case B: Over-allocated - reservedQuantity > max(0, requiredQuantity - usableStock)
      // e.g. required 30, usable 15, reserved 20 (max(0, 30-15)=15 < 20)
      const overNeed = await Need.create({
        institutionId: testInstitution._id,
        institutionName: testInstitution.name,
        category: 'Books and educational supplies',
        itemType: 'Geometry Sets',
        requiredQuantity: 30,
        usableStock: 15,
        reservedQuantity: 20,
        unit: 'sets',
        urgency: 'High',
        status: 'Fulfilled',
      });

      const jsonOver = overNeed.toJSON();
      expect(jsonOver.isOverAllocated).toBe(true);
      expect(jsonOver.isSurplus).toBe(false);

      // Case C: Fulfilled - remaining is 0 and nothing is over (not surplus, not over-allocated)
      // e.g. required 30, usable 10, reserved 20
      const fulfilledNeed = await Need.create({
        institutionId: testInstitution._id,
        institutionName: testInstitution.name,
        category: 'Clothes (including sarees)',
        itemType: 'Cotton Sarees',
        requiredQuantity: 30,
        usableStock: 10,
        reservedQuantity: 20,
        unit: 'items',
        urgency: 'Medium',
        status: 'Fulfilled',
      });

      const jsonFulfilled = fulfilledNeed.toJSON();
      expect(jsonFulfilled.remainingNeed).toBe(0);
      expect(jsonFulfilled.isOverAllocated).toBe(false);
      expect(jsonFulfilled.isSurplus).toBe(false);
    });

    // Rule 4: Need with remaining 0 must never appear in Match Suggestions and must reject new reservation
    it('Rule 4: need with remaining 0 never appears in match suggestions and rejects new reservation', async () => {
      // Need with remaining deficit = 0 (required 20, stock 20, reserved 0)
      const metNeed = await Need.create({
        institutionId: testInstitution._id,
        institutionName: testInstitution.name,
        category: 'Books and educational supplies',
        itemType: 'Sketch Pads',
        requiredQuantity: 20,
        usableStock: 20,
        reservedQuantity: 0,
        unit: 'items',
        urgency: 'Medium',
        status: 'Fulfilled',
      });

      // Donation of same category
      const donation = await Donation.create({
        donorId: donor1._id,
        donorName: donor1.name,
        category: 'Books and educational supplies',
        itemType: 'Sketch Pads',
        quantity: 10,
        unit: 'items',
        location: 'Madhapur, Hyderabad',
        status: DONATION_STATUS.LISTED,
      });

      // Check match suggestions
      const { getSuggestionsForDonation } = require('../src/services/matchEngine.js');
      const suggestions = await getSuggestionsForDonation(donation._id);
      const metNeedInSuggestions = suggestions.some((m) => m.needId === metNeed._id.toString());
      expect(metNeedInSuggestions).toBe(false);

      // Attempt to reserve against this met need
      const reserveRes = await request(app)
        .post('/api/matches/reserve')
        .set('Authorization', `Bearer ${donor1Token}`)
        .send({
          donationId: donation._id,
          needId: metNeed._id,
        });

      expect(reserveRes.status).toBe(400);
      expect(reserveRes.body.success).toBe(false);
      expect(reserveRes.body.error).toContain(
        'This need has already been completely fulfilled or reserved by other donors.'
      );
    });
  });
});

