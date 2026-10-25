// Institution Verification Service - Real Backend API Integration
import api from './api.js';
import storage from './storageService.js';
import { USE_MOCK_DATA } from '../config/featureFlags.js';

export const verificationService = {
  /**
   * Get all institutions for verification review (Admin)
   * Calls GET /api/admin/institutions
   */
  async getAllVerifications(filters = {}) {
    if (USE_MOCK_DATA) {
      return storage.get(storage.KEYS.INSTITUTIONS) || [];
    }

    const res = await api.get('/admin/institutions', { params: filters });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to load institutions for verification review.');
  },

  /**
   * Get institution profile by ID (Admin or current Institution)
   * Calls GET /api/admin/institutions/:id or GET /api/institutions/me
   */
  async getInstitutionById(id) {
    if (USE_MOCK_DATA) {
      const currentUser = storage.get(storage.KEYS.CURRENT_USER);
      const insts = storage.get(storage.KEYS.INSTITUTIONS) || [];
      return insts.find((i) => i.id === id || i.userId === id || (id === 'me' && i.userId === currentUser?.id)) || null;
    }

    if (id === 'me') {
      const res = await api.get('/institutions/me');
      if (res.data?.success) return res.data.data;
      throw new Error(res.data?.error || 'Failed to retrieve institution profile.');
    }

    const res = await api.get(`/admin/institutions/${id}`);
    if (res.data?.success) return res.data.data;
    throw new Error(res.data?.error || `Failed to retrieve institution record #${id}.`);
  },

  /**
   * Get current authenticated institution profile
   * Calls GET /api/institutions/me
   */
  async getMyInstitution() {
    if (USE_MOCK_DATA) {
      const currentUser = storage.get(storage.KEYS.CURRENT_USER);
      const insts = storage.get(storage.KEYS.INSTITUTIONS) || [];
      return insts.find((i) => i.userId === currentUser?.id || i.id === currentUser?.institutionId) || null;
    }

    const res = await api.get('/institutions/me');
    if (res.data?.success) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to load current institution profile.');
  },

  /**
   * Update current institution profile
   * Calls PUT /api/institutions/me
   */
  async updateMyInstitution(profileData) {
    if (USE_MOCK_DATA) {
      const currentUser = storage.get(storage.KEYS.CURRENT_USER);
      const insts = storage.get(storage.KEYS.INSTITUTIONS) || [];
      const index = insts.findIndex((i) => i.userId === currentUser?.id || i.name === currentUser?.name);
      if (index !== -1) {
        insts[index] = { ...insts[index], ...profileData };
        storage.set(storage.KEYS.INSTITUTIONS, insts);
      }
      return { success: true, data: profileData };
    }

    try {
      const res = await api.put('/institutions/me', profileData);
      if (res.data?.success) {
        return {
          success: true,
          data: res.data.data,
        };
      }
      return { success: false, error: res.data?.error || 'Failed to update institution profile.' };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to update institution profile.',
      };
    }
  },

  /**
   * Upload verification document
   * Calls POST /api/institutions/me/documents
   */
  async uploadDocument(file) {
    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await api.post('/institutions/me/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data?.error || 'Failed to upload document.' };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Document upload failed.',
      };
    }
  },

  /**
   * Update verification status (Approved, Rejected, Suspended, Pending) (Admin)
   * Calls PUT /api/admin/institutions/:id/verification
   */
  async updateStatus(id, newStatus, reason = '', adminId = null) {
    if (USE_MOCK_DATA) {
      const insts = storage.get(storage.KEYS.INSTITUTIONS) || [];
      const index = insts.findIndex((i) => i.id === id || i.userId === id);
      if (index === -1) {
        return { success: false, error: 'Institution not found.' };
      }

      const updated = {
        ...insts[index],
        verificationStatus: newStatus,
        rejectionReason: newStatus === 'Rejected' ? reason : null,
        reviewedAt: new Date().toISOString(),
        verifiedBy: adminId,
      };

      insts[index] = updated;
      storage.set(storage.KEYS.INSTITUTIONS, insts);

      return {
        success: true,
        data: updated,
      };
    }

    try {
      const res = await api.put(`/admin/institutions/${id}/verification`, {
        status: newStatus,
        reason,
      });
      if (res.data?.success) {
        return {
          success: true,
          data: res.data.data,
        };
      }
      return {
        success: false,
        error: res.data?.error || 'Failed to update verification status.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to update verification status.',
      };
    }
  },
};

export default verificationService;
