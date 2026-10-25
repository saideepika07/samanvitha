// Donation Service - Real Backend API Integration
import api from './api.js';
import storage from './storageService.js';
import { DONATION_STATUS } from '../config/donationStatus.js';
import { USE_MOCK_DATA } from '../config/featureFlags.js';

export const donationService = {
  /**
   * Get all donations for a donor
   * Calls GET /api/donations/my
   */
  async getDonorDonations(donorId) {
    if (USE_MOCK_DATA) {
      const donations = storage.get(storage.KEYS.DONATIONS) || [];
      if (!donorId) return donations;
      return donations.filter((d) => d.donorId === donorId);
    }

    const res = await api.get('/donations/my');
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to load donations from server.');
  },

  /**
   * Get all donations across the system (for admin / overview)
   * Calls GET /api/donations
   */
  async getAllDonations(filters = {}) {
    if (USE_MOCK_DATA) {
      return storage.get(storage.KEYS.DONATIONS) || [];
    }

    const res = await api.get('/donations', { params: filters });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to load all donations from server.');
  },

  /**
   * Get incoming requests & reservations for a specific institution
   * Calls GET /api/donations/institution/incoming
   */
  async getInstitutionIncoming(institutionName) {
    if (USE_MOCK_DATA) {
      const donations = storage.get(storage.KEYS.DONATIONS) || [];
      const incomingStatuses = [
        DONATION_STATUS.MATCHED,
        DONATION_STATUS.RESERVED,
        DONATION_STATUS.READY_FOR_DELIVERY,
        DONATION_STATUS.DELIVERED,
      ];
      return donations.filter((d) => {
        const matchInst =
          !institutionName ||
          d.matchedInstitutionName === institutionName ||
          d.matchedInstitutionName?.includes('Sample');
        return matchInst && incomingStatuses.includes(d.status);
      });
    }

    const res = await api.get('/donations/institution/incoming');
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to load incoming donation requests.');
  },

  /**
   * Get received and completed donations for an institution
   * Calls GET /api/donations/institution/received
   */
  async getInstitutionReceived(institutionName) {
    if (USE_MOCK_DATA) {
      const donations = storage.get(storage.KEYS.DONATIONS) || [];
      const receivedStatuses = [DONATION_STATUS.RECEIVED, DONATION_STATUS.COMPLETED];
      return donations.filter((d) => {
        const matchInst =
          !institutionName ||
          d.matchedInstitutionName === institutionName ||
          d.matchedInstitutionName?.includes('Sample');
        return matchInst && receivedStatuses.includes(d.status);
      });
    }

    const res = await api.get('/donations/institution/received');
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to load received donations ledger.');
  },

  /**
   * Get single donation by id
   * Calls GET /api/donations/:id
   */
  async getDonationById(id) {
    if (USE_MOCK_DATA) {
      const donations = storage.get(storage.KEYS.DONATIONS) || [];
      return donations.find((d) => d.id === id) || null;
    }

    const res = await api.get(`/donations/${id}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.error || `Failed to retrieve donation #${id}.`);
  },

  /**
   * Create a new donation pledge
   * Calls POST /api/donations
   */
  async createDonation(donationData) {
    if (USE_MOCK_DATA) {
      const donations = storage.get(storage.KEYS.DONATIONS) || [];
      const newDonation = {
        id: `don_${Date.now()}`,
        donorId: donationData.donorId,
        donorName: donationData.donorName || 'Community Donor',
        category: donationData.category,
        itemType: donationData.itemType,
        quantity: Number(donationData.quantity),
        unit: donationData.unit,
        condition: donationData.condition,
        location: donationData.location,
        deadline: donationData.deadline,
        image: donationData.image || null,
        notes: donationData.notes || '',
        status: donationData.matchedNeedId ? DONATION_STATUS.RESERVED : DONATION_STATUS.LISTED,
        matchedNeedId: donationData.matchedNeedId || null,
        matchedInstitutionName: donationData.matchedInstitutionName || null,
        createdAt: new Date().toISOString(),
        isSample: false,
      };

      donations.unshift(newDonation);
      storage.set(storage.KEYS.DONATIONS, donations);

      return {
        success: true,
        data: newDonation,
      };
    }

    try {
      const res = await api.post('/donations', donationData);
      if (res.data?.success) {
        return {
          success: true,
          data: res.data.data,
        };
      }
      return {
        success: false,
        error: res.data?.error || 'Failed to create donation.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to create donation.',
      };
    }
  },

  /**
   * Update donation status lifecycle
   * Calls PUT /api/donations/:id/status
   */
  async updateDonationStatus(id, newStatus, meta = {}) {
    if (USE_MOCK_DATA) {
      const donations = storage.get(storage.KEYS.DONATIONS) || [];
      const index = donations.findIndex((d) => d.id === id);
      if (index === -1) {
        return { success: false, error: 'Donation not found.' };
      }

      const updated = {
        ...donations[index],
        status: newStatus,
        ...meta,
        updatedAt: new Date().toISOString(),
      };

      donations[index] = updated;
      storage.set(storage.KEYS.DONATIONS, donations);

      return {
        success: true,
        data: updated,
      };
    }

    try {
      const res = await api.put(`/donations/${id}/status`, {
        status: newStatus,
        ...meta,
      });
      if (res.data?.success) {
        return {
          success: true,
          data: res.data.data,
        };
      }
      return {
        success: false,
        error: res.data?.error || 'Failed to update donation status.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to update donation status.',
      };
    }
  },

  /**
   * Cancel a donation
   * Calls POST /api/donations/:id/cancel
   */
  async cancelDonation(id, reason = '') {
    if (USE_MOCK_DATA) {
      return this.updateDonationStatus(id, DONATION_STATUS.CANCELLED, { cancelReason: reason });
    }

    try {
      const res = await api.post(`/donations/${id}/cancel`, { reason });
      if (res.data?.success) {
        return { success: true, data: res.data.data };
      }
      return {
        success: false,
        error: res.data?.error || 'Failed to cancel donation.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to cancel donation.',
      };
    }
  },
};

export default donationService;
