// Automated Test Suite: Test Data Cleanup Utility & Safety Safeguards
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const { cleanupTestData, parseArgs } = require('../scripts/cleanupTestData.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const Need = require('../src/models/Need.js');
const Donation = require('../src/models/Donation.js');
const Notification = require('../src/models/Notification.js');
const Dispute = require('../src/models/Dispute.js');
const { ROLES } = require('../src/config/roles.js');

describe('Cleanup Test Data Safety & Execution Safeguards', () => {
  const originalEnv = { ...process.env };
  const nullLogger = {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    process.env = originalEnv;
    await disconnectTestDB();
  });

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.ADMIN_EMAIL = 'admin@samanvitha.org';

    // Clear test collections
    await Dispute.deleteMany({});
    await Notification.deleteMany({});
    await Donation.deleteMany({});
    await Need.deleteMany({});
    await Institution.deleteMany({});
    await User.deleteMany({});
  });

  describe('CLI Argument Parser (parseArgs)', () => {
    it('should parse dry run default with no args', () => {
      const parsed = parseArgs([]);
      expect(parsed.confirm).toBe(false);
      expect(parsed.forceProduction).toBe(false);
      expect(parsed.emails).toEqual([]);
    });

    it('should parse --confirm and --force-production flags', () => {
      const parsed = parseArgs(['--confirm', '--force-production']);
      expect(parsed.confirm).toBe(true);
      expect(parsed.forceProduction).toBe(true);
    });

    it('should parse comma-separated emails via --emails=', () => {
      const parsed = parseArgs(['--emails=donor1@test.com,donor2@test.com', '--confirm']);
      expect(parsed.confirm).toBe(true);
      expect(parsed.emails).toEqual(['donor1@test.com', 'donor2@test.com']);
    });

    it('should parse single email via --email and positional emails', () => {
      const parsed = parseArgs(['--email', 'sample@test.com', 'extra@test.com']);
      expect(parsed.emails).toContain('sample@test.com');
      expect(parsed.emails).toContain('extra@test.com');
    });
  });

  describe('Production Environment Shielding', () => {
    it('should reject execution when NODE_ENV=production without --force-production', async () => {
      process.env.NODE_ENV = 'production';

      await expect(
        cleanupTestData({
          confirm: false,
          forceProduction: false,
          logger: nullLogger,
        })
      ).rejects.toThrow(/Refusing to execute cleanupTestData when NODE_ENV=production/i);
    });

    it('should allow execution when NODE_ENV=production with --force-production', async () => {
      process.env.NODE_ENV = 'production';

      const result = await cleanupTestData({
        confirm: false,
        forceProduction: true,
        logger: nullLogger,
      });

      expect(result.isDryRun).toBe(true);
      expect(result.counts.total).toBe(0);
    });
  });

  describe('Admin Protection Safeguard', () => {
    it('should NEVER delete the admin user even if sample flag is set or email is specified', async () => {
      const admin = await User.create({
        email: 'admin@samanvitha.org',
        password: 'AdminPassword123!',
        name: 'Administrator',
        role: ROLES.ADMIN,
        phone: '+91 90000 00001',
        isSample: true, // Should still be protected
      });

      // Attempt cleanup with admin in email allowlist and with --confirm
      const report = await cleanupTestData({
        confirm: true,
        emails: ['admin@samanvitha.org'],
        logger: nullLogger,
      });

      expect(report.protectedEmails).toContain('admin@samanvitha.org');

      // Verify admin still exists in database
      const foundAdmin = await User.findById(admin._id);
      expect(foundAdmin).not.toBeNull();
      expect(foundAdmin.email).toBe('admin@samanvitha.org');
    });
  });

  describe('Dry Run vs Confirm Execution', () => {
    let sampleDonor, regularDonor, sampleInstUser, sampleInst, sampleNeed, sampleDonation;

    beforeEach(async () => {
      // 1. Admin
      await User.create({
        email: 'admin@samanvitha.org',
        password: 'AdminPassword123!',
        name: 'Administrator',
        role: ROLES.ADMIN,
        phone: '+91 90000 00001',
        isSample: false,
      });

      // 2. Sample Donor
      sampleDonor = await User.create({
        email: 'sample_donor@samanvitha.org',
        password: 'Password123!',
        name: 'Sample Donor',
        role: ROLES.DONOR,
        phone: '+91 98765 00001',
        isSample: true,
      });

      // 3. Regular Donor (isSample: false)
      regularDonor = await User.create({
        email: 'real_donor@example.com',
        password: 'Password123!',
        name: 'Real Community Donor',
        role: ROLES.DONOR,
        phone: '+91 98765 00002',
        isSample: false,
      });

      // 4. Sample Institution
      sampleInstUser = await User.create({
        email: 'sample_inst@samanvitha.org',
        password: 'Password123!',
        name: 'Sample Home',
        role: ROLES.INSTITUTION,
        phone: '+91 98765 00003',
        isSample: true,
      });

      sampleInst = await Institution.create({
        userId: sampleInstUser._id,
        name: 'Sample Home',
        institutionType: 'orphanage',
        contactPerson: 'Contact Person',
        phone: '+91 98765 00003',
        email: 'sample_inst@samanvitha.org',
        address: '123 Care Street',
        capacity: 30,
        isSample: true,
      });

      // 5. Sample Need
      sampleNeed = await Need.create({
        institutionId: sampleInst._id,
        institutionName: 'Sample Home',
        category: 'Rice and packaged essentials',
        itemType: 'Sona Masoori Rice',
        requiredQuantity: 100,
        usableStock: 20,
        unit: 'kg',
        urgency: 'High',
        isSample: true,
      });

      // 6. Sample Donation
      sampleDonation = await Donation.create({
        donorId: sampleDonor._id,
        donorName: 'Sample Donor',
        category: 'Rice and packaged essentials',
        itemType: 'Sona Masoori Rice',
        quantity: 50,
        unit: 'kg',
        location: 'Madhapur',
        isSample: true,
      });
    });

    it('dry run (confirm: false) should list records without deleting anything', async () => {
      const report = await cleanupTestData({
        confirm: false,
        logger: nullLogger,
      });

      expect(report.isDryRun).toBe(true);
      expect(report.counts.users).toBe(2); // sampleDonor, sampleInstUser
      expect(report.counts.institutions).toBe(1);
      expect(report.counts.needs).toBe(1);
      expect(report.counts.donations).toBe(1);

      // Verify records are still in database
      const usersCount = await User.countDocuments();
      expect(usersCount).toBe(4); // admin + sampleDonor + sampleInstUser + regularDonor = 4 in total
      const needsCount = await Need.countDocuments();
      expect(needsCount).toBe(1);
    });

    it('confirm: true should delete sample records and leave non-sample records untouched', async () => {
      const report = await cleanupTestData({
        confirm: true,
        logger: nullLogger,
      });

      expect(report.isDryRun).toBe(false);

      // Verify sample records are gone
      const remainingUsers = await User.find();
      expect(remainingUsers.length).toBe(2); // Only admin and real_donor@example.com
      const emails = remainingUsers.map((u) => u.email);
      expect(emails).toContain('admin@samanvitha.org');
      expect(emails).toContain('real_donor@example.com');
      expect(emails).not.toContain('sample_donor@samanvitha.org');

      const remainingNeeds = await Need.countDocuments();
      expect(remainingNeeds).toBe(0);

      const remainingDonations = await Donation.countDocuments();
      expect(remainingDonations).toBe(0);
    });

    it('should delete a specifically allowlisted test email and its associated records', async () => {
      // Create a test donation by the real donor
      const testDonation = await Donation.create({
        donorId: regularDonor._id,
        donorName: 'Real Community Donor',
        category: 'Clothes (including sarees)',
        itemType: 'Cotton Sarees',
        quantity: 10,
        unit: 'pieces',
        location: 'Koti',
        isSample: false, // Not flagged as sample!
      });

      // Run cleanup explicitly targeting real_donor@example.com with --confirm
      const report = await cleanupTestData({
        confirm: true,
        emails: ['real_donor@example.com'],
        logger: nullLogger,
      });

      expect(report.counts.users).toBe(3); // 2 sample users + 1 allowlisted user

      // Check real donor and their donation were deleted
      const foundUser = await User.findOne({ email: 'real_donor@example.com' });
      expect(foundUser).toBeNull();

      const foundDonation = await Donation.findById(testDonation._id);
      expect(foundDonation).toBeNull();

      // Admin is still present
      const adminUser = await User.findOne({ email: 'admin@samanvitha.org' });
      expect(adminUser).not.toBeNull();
    });
  });
});
