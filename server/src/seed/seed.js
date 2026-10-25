// Database Seed Script for Prototype Sample Records
// -----------------------------------------------------------------------------
// Seeds sample users and institutions.
// All seeded records are explicitly flagged with isSample: true.
// Run with: npm run seed
// -----------------------------------------------------------------------------

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.js');
const Institution = require('../models/Institution.js');
const Need = require('../models/Need.js');
const Donation = require('../models/Donation.js');
const Notification = require('../models/Notification.js');
const Dispute = require('../models/Dispute.js');
const { ROLES } = require('../config/roles.js');
const { DONATION_STATUS } = require('../config/donationStatus.js');

const SAMPLE_USERS = [
  {
    email: 'donor@samanvitha.org',
    password: 'DemoPassword123!',
    name: 'Sravani V.',
    role: ROLES.DONOR,
    accountType: 'individual',
    phone: '+91 98765 43210',
    address: 'Madhapur, Hyderabad',
    status: 'active',
    isSample: true,
  },
  {
    email: 'retailer@samanvitha.org',
    password: 'DemoPassword123!',
    name: 'Sri Krishna Books & Stationers',
    role: ROLES.DONOR,
    accountType: 'shop',
    phone: '+91 98480 12345',
    address: 'Koti, Hyderabad',
    status: 'active',
    isSample: true,
  },
  {
    email: 'institution@samanvitha.org',
    password: 'DemoPassword123!',
    name: 'Sample Orphanage 1',
    role: ROLES.INSTITUTION,
    institutionType: 'orphanage',
    phone: '+91 91234 56789',
    address: 'Plot 12, Peerzadiguda, Hyderabad',
    status: 'active',
    isSample: true,
  },
  {
    email: 'oldage@samanvitha.org',
    password: 'DemoPassword123!',
    name: 'Sample Old-Age Home 1',
    role: ROLES.INSTITUTION,
    institutionType: 'old_age_home',
    phone: '+91 92345 67890',
    address: 'Survey 48, Shamshabad, Hyderabad',
    status: 'active',
    isSample: true,
  },
];

