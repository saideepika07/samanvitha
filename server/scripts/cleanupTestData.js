// Test Data Cleanup Utility
// -----------------------------------------------------------------------------
// Safely removes prototype sample records (isSample: true) and user-specified
// test accounts along with their associated needs, donations, and notifications.
//
// SAFETY GUARDS:
// 1. Defaults to DRY RUN: only lists targeted records without modifying data.
// 2. Requires explicit --confirm flag to execute actual deletions.
// 3. Refuses to run when NODE_ENV=production unless --force-production is passed.
// 4. NEVER deletes or modifies administrator accounts.
//
// Usage:
//   node server/scripts/cleanupTestData.js (Dry run - lists sample records)
//   node server/scripts/cleanupTestData.js --emails=test1@example.com,test2@example.com (Dry run for specific emails)
//   node server/scripts/cleanupTestData.js --confirm (Deletes sample records)
//   node server/scripts/cleanupTestData.js --confirm --emails=user@test.com (Deletes specified test user & samples)
//   node server/scripts/cleanupTestData.js --force-production --confirm (Allowed only with explicit production override)
// -----------------------------------------------------------------------------

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const Need = require('../src/models/Need.js');
const Donation = require('../src/models/Donation.js');
const Notification = require('../src/models/Notification.js');
const Dispute = require('../src/models/Dispute.js');
const { ROLES } = require('../src/config/roles.js');

/**
 * Parses CLI arguments for email allowlist and flags.
 */
function parseArgs(args = process.argv.slice(2)) {
  const flags = {
    confirm: false,
    forceProduction: false,
    emails: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--confirm') {
      flags.confirm = true;
    } else if (arg === '--force-production') {
      flags.forceProduction = true;
    } else if (arg.startsWith('--emails=')) {
      const list = arg.substring('--emails='.length).split(',');
      flags.emails.push(...list.map((e) => e.trim().toLowerCase()).filter(Boolean));
    } else if (arg.startsWith('--email=')) {
      const email = arg.substring('--email='.length).trim().toLowerCase();
      if (email) flags.emails.push(email);
    } else if (arg === '--email' || arg === '--emails') {
      // Gather subsequent arguments that are not flags
      let j = i + 1;
      while (j < args.length && !args[j].startsWith('--')) {
        const parts = args[j].split(',');
        flags.emails.push(...parts.map((e) => e.trim().toLowerCase()).filter(Boolean));
        j++;
      }
      i = j - 1;
    } else if (arg.includes('@') && !arg.startsWith('--')) {
      flags.emails.push(arg.trim().toLowerCase());
    }
  }

  // Deduplicate emails
  flags.emails = [...new Set(flags.emails)];
  return flags;
}

/**
 * Main cleanup logic. Can be invoked from CLI or programmatically in tests.
 */
