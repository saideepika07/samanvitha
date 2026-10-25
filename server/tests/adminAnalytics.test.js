// Automated Test Suite for Milestone B5: Admin Analytics, User Directory & System Governance
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const Need = require('../src/models/Need.js');
const Donation = require('../src/models/Donation.js');
const Dispute = require('../src/models/Dispute.js');
const { ROLES } = require('../src/config/roles.js');
const { DONATION_STATUS } = require('../src/config/donationStatus.js');

let adminUser;
let adminToken;
let donorUser;
let donorToken;
let sampleInstitution;

beforeAll(async () => {
  await connectTestDB();

  adminUser = await User.create({
    email: 'admin_analytics@samanvitha.org',
    password: 'AdminPassword123!',
    name: 'Super Admin',
    role: ROLES.ADMIN,
  });
  adminToken = adminUser.generateAuthToken();

  donorUser = await User.create({
    email: 'donor_analytics@samanvitha.org',
    password: 'Password123!',
    name: 'Analytics Test Donor',
    role: ROLES.DONOR,
    phone: '+91 98888 77777',
    address: 'Madhapur, Hyderabad',
  });
  donorToken = donorUser.generateAuthToken();

  const instUser = await User.create({
    email: 'inst_analytics@samanvitha.org',
    password: 'Password123!',
    name: 'Analytics Care Home',
    role: ROLES.INSTITUTION,
  });

  sampleInstitution = await Institution.create({
    userId: instUser._id,
    name: 'Analytics Care Home',
    institutionType: 'orphanage',
    contactPerson: 'Director Analytics',
    phone: '+91 97777 66666',
    email: 'inst_analytics@samanvitha.org',
    address: 'Peerzadiguda, Hyderabad',
    capacity: 60,
    verificationStatus: 'Approved',
  });

  // Create sample need
  await Need.create({
    institutionId: sampleInstitution._id,
    institutionName: sampleInstitution.name,
    category: 'Books and educational supplies',
    itemType: 'Textbooks (Grade 6-10)',
    requiredQuantity: 100,
    usableStock: 25,
    reservedQuantity: 15,
    unit: 'sets',
    urgency: 'High',
    address: 'Peerzadiguda, Hyderabad',
    status: 'Open',
  });

  // Create sample donation
  await Donation.create({
    donorId: donorUser._id,
    donorName: donorUser.name,
    category: 'Books and educational supplies',
    itemType: 'Textbooks (Grade 6-10)',
    quantity: 15,
    unit: 'sets',
    location: 'Madhapur, Hyderabad',
    status: DONATION_STATUS.COMPLETED,
  });

  // Create sample dispute
  await Dispute.create({
    donorId: donorUser._id,
    donorName: donorUser.name,
    institutionId: sampleInstitution._id,
    institutionName: sampleInstitution.name,
    raisedBy: donorUser._id,
    raisedByRole: 'donor',
    issueType: 'Delivery Delay',
    description: 'Vehicle transit delay.',
    status: 'Resolved',
    resolvedAt: new Date(),
    resolutionNotes: 'Delivered successfully the next day.',
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Milestone B5: Admin Analytics & KPI Aggregates', () => {
  it('GET /api/admin/analytics rejects unauthorized non-admin users (403)', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).toBe(403);
  });

  it('GET /api/admin/analytics aggregates accurate system metrics', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { users, institutions, needs, donations, disputes, categoryData } = res.body.data;

    // Users KPIs
    expect(users.total).toBeGreaterThanOrEqual(3);
    expect(users.donors).toBeGreaterThanOrEqual(1);
    expect(users.institutions).toBeGreaterThanOrEqual(1);
    expect(users.admins).toBeGreaterThanOrEqual(1);

    // Institutions KPIs
    expect(institutions.total).toBeGreaterThanOrEqual(1);
    expect(institutions.approved).toBeGreaterThanOrEqual(1);

    // Deficit Needs KPIs
    expect(needs.totalNeeds).toBeGreaterThanOrEqual(1);
    expect(needs.totalRequired).toBeGreaterThanOrEqual(100);
    expect(needs.totalUsableStock).toBeGreaterThanOrEqual(25);
    expect(needs.totalReservedQuantity).toBeGreaterThanOrEqual(15);
    expect(needs.totalRemainingDeficit).toBeGreaterThanOrEqual(60); // 100 - 25 - 15 = 60

    // Donations KPIs
    expect(donations.total).toBeGreaterThanOrEqual(1);
    expect(donations.completed).toBeGreaterThanOrEqual(1);

    // Disputes KPIs
    expect(disputes.total).toBeGreaterThanOrEqual(1);
    expect(disputes.resolved).toBeGreaterThanOrEqual(1);

    // Category distribution
    expect(categoryData.length).toBe(3); // Clothes, Books, Rice
    const booksCat = categoryData.find((c) => c.category === 'Books and educational supplies');
    expect(booksCat).toBeTruthy();
    expect(booksCat.required).toBeGreaterThanOrEqual(100);
  });

  it('GET /api/admin/analytics counts Received and Completed donations as completed deliveries and excludes Cancelled from pledged total', async () => {
    // Create one Received donation and one Cancelled donation
    await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Clothes (including sarees)',
      itemType: 'Cotton Sarees',
      quantity: 10,
      unit: 'items',
      location: 'Madhapur, Hyderabad',
      status: DONATION_STATUS.RECEIVED,
    });

    await Donation.create({
      donorId: donorUser._id,
      donorName: donorUser.name,
      category: 'Clothes (including sarees)',
      itemType: 'Kids Winter Wear',
      quantity: 5,
      unit: 'items',
      location: 'Ameenpur, Hyderabad',
      status: DONATION_STATUS.CANCELLED,
    });

    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { donations } = res.body.data;

    // donations.completed must count both Completed (1 from beforeAll) + Received (1) = 2
    expect(donations.completed).toBe(2);

    // donations.total (pledged donations) must count only non-cancelled donations
    // (1 Completed + 1 Received = 2 pledged donations; 1 Cancelled is excluded)
    expect(donations.total).toBe(2);
    expect(donations.allTotal).toBe(3); // Total including cancelled
    expect(donations.byStatus[DONATION_STATUS.RECEIVED]).toBe(1);
    expect(donations.byStatus[DONATION_STATUS.COMPLETED]).toBe(1);
    expect(donations.byStatus[DONATION_STATUS.CANCELLED]).toBe(1);
  });
});

describe('Milestone B5: Registered Users Directory & Account Status Management', () => {
  it('GET /api/admin/users lists registered accounts and excludes password hashes', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(3);

    // Sensitive security check: No password hash must ever leak to admin or client
    res.body.data.forEach((u) => {
      expect(u.password).toBeUndefined();
    });
  });

  it('PUT /api/admin/users/:id/status allows admin to suspend a user account', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${donorUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'suspended',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('suspended');

    const check = await User.findById(donorUser._id);
    expect(check.status).toBe('suspended');
  });

  it('PUT /api/admin/users/:id/status prevents an administrator from suspending their own account', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${adminUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'suspended',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Administrators cannot modify or suspend their own accounts');
  });
});
