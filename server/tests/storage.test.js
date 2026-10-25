// Automated Tests for Storage Adapter, Cloudinary Mocking & Private Document Authorization
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Institution = require('../src/models/Institution.js');
const { ROLES } = require('../src/config/roles.js');
const {
  storageAdapter,
  validateStorageConfig,
  sanitizeFilename,
} = require('../src/services/storage/storageAdapter.js');

let donorUser;
let donorToken;
let inst1User;
let inst1Token;
let inst1Doc;
let inst2User;
let inst2Token;
let adminUser;
let adminToken;
let testDocumentId;

beforeAll(async () => {
  await connectTestDB();

  // Create Donor
  donorUser = await User.create({
    email: 'storage_donor@samanvitha.org',
    password: 'Password123!',
    name: 'Storage Test Donor',
    role: ROLES.DONOR,
  });
  donorToken = donorUser.generateAuthToken();

  // Create Institution 1 (Document Owner)
  inst1User = await User.create({
    email: 'storage_inst1@samanvitha.org',
    password: 'Password123!',
    name: 'St. Jude Orphanage',
    role: ROLES.INSTITUTION,
    institutionType: 'orphanage',
  });
  inst1Token = inst1User.generateAuthToken();

  inst1Doc = await Institution.create({
    userId: inst1User._id,
    name: 'St. Jude Orphanage',
    institutionType: 'orphanage',
    contactPerson: 'Father Thomas',
    phone: '+91 91111 22222',
    email: 'storage_inst1@samanvitha.org',
    address: 'Banjara Hills, Hyderabad',
    capacity: 45,
    verificationStatus: 'Approved',
  });

  // Create Institution 2 (Unrelated Institution)
  inst2User = await User.create({
    email: 'storage_inst2@samanvitha.org',
    password: 'Password123!',
    name: 'Sunrise Care Home',
    role: ROLES.INSTITUTION,
    institutionType: 'old_age_home',
  });
  inst2Token = inst2User.generateAuthToken();

  await Institution.create({
    userId: inst2User._id,
    name: 'Sunrise Care Home',
    institutionType: 'old_age_home',
    contactPerson: 'Manager Rao',
    phone: '+91 92222 33333',
    email: 'storage_inst2@samanvitha.org',
    address: 'Secunderabad, Hyderabad',
    capacity: 35,
    verificationStatus: 'Pending',
  });

  // Create Admin
  adminUser = await User.create({
    email: 'storage_admin@samanvitha.org',
    password: 'AdminPassword123!',
    name: 'Storage Auditor',
    role: ROLES.ADMIN,
  });
  adminToken = adminUser.generateAuthToken();

  // Upload verification document for Institution 1
  const tempDocPath = path.join(__dirname, 'temp_private_audit.pdf');
  fs.writeFileSync(tempDocPath, '%PDF-1.4 Private Confidential Registration Certificate');

  const uploadRes = await request(app)
    .post('/api/institutions/me/documents')
    .set('Authorization', `Bearer ${inst1Token}`)
    .attach('document', tempDocPath);

  if (fs.existsSync(tempDocPath)) fs.unlinkSync(tempDocPath);

  expect(uploadRes.status).toBe(201);
  expect(uploadRes.body.data.length).toBeGreaterThan(0);
  testDocumentId = uploadRes.body.data[0]._id.toString();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Production Startup Guard: Ephemeral Disk Protection', () => {
  test('refuses to start in production when STORAGE_DRIVER=local with clear error message', () => {
    expect(() => {
      validateStorageConfig({
        NODE_ENV: 'production',
        STORAGE_DRIVER: 'local',
      });
    }).toThrow(/STORAGE_DRIVER=local is forbidden in production/i);
  });

  test('refuses to start in production when STORAGE_DRIVER is unset (defaults to local)', () => {
    expect(() => {
      validateStorageConfig({
        NODE_ENV: 'production',
        STORAGE_DRIVER: '',
      });
    }).toThrow(/STORAGE_DRIVER=local is forbidden in production/i);
  });

  test('refuses to start in production when STORAGE_DRIVER=cloudinary but credentials are missing', () => {
    expect(() => {
      validateStorageConfig({
        NODE_ENV: 'production',
        STORAGE_DRIVER: 'cloudinary',
        CLOUDINARY_CLOUD_NAME: '',
        CLOUDINARY_API_KEY: '',
        CLOUDINARY_API_SECRET: '',
      });
    }).toThrow(/requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET/i);
  });

  test('passes validation in production when STORAGE_DRIVER=cloudinary and credentials exist', () => {
    const result = validateStorageConfig({
      NODE_ENV: 'production',
      STORAGE_DRIVER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'test_cloud',
      CLOUDINARY_API_KEY: 'test_key',
      CLOUDINARY_API_SECRET: 'test_secret',
    });
    expect(result.driver).toBe('cloudinary');
  });

  test('allows STORAGE_DRIVER=local in development and test environments', () => {
    const devResult = validateStorageConfig({
      NODE_ENV: 'development',
      STORAGE_DRIVER: 'local',
    });
    expect(devResult.driver).toBe('local');

    const testResult = validateStorageConfig({
      NODE_ENV: 'test',
      STORAGE_DRIVER: 'local',
    });
    expect(testResult.driver).toBe('local');
  });
});

