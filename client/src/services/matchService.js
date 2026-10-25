// Match Service - Real Backend API Integration
import api from './api.js';
import storage from './storageService.js';
import { calculateMatchScore } from '../utils/matching.js';
import { DONATION_STATUS } from '../config/donationStatus.js';
import { USE_MOCK_DATA } from '../config/featureFlags.js';

export const matchService = {
  /**
   * Find ranked match suggestions for a specific donation
   * Calls GET /api/matches/suggestions/:donationId
   */
  async getSuggestionsForDonation(donationId) {
    if (USE_MOCK_DATA) {
      const donations = storage.get(storage.KEYS.DONATIONS) || [];
      const donation = donations.find((d) => d.id === donationId);
      if (!donation) return [];

      const needs = storage.get(storage.KEYS.NEEDS) || [];
      const candidateNeeds = needs.filter(
        (n) => n.category === donation.category && n.status !== 'Fulfilled'
      );

      const matches = candidateNeeds.map((need) => {
        const scoreData = calculateMatchScore(donation, need);
        return {
          needId: need.id,
          need,
          donationId: donation.id,
          donation,
          finalScore: scoreData.finalScore,
          components: scoreData.components,
        };
      });

      return matches.sort((a, b) => b.finalScore - a.finalScore);
    }

    const res = await api.get(`/matches/suggestions/${donationId}`);
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || `Failed to calculate algorithmic match suggestions for donation #${donationId}.`);
  },

  /**
   * Reserve a match between a donation and an institution's need
   * Calls POST /api/matches/reserve
   */
  async reserveMatch(donationId, needId) {
    if (USE_MOCK_DATA) {
      const donations = storage.get(storage.KEYS.DONATIONS) || [];
      const needs = storage.get(storage.KEYS.NEEDS) || [];

      const donIdx = donations.findIndex((d) => d.id === donationId);
      const needIdx = needs.findIndex((n) => n.id === needId);

      if (donIdx === -1 || needIdx === -1) {
        return { success: false, error: 'Donation or Need not found.' };
      }

      const don = donations[donIdx];
      const need = needs[needIdx];

      donations[donIdx] = {
        ...don,
        status: DONATION_STATUS.RESERVED,
        matchedNeedId: need.id,
        matchedInstitutionName: need.institutionName,
        reservedAt: new Date().toISOString(),
      };

      needs[needIdx] = {
        ...need,
        reservedQuantity: (need.reservedQuantity || 0) + don.quantity,
      };

      storage.set(storage.KEYS.DONATIONS, donations);
      storage.set(storage.KEYS.NEEDS, needs);

      return {
        success: true,
        donation: donations[donIdx],
        need: needs[needIdx],
      };
    }

    try {
      const res = await api.post('/matches/reserve', { donationId, needId });
      if (res.data?.success) {
        return {
          success: true,
          donation: res.data.data.donation,
          need: res.data.data.need,
        };
      }
      return {
        success: false,
        error: res.data?.error || 'Failed to reserve match.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to reserve match.',
      };
    }
  },
};

export default matchService;