async function seedData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/samanvitha';
  console.log(`Connecting to database for seeding: ${mongoUri.replace(/:([^:@]{1,})@/, ':****@')}`);
  await mongoose.connect(mongoUri);

  // 1. Create or update Admin
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@samanvitha.org').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'DemoPassword123!';
  const adminName = process.env.ADMIN_NAME || 'Admin Reviewer';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: ROLES.ADMIN,
      phone: '+91 90000 00001',
      status: 'active',
      isSample: false,
    });
    console.log(`Created admin account: ${adminEmail}`);
  } else {
    admin.name = adminName;
    admin.role = ROLES.ADMIN;
    admin.password = adminPassword; // Will be re-hashed by pre('save') hook
    admin.status = 'active';
    admin.isSample = false;
    await admin.save();
    console.log(`Updated admin account: ${adminEmail}`);
  }

  // 2. Sample data gate: In production and by default, seed creates ONLY the admin user from env.
  // Sample or demo prototype records are seeded ONLY when an explicit --with-sample flag is passed.
  const shouldSeedSample =
    process.argv.includes('--with-sample') ||
    process.argv.includes('--demo') ||
    process.argv.includes('--with-demo') ||
    process.env.SEED_SAMPLE === 'true' ||
    process.env.SEED_DEMO === 'true';

  if (!shouldSeedSample) {
    console.log('Sample demo users and prototype records skipped. Pass --with-sample flag to seed demo data.');
    await mongoose.disconnect();
    console.log('Database disconnected. Production admin setup complete.');
    return;
  }

  // 3. Seed Sample Users (only when --demo flag is provided)
  for (const userData of SAMPLE_USERS) {
    let user = await User.findOne({ email: userData.email.toLowerCase() });
    if (!user) {
      user = await User.create(userData);
      console.log(`Created user: ${userData.email} (${userData.role})`);
    }

    // 3. Seed Institution profile shell if institution
    if (userData.role === ROLES.INSTITUTION) {
      let inst = await Institution.findOne({ userId: user._id });
      if (!inst) {
        inst = await Institution.create({
          userId: user._id,
          name: userData.name,
          institutionType: userData.institutionType,
          contactPerson: userData.name,
          phone: userData.phone,
          email: userData.email,
          address: userData.address,
          district: 'Hyderabad',
          capacity: 40,
          occupancy: 35,
          verificationStatus: userData.email.includes('oldage') ? 'Pending' : 'Approved',
          verificationNotice: 'Sample verification review for prototype testing.',
          isSample: true,
        });
        console.log(`Created institution profile: ${userData.name}`);
      }
    }
  }

  // 4. Seed Needs for Institutions
  const sampleOrphanage = await Institution.findOne({ email: 'institution@samanvitha.org' });
  if (sampleOrphanage) {
    const existingNeeds = await Need.countDocuments({ institutionId: sampleOrphanage._id });
    if (existingNeeds === 0) {
      await Need.create([
        {
          institutionId: sampleOrphanage._id,
          institutionName: sampleOrphanage.name,
          institutionType: sampleOrphanage.institutionType,
          category: 'Books and educational supplies',
          itemType: 'Ruled Notebooks (192 pgs) & Ballpoint Pens',
          requiredQuantity: 120,
          usableStock: 20,
          reservedQuantity: 30,
          unit: 'sets',
          urgency: 'High',
          deadline: '2026-11-20',
          acceptableCondition: 'New only',
          notes: 'For children preparing for midterm academic evaluations.',
          address: sampleOrphanage.address,
          status: 'Open',
          isSample: true,
        },
        {
          institutionId: sampleOrphanage._id,
          institutionName: sampleOrphanage.name,
          institutionType: sampleOrphanage.institutionType,
          category: 'Rice and packaged essentials',
          itemType: 'Sona Masoori Rice (25kg bags)',
          requiredQuantity: 8,
          usableStock: 2,
          reservedQuantity: 1,
          unit: 'bags',
          urgency: 'Critical',
          deadline: '2026-10-31',
          acceptableCondition: 'Sealed & dry packaging',
          notes: 'Current ration stock will last only until the end of the month.',
          address: sampleOrphanage.address,
          status: 'Open',
          isSample: true,
        },
        {
          institutionId: sampleOrphanage._id,
          institutionName: sampleOrphanage.name,
          institutionType: sampleOrphanage.institutionType,
          category: 'Clothes (including sarees)',
          itemType: 'Warm Sweaters & Jackets (Ages 6-14)',
          requiredQuantity: 50,
          usableStock: 10,
          reservedQuantity: 0,
          unit: 'items',
          urgency: 'High',
          deadline: '2026-11-15',
          acceptableCondition: 'Clean gently used or new',
          notes: 'Winter garments for primary school residents.',
          address: sampleOrphanage.address,
          status: 'Open',
          isSample: true,
        },
      ]);
      console.log('Seeded sample needs for Sample Orphanage 1');
    }
  }

  const sampleOldAge = await Institution.findOne({ email: 'oldage@samanvitha.org' });
  if (sampleOldAge) {
    const existingOldAgeNeeds = await Need.countDocuments({ institutionId: sampleOldAge._id });
    if (existingOldAgeNeeds === 0) {
      await Need.create([
        {
          institutionId: sampleOldAge._id,
          institutionName: sampleOldAge.name,
          institutionType: sampleOldAge.institutionType,
          category: 'Clothes (including sarees)',
          itemType: 'Cotton Sarees & Dhotis',
          requiredQuantity: 35,
          usableStock: 5,
          reservedQuantity: 10,
          unit: 'items',
          urgency: 'Medium',
          deadline: '2026-11-10',
          acceptableCondition: 'Clean gently used or new',
          notes: 'Comfortable daily wear cotton clothing for elderly residents.',
          address: sampleOldAge.address,
          status: 'Open',
          isSample: true,
        },
      ]);
      console.log('Seeded sample needs for Sample Old-Age Home 1');
    }
  }

  // 5. Seed Sample Donations
  const sampleDonor = await User.findOne({ email: 'donor@samanvitha.org' });
  const sampleRetailer = await User.findOne({ email: 'retailer@samanvitha.org' });

  if (sampleDonor && sampleOrphanage) {
    const existingDonations = await Donation.countDocuments({ donorId: sampleDonor._id });
    if (existingDonations === 0) {
      const booksNeed = await Need.findOne({
        institutionId: sampleOrphanage._id,
        category: 'Books and educational supplies',
      });
      const oldAgeSareesNeed = sampleOldAge
        ? await Need.findOne({
            institutionId: sampleOldAge._id,
            category: 'Clothes (including sarees)',
          })
        : null;

      await Donation.create([
        {
          donorId: sampleDonor._id,
          donorName: sampleDonor.name,
          category: 'Books and educational supplies',
          itemType: 'Ruled Notebooks (192 pgs) & Ballpoint Pens',
          quantity: 40,
          unit: 'sets',
          condition: 'New',
          location: 'Madhapur, Hyderabad',
          deadline: '2026-11-18',
          status: DONATION_STATUS.MATCHED,
          matchedNeedId: booksNeed ? booksNeed._id : null,
          matchedInstitutionId: sampleOrphanage._id,
          matchedInstitutionName: sampleOrphanage.name,
          notes: 'Brand new notebooks purchased for charity drive.',
          isSample: true,
        },
        {
          donorId: sampleDonor._id,
          donorName: sampleDonor.name,
          category: 'Clothes (including sarees)',
          itemType: 'Cotton Sarees (clean & folded)',
          quantity: 12,
          unit: 'items',
          condition: 'Gently Used',
          location: 'Madhapur, Hyderabad',
          deadline: '2026-11-20',
          status: DONATION_STATUS.RESERVED,
          matchedNeedId: oldAgeSareesNeed ? oldAgeSareesNeed._id : null,
          matchedInstitutionId: sampleOldAge ? sampleOldAge._id : null,
          matchedInstitutionName: sampleOldAge ? sampleOldAge.name : null,
          notes: 'Washed, ironed, and neatly packed cotton sarees.',
          isSample: true,
        },
      ]);
      console.log('Seeded sample donations for sample donor');
    }
  }

  if (sampleRetailer && sampleOrphanage) {
    const existingRetailerDonations = await Donation.countDocuments({ donorId: sampleRetailer._id });
    if (existingRetailerDonations === 0) {
      const riceNeed = await Need.findOne({
        institutionId: sampleOrphanage._id,
        category: 'Rice and packaged essentials',
      });

      await Donation.create([
        {
          donorId: sampleRetailer._id,
          donorName: sampleRetailer.name,
          category: 'Rice and packaged essentials',
          itemType: 'Sona Masoori Rice (25kg bags)',
          quantity: 5,
          unit: 'bags',
          condition: 'New',
          location: 'Koti, Hyderabad',
          deadline: '2026-10-30',
          status: DONATION_STATUS.READY_FOR_DELIVERY,
          matchedNeedId: riceNeed ? riceNeed._id : null,
          matchedInstitutionId: sampleOrphanage._id,
          matchedInstitutionName: sampleOrphanage.name,
          notes: 'Sealed fresh crop bags ready at store dispatch counter.',
          isSample: true,
        },
      ]);
      console.log('Seeded sample donation for sample retailer');
    }
  }

  // 6. Seed Sample Notifications
  if (sampleDonor) {
    const existingNotifs = await Notification.countDocuments({ userId: sampleDonor._id });
    if (existingNotifs === 0) {
      await Notification.create([
        {
          userId: sampleDonor._id,
          title: 'Match Suggested',
          message: 'Your donation of 40 Notebooks matched with Sample Orphanage 1 (Match Score: 84.8%).',
          type: 'match',
          read: false,
          isSample: true,
        },
        {
          userId: sampleDonor._id,
          title: 'Reservation Confirmed',
          message: 'Sample Old-Age Home 1 reserved your donation of 12 Cotton Sarees.',
          type: 'reservation',
          read: true,
          isSample: true,
        },
      ]);
      console.log('Seeded sample notifications for sample donor');
    }
  }

  const sampleInstUser = await User.findOne({ email: 'institution@samanvitha.org' });
  if (sampleInstUser) {
    const existingInstNotifs = await Notification.countDocuments({ userId: sampleInstUser._id });
    if (existingInstNotifs === 0) {
      await Notification.create([
        {
          userId: sampleInstUser._id,
          title: 'New Donation Match Available',
          message: 'A donor in Madhapur listed 40 Notebook sets matching your High urgency need.',
          type: 'match',
          read: false,
          isSample: true,
        },
      ]);
      console.log('Seeded sample notifications for sample institution');
    }
  }

  // 7. Seed Sample Disputes
  const existingDisputes = await Dispute.countDocuments();
  if (existingDisputes === 0 && sampleDonor && sampleOrphanage) {
    await Dispute.create([
      {
        donorId: sampleDonor._id,
        donorName: sampleDonor.name,
        institutionId: sampleOrphanage._id,
        institutionName: sampleOrphanage.name,
        raisedBy: sampleDonor._id,
        raisedByRole: 'donor',
        issueType: 'Delivery Delay',
        description: 'Scheduled drop-off was delayed due to heavy rains in Shamshabad area. Rescheduled for Monday.',
        status: 'Resolved',
        resolvedAt: new Date(),
        resolutionNotes: 'Mutual drop-off date agreed upon between both parties.',
        isSample: true,
      },
      {
        donorId: sampleDonor._id,
        donorName: sampleDonor.name,
        institutionId: sampleOrphanage._id,
        institutionName: sampleOrphanage.name,
        raisedBy: sampleInstUser ? sampleInstUser._id : sampleDonor._id,
        raisedByRole: 'institution',
        issueType: 'Condition Mismatch',
        description: 'Received item condition differed from listed grade. Donated books had significant tears.',
        status: 'Under Review',
        isSample: true,
      },
    ]);
    console.log('Seeded sample disputes');
  }

  await mongoose.disconnect();
  console.log('Database disconnected. Seeding completed successfully.');
}

seedData().catch((err) => {
  console.error('Seeding error:', err.message);
  process.exit(1);
});