describe('Filename Sanitization & Security', () => {
  test('strips directory traversal paths from filenames', () => {
    const safe = sanitizeFilename('../../etc/passwd.pdf');
    expect(safe).not.toContain('..');
    expect(safe).not.toContain('/');
    expect(safe).not.toContain('\\');
    expect(safe).toMatch(/^passwd-\d+-[a-f0-9]+\.pdf$/);
  });

  test('replaces unsafe characters and spaces with underscores', () => {
    const safe = sanitizeFilename('Trust Deed @ 2026 #Final (1).png');
    expect(safe).not.toContain(' ');
    expect(safe).not.toContain('@');
    expect(safe).not.toContain('#');
    expect(safe).not.toContain('(');
    expect(safe).toMatch(/\.png$/);
  });
});

describe('Cloudinary Mocked Storage Adapter', () => {
  let originalEnvDriver;

  beforeEach(() => {
    originalEnvDriver = process.env.STORAGE_DRIVER;
    process.env.STORAGE_DRIVER = 'cloudinary';
    process.env.CLOUDINARY_CLOUD_NAME = 'mock_cloud';
    process.env.CLOUDINARY_API_KEY = 'mock_key';
    process.env.CLOUDINARY_API_SECRET = 'mock_secret';
  });

  afterEach(() => {
    process.env.STORAGE_DRIVER = originalEnvDriver;
    jest.restoreAllMocks();
  });

  test('verification document upload uses type "authenticated" (strictly private)', async () => {
    let capturedOptions = null;

    jest.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation((options, callback) => {
      capturedOptions = options;
      const { PassThrough } = require('stream');
      const pass = new PassThrough();
      process.nextTick(() => {
        callback(null, {
          public_id: 'samanvitha/verification_docs/cert_123',
          secure_url: 'https://res.cloudinary.com/mock_cloud/raw/authenticated/samanvitha/verification_docs/cert_123.pdf',
          resource_type: 'raw',
          format: 'pdf',
          bytes: 1024,
        });
      });
      return pass;
    });

    const file = {
      buffer: Buffer.from('%PDF-1.4 Mock verification file content'),
      originalname: '80G_Certificate.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    };

    const result = await storageAdapter.saveVerificationDocument(file);

    expect(capturedOptions).not.toBeNull();
    // CRITICAL: Must be 'authenticated' or 'private', NEVER public 'upload'
    expect(capturedOptions.type).toBe('authenticated');
    expect(capturedOptions.folder).toBe('samanvitha/verification_docs');
    expect(result.storageDriver).toBe('cloudinary');
    expect(result.publicId).toBe('samanvitha/verification_docs/cert_123');
  });

  test('private document access generates a short-lived signed URL', async () => {
    const mockSignedUrl = 'https://res.cloudinary.com/mock_cloud/raw/authenticated/samanvitha/verification_docs/cert_123.pdf?s=mock_signature&exp=1700000000';
    jest.spyOn(cloudinary.utils, 'private_download_url').mockReturnValue(mockSignedUrl);

    const doc = {
      storageDriver: 'cloudinary',
      publicId: 'samanvitha/verification_docs/cert_123',
      format: 'pdf',
      resourceType: 'raw',
      mimeType: 'application/pdf',
      originalName: '80G_Certificate.pdf',
    };

    const access = await storageAdapter.getPrivateDocumentAccess(doc, { expiresIn: 600 });

    expect(access.type).toBe('signed_url');
    expect(access.url).toBe(mockSignedUrl);
    expect(access.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('donation photo upload uses public type "upload" with type & size validation', async () => {
    let capturedOptions = null;

    jest.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation((options, callback) => {
      capturedOptions = options;
      const { PassThrough } = require('stream');
      const pass = new PassThrough();
      process.nextTick(() => {
        callback(null, {
          public_id: 'samanvitha/donations/rice_bags_123',
          secure_url: 'https://res.cloudinary.com/mock_cloud/image/upload/samanvitha/donations/rice_bags_123.jpg',
          resource_type: 'image',
          format: 'jpg',
        });
      });
      return pass;
    });

    const photoFile = {
      buffer: Buffer.from('mock image binary data'),
      originalname: 'rice_photo.jpg',
      mimetype: 'image/jpeg',
      size: 2048,
    };

    const result = await storageAdapter.saveDonationPhoto(photoFile);

    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions.type).toBe('upload'); // Public delivery allowed for donation photos
    expect(capturedOptions.folder).toBe('samanvitha/donations');
    expect(result.url).toContain('https://res.cloudinary.com/');
    expect(result.storageDriver).toBe('cloudinary');
  });

  test('donation photo rejects disallowed file types (e.g. svg, exe, txt)', async () => {
    const invalidFile = {
      buffer: Buffer.from('invalid'),
      originalname: 'script.exe',
      mimetype: 'application/x-msdownload',
      size: 500,
    };

    await expect(storageAdapter.saveDonationPhoto(invalidFile)).rejects.toThrow(/Invalid file type/i);
  });

  test('donation photo rejects files exceeding 5MB', async () => {
    const oversizedFile = {
      buffer: Buffer.alloc(6 * 1024 * 1024),
      originalname: 'huge_photo.png',
      mimetype: 'image/png',
      size: 6 * 1024 * 1024,
    };

    await expect(storageAdapter.saveDonationPhoto(oversizedFile)).rejects.toThrow(/exceeds maximum size of 5MB/i);
  });
});

describe('Security Authorization: Private Verification Documents', () => {
  test('1. A donor gets 403 Forbidden when requesting a verification document', async () => {
    const res = await request(app)
      .get(`/api/institutions/${inst1Doc._id}/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Access denied');
  });

  test('2. A different institution gets 403 Forbidden when requesting another home\'s document', async () => {
    const res = await request(app)
      .get(`/api/institutions/${inst1Doc._id}/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${inst2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Access denied');
  });

  test('3. An unauthenticated user gets 401 Unauthorized', async () => {
    const res = await request(app)
      .get(`/api/institutions/${inst1Doc._id}/documents/${testDocumentId}`);

    expect(res.status).toBe(401);
  });

  test('4. The owning institution can successfully view its own document', async () => {
    const res = await request(app)
      .get(`/api/institutions/${inst1Doc._id}/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${inst1Token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });

  test('5. An administrator can successfully view any institution\'s document for verification', async () => {
    const res = await request(app)
      .get(`/api/institutions/${inst1Doc._id}/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
  });
});
