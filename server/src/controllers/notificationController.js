// Notification Controller - In-App Activity Alerts
const Notification = require('../models/Notification.js');
const asyncHandler = require('../utils/asyncHandler.js');

/**
 * @desc    Get authenticated user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getMyNotifications = asyncHandler(async (req, res) => {
  const { unread } = req.query;

  const query = { userId: req.user._id };
  if (unread === 'true') {
    query.read = false;
  }

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    read: false,
  });

  res.status(200).json({
    success: true,
    data: notifications.map((n) => n.toJSON()),
    unreadCount,
    count: notifications.length,
  });
});

/**
 * @desc    Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification record not found.',
    });
  }

  notification.read = true;
  await notification.save();

  res.status(200).json({
    success: true,
    data: notification.toJSON(),
  });
});

/**
 * @desc    Mark all user's notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, read: false },
    { $set: { read: true } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
  });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification record not found.',
    });
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Notification removed successfully.',
  });
});

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
