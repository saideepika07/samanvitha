// Automated Test Suite for Milestone B4: Notifications & Read Management
const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('./setupTestDB.js');
const app = require('../src/app.js');
const User = require('../src/models/User.js');
const Notification = require('../src/models/Notification.js');
const { ROLES } = require('../src/config/roles.js');

let user1Token;
let user1;
let user2Token;
let user2;
let notif1Id;

beforeAll(async () => {
  await connectTestDB();

  user1 = await User.create({
    email: 'notif_user1@samanvitha.org',
    password: 'Password123!',
    name: 'Notif User 1',
    role: ROLES.DONOR,
  });
  user1Token = user1.generateAuthToken();

  user2 = await User.create({
    email: 'notif_user2@samanvitha.org',
    password: 'Password123!',
    name: 'Notif User 2',
    role: ROLES.DONOR,
  });
  user2Token = user2.generateAuthToken();

  const n1 = await Notification.create({
    userId: user1._id,
    title: 'Match Available',
    message: 'A new donation matched your urgent care deficit.',
    type: 'match',
    read: false,
  });
  notif1Id = n1._id.toString();

  await Notification.create({
    userId: user1._id,
    title: 'Reservation Confirmed',
    message: 'Your donation reservation was verified.',
    type: 'reservation',
    read: false,
  });

  await Notification.create({
    userId: user2._id,
    title: 'Private Alert',
    message: 'Confidential notification for User 2.',
    type: 'system',
    read: false,
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Milestone B4: Notifications Inbox & Read Status', () => {
  it('GET /api/notifications returns user inbox with unread count', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.unreadCount).toBe(2);
    // User 1 must not see User 2's notification
    expect(res.body.data.every((n) => n.userId === user1._id.toString())).toBe(true);
  });

  it('PUT /api/notifications/:id/read marks single notification as read', async () => {
    const res = await request(app)
      .put(`/api/notifications/${notif1Id}/read`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.read).toBe(true);

    const check = await Notification.findById(notif1Id);
    expect(check.read).toBe(true);
  });

  it('PUT /api/notifications/:id/read prevents user from updating another user’s notification', async () => {
    const res = await request(app)
      .put(`/api/notifications/${notif1Id}/read`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(404);
  });

  it('PUT /api/notifications/read-all marks all unread notifications as read for current user', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await Notification.countDocuments({ userId: user1._id, read: false });
    expect(check).toBe(0);

    // User 2's unread notifications must remain intact
    const checkUser2 = await Notification.countDocuments({ userId: user2._id, read: false });
    expect(checkUser2).toBe(1);
  });
});
