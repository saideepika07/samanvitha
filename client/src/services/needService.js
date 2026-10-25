// Need Service - Real Backend API Integration
import api from './api.js';
import storage from './storageService.js';
import { calculateRemainingNeed } from '../utils/matching.js';
import { USE_MOCK_DATA } from '../config/featureFlags.js';

export const needService = {
  /**
   * Get all public needs (sanitized for public directory)
   * Calls GET /api/needs/public
   */
  async getPublicNeeds(filters = {}) {
    if (USE_MOCK_DATA) {
      const needs = storage.get(storage.KEYS.NEEDS) || [];
      let filtered = needs.map((need) => ({
        ...need,
        remainingNeed: calculateRemainingNeed(
          need.requiredQuantity,
          need.usableStock,
          need.reservedQuantity
        ),
      }));

      if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter((n) => n.category === filters.category);
      }
      if (filters.urgency && filters.urgency !== 'all') {
        filtered = filtered.filter((n) => n.urgency === filters.urgency);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(
          (n) =>
            n.itemType.toLowerCase().includes(q) ||
            n.category.toLowerCase().includes(q) ||
            n.institutionName.toLowerCase().includes(q)
        );
      }
      return filtered;
    }

    const params = {};
    if (filters.category && filters.category !== 'all') params.category = filters.category;
    if (filters.urgency && filters.urgency !== 'all') params.urgency = filters.urgency;
    if (filters.search) params.search = filters.search;

    const res = await api.get('/needs/public', { params });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to load public needs from server.');
  },

  /**
   * Get needs for a specific institution
   * Calls GET /api/needs?institutionId=...
   */
  async getInstitutionNeeds(institutionId) {
    if (USE_MOCK_DATA) {
      const needs = storage.get(storage.KEYS.NEEDS) || [];
      return needs
        .filter((n) => n.institutionId === institutionId || !institutionId)
        .map((need) => ({
          ...need,
          remainingNeed: calculateRemainingNeed(
            need.requiredQuantity,
            need.usableStock,
            need.reservedQuantity
          ),
        }));
    }

    const params = institutionId ? { institutionId } : {};
    const res = await api.get('/needs', { params });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to load institution needs from server.');
  },

  /**
   * Get need by ID
   * Calls GET /api/needs/:id
   */
  async getNeedById(id) {
    if (USE_MOCK_DATA) {
      const needs = storage.get(storage.KEYS.NEEDS) || [];
      const need = needs.find((n) => n.id === id);
      if (!need) return null;
      return {
        ...need,
        remainingNeed: calculateRemainingNeed(
          need.requiredQuantity,
          need.usableStock,
          need.reservedQuantity
        ),
      };
    }

    const res = await api.get(`/needs/${id}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.error || `Failed to retrieve need #${id}.`);
  },

  /**
   * Create a new institution need
   * Calls POST /api/needs
   */
  async createNeed(needData) {
    if (USE_MOCK_DATA) {
      const needs = storage.get(storage.KEYS.NEEDS) || [];
      const newNeed = {
        id: `need_${Date.now()}`,
        institutionId: needData.institutionId || 'inst_01',
        institutionName: needData.institutionName || 'Sample Institution',
        category: needData.category,
        itemType: needData.itemType,
        requiredQuantity: Number(needData.requiredQuantity),
        usableStock: Number(needData.usableStock || 0),
        reservedQuantity: 0,
        unit: needData.unit,
        urgency: needData.urgency || 'Medium',
        deadline: needData.deadline,
        acceptableCondition: needData.acceptableCondition || 'New or gently used',
        notes: needData.notes || '',
        address: needData.address || '',
        status: 'Open',
        createdAt: new Date().toISOString(),
        isSample: false,
      };

      needs.unshift(newNeed);
      storage.set(storage.KEYS.NEEDS, needs);

      return {
        success: true,
        data: {
          ...newNeed,
          remainingNeed: calculateRemainingNeed(
            newNeed.requiredQuantity,
            newNeed.usableStock,
            newNeed.reservedQuantity
          ),
        },
      };
    }

    try {
      const res = await api.post('/needs', needData);
      if (res.data?.success) {
        return {
          success: true,
          data: res.data.data,
        };
      }
      return {
        success: false,
        error: res.data?.error || 'Failed to create need.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to create need.',
      };
    }
  },

  /**
   * Update an existing need
   * Calls PUT /api/needs/:id
   */
  async updateNeed(id, updateData) {
    if (USE_MOCK_DATA) {
      const needs = storage.get(storage.KEYS.NEEDS) || [];
      const index = needs.findIndex((n) => n.id === id);
      if (index === -1) {
        return { success: false, error: 'Need not found.' };
      }

      const updated = {
        ...needs[index],
        ...updateData,
        requiredQuantity: Number(updateData.requiredQuantity ?? needs[index].requiredQuantity),
        usableStock: Number(updateData.usableStock ?? needs[index].usableStock),
        reservedQuantity: Number(updateData.reservedQuantity ?? needs[index].reservedQuantity),
      };

      needs[index] = updated;
      storage.set(storage.KEYS.NEEDS, needs);

      return {
        success: true,
        data: {
          ...updated,
          remainingNeed: calculateRemainingNeed(
            updated.requiredQuantity,
            updated.usableStock,
            updated.reservedQuantity
          ),
        },
      };
    }

    try {
      const res = await api.put(`/needs/${id}`, updateData);
      if (res.data?.success) {
        return {
          success: true,
          data: res.data.data,
        };
      }
      return {
        success: false,
        error: res.data?.error || 'Failed to update need.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to update need.',
      };
    }
  },

  /**
   * Delete or archive a need
   * Calls DELETE /api/needs/:id
   */
  async deleteNeed(id) {
    if (USE_MOCK_DATA) {
      const needs = storage.get(storage.KEYS.NEEDS) || [];
      const filtered = needs.filter((n) => n.id !== id);
      storage.set(storage.KEYS.NEEDS, filtered);
      return { success: true };
    }

    try {
      const res = await api.delete(`/needs/${id}`);
      if (res.data?.success) {
        return { success: true };
      }
      return {
        success: false,
        error: res.data?.error || 'Failed to delete need.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to delete need.',
      };
    }
  },
};

export default needService;
