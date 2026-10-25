// Automated Test Suite: Production Security Configuration Validation
const { validateProductionSecrets } = require('../src/config/securityValidator.js');

describe('Production Security Validator (validateProductionSecrets)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Non-production environments', () => {
    it('should not throw in development even with default or missing secrets', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'short';
      process.env.ADMIN_PASSWORD = 'DemoPassword123!';

      expect(() => validateProductionSecrets()).not.toThrow();
    });

    it('should not throw in test environment with test secret', () => {
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
      process.env.ADMIN_PASSWORD = 'DemoPassword123!';

      expect(() => validateProductionSecrets()).not.toThrow();
    });
  });

  describe('Production environment enforcement', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should throw if JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.ADMIN_PASSWORD = 'AStrongUniquePassword987!#';

      expect(() => validateProductionSecrets()).toThrow(/JWT_SECRET is required in production/i);
    });

    it('should throw if JWT_SECRET is shorter than 32 characters', () => {
      process.env.JWT_SECRET = 'short_secret_under_32_chars';
      process.env.ADMIN_PASSWORD = 'AStrongUniquePassword987!#';

      expect(() => validateProductionSecrets()).toThrow(
        /JWT_SECRET must be at least 32 characters long in production/i
      );
    });

    it('should throw if JWT_SECRET is a known development default', () => {
      process.env.JWT_SECRET = 'samanvitha_development_jwt_secret_key_change_in_production_2026';
      process.env.ADMIN_PASSWORD = 'AStrongUniquePassword987!#';

      expect(() => validateProductionSecrets()).toThrow(
        /JWT_SECRET cannot be a known development default in production/i
      );
    });

    it('should throw if ADMIN_PASSWORD is DemoPassword123!', () => {
      process.env.JWT_SECRET = 'a_very_secure_and_random_production_jwt_secret_key_2026_xyz';
      process.env.ADMIN_PASSWORD = 'DemoPassword123!';

      expect(() => validateProductionSecrets()).toThrow(
        /ADMIN_PASSWORD cannot be a known default in production/i
      );
    });

    it('should throw if ADMIN_PASSWORD is other known defaults like "admin" or "password123"', () => {
      process.env.JWT_SECRET = 'a_very_secure_and_random_production_jwt_secret_key_2026_xyz';
      process.env.ADMIN_PASSWORD = 'password123';

      expect(() => validateProductionSecrets()).toThrow(
        /ADMIN_PASSWORD cannot be a known default in production/i
      );
    });

    it('should succeed when strong unique production credentials are provided', () => {
      process.env.JWT_SECRET = 'a_very_secure_and_random_production_jwt_secret_key_2026_xyz';
      process.env.ADMIN_PASSWORD = 'V3ry$tr0ng_Un1qu3_P@ssw0rd_F0r_Pr0d!';

      expect(() => validateProductionSecrets()).not.toThrow();
    });
  });
});
