// Database Connection Configuration (Mongoose)
const mongoose = require('mongoose');

/**
 * Connect to MongoDB with safety checks preventing test execution against production Atlas database.
 * @param {string} [customUri] - Optional explicit connection URI.
 */
const connectDB = async (customUri) => {
  try {
    let uri = customUri;

    if (process.env.NODE_ENV === 'test') {
      // In test mode, prefer MONGODB_TEST_URI over MONGODB_URI
      uri = uri || process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;

      // Strict safety safeguard: NEVER allow test environment to run against production Atlas database
      if (
        uri &&
        (uri.includes('samanvitha-cluster') ||
          uri.includes('mongodb+srv://') ||
          (!uri.includes('test') && !uri.includes('localhost') && !uri.includes('127.0.0.1')))
      ) {
        const safetyError =
          'CRITICAL SAFETY SAFEGUARD: Tests cannot run against production or non-test Atlas database! ' +
          'Tests must use mongodb-memory-server or a dedicated test database (e.g., MONGODB_TEST_URI=mongodb://127.0.0.1:27017/samanvitha_test).';
        console.error(safetyError);
        throw new Error(safetyError);
      }
    } else {
      uri = uri || process.env.MONGODB_URI;
    }

    if (!uri) {
      throw new Error('Database connection URI is not defined.');
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    // If not in test mode, exit on fatal DB connection error
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw err;
  }
};

module.exports = connectDB;

