// Automated Tests for Real Location, Haversine Distance, Boundary Scores, Privacy & Coordinate Validation
const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const Need = require('../src/models/Need.js');
const Donation = require('../src/models/Donation.js');
const { ROLES } = require('../src/config/roles.js');
const {
  calculateHaversineDistance,
  calculateDeliveryFeasibility,
  calculateMatchScore,
} = require('../src/services/matchEngine.js');
const { DELIVERY_CONFIG } = require('../src/config/matchingWeights.js');

let donorUser;
let donorToken;
let instUser;
let instToken;
let testInstitution;
let testNeed;

beforeAll(async () => {
  await connectTestDB();

  donorUser = await User.create({
    email: 'geo_donor@samanvitha.org',
    password: 'Password123!',
    name: 'Geo Donor',
    role: ROLES.DONOR,
    address: 'Madhapur, Hyderabad',
  });
  donorToken = donorUser.generateAuthToken();

  instUser = await User.create({
    email: 'geo_inst@samanvitha.org',
    password: 'Password123!',
    name: 'Geo Care Home',
    role: ROLES.INSTITUTION,
    institutionType: 'orphanage',
  });
  instToken = instUser.generateAuthToken();

  testInstitution = await Institution.create({
    userId: instUser._id,
    name: 'Geo Care Home',
    institutionType: 'orphanage',
    contactPerson: 'Director Rao',
    phone: '+91 91234 56789',
    email: 'geo_inst@samanvitha.org',
    address: 'Ameenpur, Hyderabad',
    latitude: 17.525,
    longitude: 78.324,
    capacity: 40,
    verificationStatus: 'Approved',
  });

  testNeed = await Need.create({
    institutionId: testInstitution._id,
    institutionName: testInstitution.name,
    category: 'Rice and packaged essentials',
    itemType: 'Sona Masoori Rice',
    requiredQuantity: 20,
    usableStock: 0,
    reservedQuantity: 0,
    unit: 'bags',
    urgency: 'Medium',
    latitude: 17.525,
    longitude: 78.324,
    status: 'Open',
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Haversine Formula Known Distances', () => {
  test('returns 0 km for identical coordinates', () => {
    const dist = calculateHaversineDistance(17.385, 78.4867, 17.385, 78.4867);
    expect(dist).toBe(0);
  });

  test('calculates known distance between London and Paris (approx 343 km)', () => {
    // London: 51.5074, -0.1278 | Paris: 48.8566, 2.3522
    const dist = calculateHaversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(340);
    expect(dist).toBeLessThan(346);
  });

  test('calculates 1 degree latitude difference along equator (approx 111.19 km)', () => {
    const dist = calculateHaversineDistance(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110.5);
    expect(dist).toBeLessThan(111.8);
  });

  test('calculates Hyderabad local distance: Charminar to Hitec City (approx 13.5 km)', () => {
    // Charminar: 17.3616, 78.4747 | Hitec City: 17.4435, 78.3772
    const dist = calculateHaversineDistance(17.3616, 78.4747, 17.4435, 78.3772);
    expect(dist).toBeGreaterThan(12.5);
    expect(dist).toBeLessThan(14.5);
  });
});

describe('Delivery Feasibility Boundary Scores (0 km, 2 km, 50 km, beyond)', () => {
  test('distance = 0 km gives feasibility score of 100', () => {
    const res = calculateDeliveryFeasibility(0);
    expect(res.score).toBe(100);
    expect(res.distanceKm).toBe(0);
  });

  test('distance = 1.5 km (within min range <= 2 km) gives feasibility score of 100', () => {
    const res = calculateDeliveryFeasibility(1.5);
    expect(res.score).toBe(100);
    expect(res.distanceKm).toBe(1.5);
  });

  test('distance = 2.0 km (exact min boundary) gives feasibility score of 100', () => {
    const res = calculateDeliveryFeasibility(2.0);
    expect(res.score).toBe(100);
    expect(res.distanceKm).toBe(2);
  });

  test('distance = 26.0 km (exact midpoint between 2 km and 50 km) gives feasibility score of 50', () => {
    const res = calculateDeliveryFeasibility(26.0);
    expect(res.score).toBe(50);
    expect(res.distanceKm).toBe(26);
  });

  test('distance = 50.0 km (exact max range boundary) gives feasibility score of 0', () => {
    const res = calculateDeliveryFeasibility(50.0);
    expect(res.score).toBe(0);
    expect(res.distanceKm).toBe(50);
  });

  test('distance = 65.0 km (beyond max range) gives feasibility score of 0', () => {
    const res = calculateDeliveryFeasibility(65.0);
    expect(res.score).toBe(0);
    expect(res.distanceKm).toBe(65);
  });
});

describe('Missing Coordinates & Fallback Neutral Scoring', () => {
  test('donation missing coordinates returns neutral score of 50 with "Distance unknown" in breakdown', () => {
    const donation = { quantity: 10, latitude: null, longitude: null };
    const need = { requiredQuantity: 10, latitude: 17.525, longitude: 78.324 };

    const scoreData = calculateMatchScore(donation, need);
    expect(scoreData.components.deliveryFeasibility.score).toBe(50);
    expect(scoreData.components.deliveryFeasibility.distanceKm).toBeNull();
    expect(scoreData.components.deliveryFeasibility.distanceText).toBe('Distance unknown');
    expect(scoreData.components.deliveryFeasibility.breakdown).toBe('Distance unknown');
    expect(scoreData.components.deliveryFeasibility.weightedScore).toBe(7.5);
    expect(scoreData.finalScore).toBeGreaterThan(0);
  });

  test('need missing coordinates returns neutral score of 50 with "Distance unknown" in breakdown', () => {
    const donation = { quantity: 10, latitude: 17.448, longitude: 78.391 };
    const need = { requiredQuantity: 10, latitude: null, longitude: null };

    const scoreData = calculateMatchScore(donation, need);
    expect(scoreData.components.deliveryFeasibility.score).toBe(50);
    expect(scoreData.components.deliveryFeasibility.distanceKm).toBeNull();
    expect(scoreData.components.deliveryFeasibility.distanceText).toBe('Distance unknown');
    expect(scoreData.components.deliveryFeasibility.breakdown).toBe('Distance unknown');
    expect(scoreData.components.deliveryFeasibility.weightedScore).toBe(7.5);
  });

  test('both missing coordinates returns neutral score of 50 without rejecting the pair', () => {
    const donation = { quantity: 10, location: 'Hyderabad' };
    const need = { requiredQuantity: 10, address: 'Hyderabad' };

    const scoreData = calculateMatchScore(donation, need);
    expect(scoreData.components.deliveryFeasibility.score).toBe(50);
    expect(scoreData.components.deliveryFeasibility.distanceKm).toBeNull();
    expect(scoreData.components.deliveryFeasibility.distanceText).toBe('Distance unknown');
    expect(scoreData.components.deliveryFeasibility.breakdown).toBe('Distance unknown');
    expect(scoreData.finalScore).toBeGreaterThan(0);
  });

  test('different locality text strings with missing coordinates never reject the pair and yield neutral 50 with "Distance unknown" (no text matching)', () => {
    const donation = { quantity: 10, location: 'Old City, Charminar, Hyderabad', latitude: null, longitude: null };
    const need = { requiredQuantity: 10, address: 'HITEC City, Madhapur, Hyderabad', latitude: null, longitude: null };

    const scoreData = calculateMatchScore(donation, need);
    expect(scoreData.components.deliveryFeasibility.score).toBe(50);
    expect(scoreData.components.deliveryFeasibility.distanceKm).toBeNull();
    expect(scoreData.components.deliveryFeasibility.distanceText).toBe('Distance unknown');
    expect(scoreData.components.deliveryFeasibility.breakdown).toBe('Distance unknown');
    expect(scoreData.finalScore).toBeGreaterThan(0);
  });

  test('handles undefined or non-numeric coordinates gracefully with neutral 50 and "Distance unknown"', () => {
    const donation = { quantity: 10, latitude: 'invalid', longitude: NaN };
    const need = { requiredQuantity: 10 };

    const scoreData = calculateMatchScore(donation, need);
    expect(scoreData.components.deliveryFeasibility.score).toBe(50);
    expect(scoreData.components.deliveryFeasibility.distanceKm).toBeNull();
    expect(scoreData.components.deliveryFeasibility.distanceText).toBe('Distance unknown');
    expect(scoreData.components.deliveryFeasibility.breakdown).toBe('Distance unknown');
  });

  test('preserves exact weights: Urgency (35%), Demand (30%), Time (20%), Delivery Feasibility (15%)', () => {
    const donation = { quantity: 10, latitude: null, longitude: null };
    const need = {
      requiredQuantity: 10,
      usableStock: 0,
      reservedQuantity: 0,
      urgency: 'Critical', // 100 * 0.35 = 35.0
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 100 * 0.20 = 20.0
    };
    // Demand: 10/10 => 100 * 0.30 = 30.0
    // Feasibility: neutral 50 * 0.15 = 7.5
    // Total = 35 + 30 + 20 + 7.5 = 92.5
    const scoreData = calculateMatchScore(donation, need);
    expect(scoreData.components.urgency.weight).toBe(0.35);
    expect(scoreData.components.unfulfilledDemand.weight).toBe(0.30);
    expect(scoreData.components.timeSensitivity.weight).toBe(0.20);
    expect(scoreData.components.deliveryFeasibility.weight).toBe(0.15);
    expect(scoreData.components.deliveryFeasibility.score).toBe(50);
    expect(scoreData.components.deliveryFeasibility.weightedScore).toBe(7.5);
    expect(scoreData.finalScore).toBe(92.5);
  });
});

describe('Donor Privacy: Exact Coordinates Never Exposed (Rounded to 2 Decimals ~1 km)', () => {
  test('rounds donor coordinates to 2 decimal places on save and never persists exact GPS micro-coordinates', async () => {
    const exactLat = 17.448129;
    const exactLng = 78.384562;

    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        category: 'Rice and packaged essentials',
        itemType: 'Sona Masoori Rice',
        quantity: 5,
        unit: 'bags',
        location: 'Madhapur, Hyderabad',
        latitude: exactLat,
        longitude: exactLng,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Stored coordinates must be rounded to 2 decimals (~1.1 km privacy radius)
    expect(res.body.data.latitude).toBe(17.45);
    expect(res.body.data.longitude).toBe(78.38);

    // Verify in database document as well
    const savedDonation = await Donation.findById(res.body.data.id);
    expect(savedDonation.latitude).toBe(17.45);
    expect(savedDonation.longitude).toBe(78.38);
    expect(savedDonation.latitude).not.toBe(exactLat);
    expect(savedDonation.longitude).not.toBe(exactLng);
  });
});

describe('Coordinate Validation: Invalid Coordinates Rejected (lat -90..90, lng -180..180)', () => {
  test('rejects latitude > 90 on donation creation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        category: 'Rice and packaged essentials',
        itemType: 'Wheat flour',
        quantity: 5,
        unit: 'bags',
        location: 'Hyderabad',
        latitude: 95.0,
        longitude: 78.4,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects latitude < -90 on donation creation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        category: 'Rice and packaged essentials',
        itemType: 'Wheat flour',
        quantity: 5,
        unit: 'bags',
        location: 'Hyderabad',
        latitude: -91.5,
        longitude: 78.4,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects longitude > 180 on donation creation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        category: 'Rice and packaged essentials',
        itemType: 'Wheat flour',
        quantity: 5,
        unit: 'bags',
        location: 'Hyderabad',
        latitude: 17.4,
        longitude: 185.0,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects longitude < -180 on donation creation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        category: 'Rice and packaged essentials',
        itemType: 'Wheat flour',
        quantity: 5,
        unit: 'bags',
        location: 'Hyderabad',
        latitude: 17.4,
        longitude: -181.0,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects non-numeric coordinates on donation creation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        category: 'Rice and packaged essentials',
        itemType: 'Wheat flour',
        quantity: 5,
        unit: 'bags',
        location: 'Hyderabad',
        latitude: 'invalid-coordinate',
        longitude: 78.4,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects invalid coordinates on institution profile update', async () => {
    const res = await request(app)
      .put('/api/institutions/me')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        latitude: 105.0,
        longitude: 78.3,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Latitude');
  });

  test('accepts valid coordinates on institution profile update', async () => {
    const res = await request(app)
      .put('/api/institutions/me')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        latitude: 17.44,
        longitude: 78.38,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latitude).toBe(17.44);
    expect(res.body.data.longitude).toBe(78.38);
  });

  test('accepts null coordinates (optional) on institution profile update', async () => {
    const res = await request(app)
      .put('/api/institutions/me')
      .set('Authorization', `Bearer ${instToken}`)
      .send({
        latitude: null,
        longitude: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latitude).toBeNull();
    expect(res.body.data.longitude).toBeNull();
  });
});
