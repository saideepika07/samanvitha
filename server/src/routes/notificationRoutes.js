// Notification Routes - User Alerts & Inbox Management
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController.js');
const auth = require('../middleware/auth.js');

router.use(auth);

// Get current user's notifications
router.get('/', notificationController.getMyNotifications);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Mark specific notification as read
router.put('/:id/read', notificationController.markAsRead);

// Remove notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
