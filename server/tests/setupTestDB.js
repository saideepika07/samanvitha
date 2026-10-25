// Test Database Setup & Safety Guard Adapter
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServerInstance = null;

/**
 * Validate that a database URI is safe for running tests.
 * Throws a fatal exception if the URI matches real Atlas production database.
 */
function validateTestUri(uri) {
  if (!uri || typeof uri !== 'string') {
    throw new Error('Test database URI is not defined.');
  }

  const isAtlasCluster = uri.includes('samanvitha-cluster') || uri.includes('mongodb+srv://');
  const isDedicatedTestDb = uri.toLowerCase().includes('_test') || uri.toLowerCase().includes('test');
  const isLocalHost = uri.includes('localhost') || uri.includes('127.0.0.1');

  if (isAtlasCluster && !isDedicatedTestDb) {
    throw new Error(
      `CRITICAL SAFETY SAFEGUARD: Tests cannot run against production Atlas database (${uri})! ` +
      `Tests must use mongodb-memory-server or a dedicated test database (e.g., MONGODB_TEST_URI=mongodb://127.0.0.1:27017/samanvitha_test).`
    );
  }

  if (uri.includes('qvdbd18.mongodb.net/Samanvitha')) {
    throw new Error(
      'CRITICAL SAFETY SAFEGUARD: Tests are strictly forbidden from connecting to production Atlas cluster (Samanvitha database).'
    );
  }
}

/**
 * Connect to test database:
 * 1. Checks if MONGODB_TEST_URI is set.
 *    If set, validates it is a dedicated test database (never production Atlas).
 * 2. If MONGODB_TEST_URI is not set, spins up an isolated mongodb-memory-server instance.
 * 3. Sets process.env.MONGODB_URI and process.env.MONGODB_TEST_URI to the safe URI
 *    so any server code referencing process.env.MONGODB_URI will never touch production.
 */
async function connectTestDB() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';

  let uri = process.env.MONGODB_TEST_URI;

  if (uri) {
    validateTestUri(uri);
  } else {
    mongoServerInstance = await MongoMemoryServer.create();
    uri = mongoServerInstance.getUri();
  }

  // Safety safeguard: Ensure environment variables point to safe test URI
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_TEST_URI = uri;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
  return { uri, mongoServer: mongoServerInstance };
}

/**
 * Disconnect and stop test database
 */
async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServerInstance) {
    await mongoServerInstance.stop();
    mongoServerInstance = null;
  }
}

module.exports = {
  validateTestUri,
  connectTestDB,
  disconnectTestDB,
};