async function cleanupTestData(options = {}) {
  const {
    confirm = false,
    forceProduction = false,
    emails = [],
    logger = console,
    customMongoUri = null,
  } = options;

  // 1. Production safety check
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !forceProduction) {
    const err = new Error(
      'CRITICAL SAFETY REJECTION: Refusing to execute cleanupTestData when NODE_ENV=production unless --force-production is explicitly passed.'
    );
    logger.error(`\n[SAFETY SHIELD] ${err.message}\n`);
    throw err;
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@samanvitha.org').toLowerCase();

  // 2. Identify target users
  // A. Sample users (excluding admin)
  const sampleUsers = await User.find({
    isSample: true,
    role: { $ne: ROLES.ADMIN },
    email: { $ne: adminEmail },
  });

  // B. Allowlisted users by email (excluding admin)
  const allowlistedUsers = [];
  const protectedEmails = [];

  for (const email of emails) {
    if (email === adminEmail) {
      protectedEmails.push(email);
      logger.warn(`[SAFETY GUARD] '${email}' is an administrator email and will NEVER be deleted.`);
      continue;
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.info(`[NOTICE] Allowlisted email '${email}' not found in database.`);
      continue;
    }

    if (user.role === ROLES.ADMIN) {
      protectedEmails.push(email);
      logger.warn(`[SAFETY GUARD] User '${email}' has admin role and will NEVER be deleted.`);
      continue;
    }

    allowlistedUsers.push(user);
  }

  // Merge unique target users
  const userMap = new Map();
  sampleUsers.forEach((u) => userMap.set(u._id.toString(), u));
  allowlistedUsers.forEach((u) => userMap.set(u._id.toString(), u));
  const targetUsers = Array.from(userMap.values());
  const targetUserIds = targetUsers.map((u) => u._id);

  // 3. Identify target institutions
  // Either flagged isSample: true or owned by target users
  const targetInstitutions = await Institution.find({
    $or: [{ isSample: true }, { userId: { $in: targetUserIds } }],
  });
  const targetInstitutionIds = targetInstitutions.map((inst) => inst._id);

  // 4. Identify target needs
  // Either flagged isSample: true or created by target institutions
  const targetNeeds = await Need.find({
    $or: [{ isSample: true }, { institutionId: { $in: targetInstitutionIds } }],
  });
  const targetNeedIds = targetNeeds.map((n) => n._id);

  // 5. Identify target donations
  // Either flagged isSample: true, pledged by target donors, or matched to target institutions/needs
  const targetDonations = await Donation.find({
    $or: [
      { isSample: true },
      { donorId: { $in: targetUserIds } },
      { matchedInstitutionId: { $in: targetInstitutionIds } },
      { matchedNeedId: { $in: targetNeedIds } },
    ],
  });
  const targetDonationIds = targetDonations.map((d) => d._id);

  // 6. Identify target notifications
  const targetNotifications = await Notification.find({
    $or: [{ isSample: true }, { userId: { $in: targetUserIds } }],
  });
  const targetNotificationIds = targetNotifications.map((n) => n._id);

  // 7. Identify target disputes
  const targetDisputes = await Dispute.find({
    $or: [
      { isSample: true },
      { donorId: { $in: targetUserIds } },
      { institutionId: { $in: targetInstitutionIds } },
      { raisedBy: { $in: targetUserIds } },
      { donationId: { $in: targetDonationIds } },
    ],
  });
  const targetDisputeIds = targetDisputes.map((d) => d._id);

  const report = {
    isDryRun: !confirm,
    protectedEmails,
    counts: {
      users: targetUsers.length,
      institutions: targetInstitutions.length,
      needs: targetNeeds.length,
      donations: targetDonations.length,
      notifications: targetNotifications.length,
      disputes: targetDisputes.length,
      total:
        targetUsers.length +
        targetInstitutions.length +
        targetNeeds.length +
        targetDonations.length +
        targetNotifications.length +
        targetDisputes.length,
    },
    users: targetUsers.map((u) => ({ id: u._id.toString(), email: u.email, role: u.role, isSample: u.isSample })),
    institutions: targetInstitutions.map((i) => ({ id: i._id.toString(), name: i.name, isSample: i.isSample })),
    needs: targetNeeds.map((n) => ({ id: n._id.toString(), itemType: n.itemType, category: n.category, isSample: n.isSample })),
    donations: targetDonations.map((d) => ({ id: d._id.toString(), itemType: d.itemType, donorName: d.donorName, isSample: d.isSample })),
  };

  // Log report header
  logger.log('\n============================================================');
  logger.log('Samanvitha Test Data Cleanup Utility');
  logger.log(`Execution Mode: ${confirm ? 'LIVE DELETION (--confirm active)' : 'DRY RUN (Simulated)'}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (emails.length > 0) {
    logger.log(`Target Email Allowlist: ${emails.join(', ')}`);
  }
  logger.log('============================================================');

  logger.log(`\nIdentified Records for Deletion:`);
  logger.log(`- Users:         ${report.counts.users}`);
  if (report.users.length > 0) {
    report.users.slice(0, 10).forEach((u) => logger.log(`  • [User] ${u.email} (${u.role})${u.isSample ? ' [isSample]' : ''}`));
    if (report.users.length > 10) logger.log(`  ... and ${report.users.length - 10} more`);
  }

  logger.log(`- Institutions:  ${report.counts.institutions}`);
  if (report.institutions.length > 0) {
    report.institutions.slice(0, 5).forEach((i) => logger.log(`  • [Institution] ${i.name}${i.isSample ? ' [isSample]' : ''}`));
  }

  logger.log(`- Needs:         ${report.counts.needs}`);
  if (report.needs.length > 0) {
    report.needs.slice(0, 5).forEach((n) => logger.log(`  • [Need] ${n.itemType} (${n.category})`));
  }

  logger.log(`- Donations:     ${report.counts.donations}`);
  if (report.donations.length > 0) {
    report.donations.slice(0, 5).forEach((d) => logger.log(`  • [Donation] ${d.itemType} by ${d.donorName}`));
  }

  logger.log(`- Notifications: ${report.counts.notifications}`);
  logger.log(`- Disputes:      ${report.counts.disputes}`);
  logger.log(`Total Target Records: ${report.counts.total}`);

  if (!confirm) {
    logger.log('\n[DRY RUN COMPLETE] Zero records deleted.');
    logger.log('To execute permanent deletion of these records, re-run with --confirm.\n');
    return report;
  }

  // 8. Execute Deletions when --confirm is present
  logger.log('\nExecuting Deletion:');
  const deleteDisputes = await Dispute.deleteMany({ _id: { $in: targetDisputeIds } });
  logger.log(`✓ Deleted ${deleteDisputes.deletedCount} dispute records.`);

  const deleteNotifications = await Notification.deleteMany({ _id: { $in: targetNotificationIds } });
  logger.log(`✓ Deleted ${deleteNotifications.deletedCount} notification records.`);

  const deleteDonations = await Donation.deleteMany({ _id: { $in: targetDonationIds } });
  logger.log(`✓ Deleted ${deleteDonations.deletedCount} donation records.`);

  const deleteNeeds = await Need.deleteMany({ _id: { $in: targetNeedIds } });
  logger.log(`✓ Deleted ${deleteNeeds.deletedCount} need records.`);

  const deleteInstitutions = await Institution.deleteMany({ _id: { $in: targetInstitutionIds } });
  logger.log(`✓ Deleted ${deleteInstitutions.deletedCount} institution profiles.`);

  const deleteUsers = await User.deleteMany({ _id: { $in: targetUserIds } });
  logger.log(`✓ Deleted ${deleteUsers.deletedCount} user accounts.`);

  logger.log('\n[CLEANUP COMPLETED SUCCESSFULLY] All specified test records removed.\n');
  return report;
}

// CLI entry point
if (require.main === module) {
  const flags = parseArgs(process.argv.slice(2));

  // Check production safety immediately
  if (process.env.NODE_ENV === 'production' && !flags.forceProduction) {
    console.error(
      '\n[CRITICAL SAFETY ERROR] Refusing to run cleanup when NODE_ENV=production unless --force-production is explicitly passed.\n'
    );
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/samanvitha';

  (async () => {
    try {
      console.log(`Connecting to database: ${mongoUri.replace(/:([^:@]{1,})@/, ':****@')}`);
      await mongoose.connect(mongoUri);

      await cleanupTestData({
        confirm: flags.confirm,
        forceProduction: flags.forceProduction,
        emails: flags.emails,
      });

      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('\nCleanup execution error:', err.message);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      process.exit(1);
    }
  })();
}

module.exports = {
  cleanupTestData,
  parseArgs,
};
