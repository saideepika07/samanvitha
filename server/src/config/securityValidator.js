// Production Security Configuration Validator
// -----------------------------------------------------------------------------
// In production, enforces that:
// 1. JWT_SECRET is present, at least 32 characters long, and not a development default.
// 2. ADMIN_PASSWORD is not a known default (e.g. DemoPassword123!).
// -----------------------------------------------------------------------------

const FORBIDDEN_JWT_SECRETS = [
  'samanvitha_default_jwt_secret',
  'samanvitha_development_jwt_secret_key_change_in_production_2026',
  'test_jwt_secret_key_12345',
  'secret',
  'jwt_secret',
  'changeme',
  'development',
  'your_super_secret_jwt_key_at_least_32_characters_long',
  'your_secure_random_64_character_jwt_secret_here',
];

const FORBIDDEN_ADMIN_PASSWORDS = [
  'demopassword123!',
  'admin',
  'admin123',
  'admin@123',
  'password',
  'password123',
  '12345678',
  'samanvitha',
];

function validateProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') {
    return; // Development and test environments skip production credential enforcement
  }

  const jwtSecret = process.env.JWT_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // 1. JWT_SECRET Checks
  if (!jwtSecret || !jwtSecret.trim()) {
    const errorMsg =
      '\n================================================================================\n' +
      'CRITICAL CONFIGURATION ERROR: JWT_SECRET is Missing in Production!\n' +
      '================================================================================\n' +
      'In production, JWT_SECRET must be explicitly set to a cryptographically\n' +
      'secure, random string of at least 32 characters.\n' +
      '================================================================================\n';
    console.error(errorMsg);
    throw new Error('JWT_SECRET is required in production.');
  }

  if (jwtSecret.trim().length < 32) {
    const errorMsg =
      '\n================================================================================\n' +
      'CRITICAL CONFIGURATION ERROR: JWT_SECRET is Too Short in Production!\n' +
      '================================================================================\n' +
      `JWT_SECRET must be at least 32 characters long (received: ${jwtSecret.trim().length} chars).\n` +
      'Generate a strong random secret using: openssl rand -base64 48\n' +
      '================================================================================\n';
    console.error(errorMsg);
    throw new Error('JWT_SECRET must be at least 32 characters long in production.');
  }

  if (FORBIDDEN_JWT_SECRETS.includes(jwtSecret.trim().toLowerCase())) {
    const errorMsg =
      '\n================================================================================\n' +
      'CRITICAL CONFIGURATION ERROR: Insecure Default JWT_SECRET in Production!\n' +
      '================================================================================\n' +
      'The current JWT_SECRET is a known development or example default.\n' +
      'It must be replaced with a unique secret before running in production.\n' +
      '================================================================================\n';
    console.error(errorMsg);
    throw new Error('JWT_SECRET cannot be a known development default in production.');
  }

  // 2. ADMIN_PASSWORD Checks
  if (adminPassword && FORBIDDEN_ADMIN_PASSWORDS.includes(adminPassword.trim().toLowerCase())) {
    const errorMsg =
      '\n================================================================================\n' +
      'CRITICAL CONFIGURATION ERROR: Default ADMIN_PASSWORD in Production!\n' +
      '================================================================================\n' +
      'ADMIN_PASSWORD is set to a known development/demo default (e.g. DemoPassword123!).\n' +
      'In production, you must set a strong, unique administrator password.\n' +
      '================================================================================\n';
    console.error(errorMsg);
    throw new Error('ADMIN_PASSWORD cannot be a known default in production.');
  }
}

module.exports = {
  validateProductionSecrets,
  FORBIDDEN_JWT_SECRETS,
  FORBIDDEN_ADMIN_PASSWORDS,
};
