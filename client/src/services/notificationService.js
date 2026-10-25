// Notification Service - Real Backend API Integration
import api from './api.js';
import storage from './storageService.js';
import { USE_MOCK_DATA } from '../config/featureFlags.js';

export const notificationService = {
  /**
   * Get notifications for authenticated user
   * Calls GET /api/notifications
   */
  async getUserNotifications(userId) {
    if (USE_MOCK_DATA) {
      const notifs = storage.get(storage.KEYS.NOTIFICATIONS) || [];
      if (!userId) return notifs;
      return notifs.filter((n) => n.userId === userId || !n.userId);
    }

    const res = await api.get('/notifications');
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to retrieve notifications from server.');
  },

  /**
   * Mark a single notification as read
   * Calls PUT /api/notifications/:id/read
   */
  async markAsRead(notificationId) {
    if (USE_MOCK_DATA) {
      const notifs = storage.get(storage.KEYS.NOTIFICATIONS) || [];
      const index = notifs.findIndex((n) => n.id === notificationId);
      if (index !== -1) {
        notifs[index].read = true;
        storage.set(storage.KEYS.NOTIFICATIONS, notifs);
      }
      return { success: true };
    }

    try {
      const res = await api.put(`/notifications/${notificationId}/read`);
      if (res.data?.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data?.error || 'Failed to update notification.' };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to update notification.',
      };
    }
  },

  /**
   * Mark all notifications as read
   * Calls PUT /api/notifications/read-all
   */
  async markAllAsRead(userId) {
    if (USE_MOCK_DATA) {
      const notifs = storage.get(storage.KEYS.NOTIFICATIONS) || [];
      const updated = notifs.map((n) => (n.userId === userId ? { ...n, read: true } : n));
      storage.set(storage.KEYS.NOTIFICATIONS, updated);
      return { success: true };
    }

    try {
      const res = await api.put('/notifications/read-all');
      if (res.data?.success) {
        return { success: true };
      }
      return { success: false, error: res.data?.error || 'Failed to mark all as read.' };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to mark all as read.',
      };
    }
  },
};

export default notificationService;
