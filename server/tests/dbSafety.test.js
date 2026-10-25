// Automated Test Suite: Database Isolation & Atlas Protection Safeguards
const mongoose = require('mongoose');
const { validateTestUri, connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const connectDB = require('../src/config/db.js');

describe('Database Safety & Isolation Safeguards', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    process.env = originalEnv;
    await disconnectTestDB();
  });

  describe('Atlas Production Database Rejection', () => {
    it('should reject production Atlas URI from being used as MONGODB_TEST_URI', () => {
      const prodAtlasUri =
        'mongodb+srv://saideepikatanguturi7_db_user:Samanvitha7@samanvitha-cluster.qvdbd18.mongodb.net/Samanvitha';

      expect(() => {
        validateTestUri(prodAtlasUri);
      }).toThrow(/CRITICAL SAFETY SAFEGUARD/i);
    });

    it('should reject non-test database URIs on mongodb+srv cluster', () => {
      const atlasProd = 'mongodb+srv://user:pass@samanvitha-cluster.qvdbd18.mongodb.net/production';
      expect(() => {
        validateTestUri(atlasProd);
      }).toThrow(/CRITICAL SAFETY SAFEGUARD/i);
    });

    it('should allow valid local test database URIs', () => {
      const validTestUri = 'mongodb://127.0.0.1:27017/samanvitha_test';
      expect(() => {
        validateTestUri(validTestUri);
      }).not.toThrow();
    });

    it('connectDB should throw critical safety error if NODE_ENV=test and Atlas URI is targeted', async () => {
      const prodAtlasUri =
        'mongodb+srv://saideepikatanguturi7_db_user:Samanvitha7@samanvitha-cluster.qvdbd18.mongodb.net/Samanvitha';

      await expect(connectDB(prodAtlasUri)).rejects.toThrow(
        /CRITICAL SAFETY SAFEGUARD: Tests cannot run against production or non-test Atlas database/i
      );
    });
  });

  describe('In-Memory / Test DB Isolation', () => {
    it('connectTestDB should spin up in-memory database and overwrite process.env.MONGODB_URI', async () => {
      const { uri, mongoServer } = await connectTestDB();

      expect(uri).toBeDefined();
      expect(mongoServer).toBeDefined();
      expect(process.env.MONGODB_URI).toBe(uri);
      expect(process.env.MONGODB_TEST_URI).toBe(uri);
      expect(process.env.MONGODB_URI).not.toMatch(/samanvitha-cluster/i);
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected

      await disconnectTestDB();
    });
  });
});
