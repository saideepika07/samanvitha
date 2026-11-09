// Automated Test Suite for Server Health Endpoint & Cold-Start Wakeup Ping
const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('GET /api/health (Server Wake-up & Health Check)', () => {
  it('returns status 200 with healthy state when database is connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBeDefined();
    expect(res.body.database.status).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.env).toBe('test');

    // Ensure no secrets or credentials leaked
    expect(res.body.password).toBeUndefined();
    expect(res.body.secret).toBeUndefined();
    expect(res.body.JWT_SECRET).toBeUndefined();
  });
});
