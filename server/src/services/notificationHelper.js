// Notification & Activity Log Dispatch Helper
const Notification = require('../models/Notification.js');
const ActivityLog = require('../models/ActivityLog.js');

/**
 * Creates an in-app notification for a user
 */
async function sendNotification({ userId, title, message, type = 'system', link = null }) {
  try {
    return await Notification.create({
      userId,
      title,
      message,
      type,
      link,
      read: false,
    });
  } catch (err) {
    console.error('Failed to dispatch in-app notification:', err.message);
    return null;
  }
}

/**
 * Records an audit activity log entry
 */
async function logActivity({ req, action, entityType, entityId, details = {} }) {
  try {
    const userId = req?.user?._id || null;
    const userEmail = req?.user?.email || '';
    const role = req?.user?.role || '';
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '';

    return await ActivityLog.create({
      userId,
      userEmail,
      role,
      action,
      entityType,
      entityId: String(entityId || ''),
      details,
      ipAddress,
    });
  } catch (err) {
    console.error('Failed to record activity log:', err.message);
    return null;
  }
}

module.exports = {
  sendNotification,
  logActivity,
};
