// Administrator Provisioning Script
// -----------------------------------------------------------------------------
// Creates or updates the default Admin account exclusively using values from .env.
// Admin accounts can NEVER be created through the public registration API.
// Run with: npm run create-admin
// -----------------------------------------------------------------------------

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.js');
const { ROLES } = require('../config/roles.js');

async function createAdmin() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/samanvitha';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@samanvitha.org';
  const adminPassword = process.env.ADMIN_PASSWORD || 'DemoPassword123!';
  const adminName = process.env.ADMIN_NAME || 'Admin Reviewer';

  console.log(`Connecting to database: ${mongoUri.replace(/:([^:@]{1,})@/, ':****@')}`);
  await mongoose.connect(mongoUri);

  const existing = await User.findOne({ email: adminEmail.toLowerCase() });

  if (existing) {
    existing.name = adminName;
    existing.role = ROLES.ADMIN;
    existing.password = adminPassword; // Will be re-hashed by pre('save')
    existing.status = 'active';
    existing.isSample = false;
    await existing.save();
    console.log(`Admin account [${adminEmail}] successfully updated.`);
  } else {
    await User.create({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      name: adminName,
      role: ROLES.ADMIN,
      phone: '+91 90000 00001',
      status: 'active',
      isSample: false,
    });
    console.log(`Admin account [${adminEmail}] successfully created.`);
  }

  await mongoose.disconnect();
  console.log('Database disconnected. Admin setup complete.');
}

createAdmin().catch((err) => {
  console.error('Error creating admin account:', err.message);
  process.exit(1);
});
