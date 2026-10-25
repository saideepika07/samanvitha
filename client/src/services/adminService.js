// Admin Service - Platform Analytics & Administration API Integration
import api from './api.js';
import { USE_MOCK_DATA } from '../config/featureFlags.js';

export const adminService = {
  /**
   * Get platform KPI analytics, deficit metrics & category distributions
   * Calls GET /api/admin/analytics
   */
  async getAnalytics() {
    if (USE_MOCK_DATA) {
      return null;
    }

    const res = await api.get('/admin/analytics');
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to retrieve administrative analytics.');
  },
};

export default adminService;
