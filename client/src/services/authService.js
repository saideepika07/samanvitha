// Authentication Service (Real Backend API Client)
// -----------------------------------------------------------------------------
// Communicates with the Samanvitha Express REST API.
// JWT tokens are stored securely in localStorage.
// Passwords are NEVER stored in localStorage or browser state.
// -----------------------------------------------------------------------------

import api from './api.js';
import storage from './storageService.js';
import { USE_MOCK_DATA } from '../config/featureFlags.js';

export const authService = {
  /**
   * Register a new user
   * @param {Object} userData - { name, email, password, role, accountType, institutionType, address, phone }
   * @returns {Promise<{ success: boolean, data?: Object, error?: string, message?: string }>}
   */
  async register(userData) {
    if (USE_MOCK_DATA) {
      const users = storage.get(storage.KEYS.USERS) || [];
      const newUser = {
        id: `usr_${Date.now()}`,
        ...userData,
        status: 'active',
        isSample: false,
      };
      users.push(newUser);
      storage.set(storage.KEYS.USERS, users);
      storage.set(storage.KEYS.CURRENT_USER, newUser);
      return { success: true, data: newUser };
    }

    try {
      const response = await api.post('/auth/register', userData);
      const { data, token, message } = response.data;

      if (token) {
        localStorage.setItem('samanvitha_token', token);
      }
      if (data) {
        localStorage.setItem('samanvitha_user', JSON.stringify(data));
      }

      return {
        success: true,
        data,
        message,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Registration failed.',
      };
    }
  },

  /**
   * Login user with credentials
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ success: boolean, data?: Object, token?: string, error?: string }>}
   */
  async login({ email, password }) {
    if (USE_MOCK_DATA) {
      const users = storage.get(storage.KEYS.USERS) || [];
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        storage.set(storage.KEYS.CURRENT_USER, user);
        return { success: true, data: user, token: 'mock-jwt-token' };
      }
      return { success: false, error: 'Invalid email or password.' };
    }

    try {
      const response = await api.post('/auth/login', { email, password });
      const { data, token } = response.data;

      if (token) {
        localStorage.setItem('samanvitha_token', token);
      }
      if (data) {
        localStorage.setItem('samanvitha_user', JSON.stringify(data));
      }

      return {
        success: true,
        data,
        token,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Invalid email or password.',
      };
    }
  },

  /**
   * Retrieves current authenticated user session from backend /auth/me
   * @returns {Promise<Object|null>}
   */
  async getCurrentUser() {
    if (USE_MOCK_DATA) {
      return storage.get(storage.KEYS.CURRENT_USER) || null;
    }

    const token = localStorage.getItem('samanvitha_token');
    if (!token) return null;

    try {
      const response = await api.get('/auth/me');
      const user = response.data.data;
      localStorage.setItem('samanvitha_user', JSON.stringify(user));
      return user;
    } catch (err) {
      // If token expired or invalid, clear cached token
      localStorage.removeItem('samanvitha_token');
      localStorage.removeItem('samanvitha_user');
      return null;
    }
  },

  /**
   * Update current authenticated user profile
   * Calls PUT /api/auth/me
   * @param {Object} profileData
   * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
   */
  async updateCurrentUser(profileData) {
    if (USE_MOCK_DATA) {
      const currentUser = storage.get(storage.KEYS.CURRENT_USER);
      const users = storage.get(storage.KEYS.USERS) || [];
      const updatedUser = { ...currentUser, ...profileData };
      const index = users.findIndex((u) => u.id === currentUser?.id);
      if (index !== -1) {
        users[index] = updatedUser;
        storage.set(storage.KEYS.USERS, users);
      }
      storage.set(storage.KEYS.CURRENT_USER, updatedUser);
      return { success: true, data: updatedUser };
    }

    try {
      const response = await api.put('/auth/me', profileData);
      const updatedUser = response.data.data;
      localStorage.setItem('samanvitha_user', JSON.stringify(updatedUser));
      return { success: true, data: updatedUser };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to update profile.',
      };
    }
  },

  /**
   * Logout user and clear tokens
   * @returns {Promise<{ success: boolean }>}
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore API logout error and continue local cleanup
    } finally {
      localStorage.removeItem('samanvitha_token');
      localStorage.removeItem('samanvitha_user');
      if (USE_MOCK_DATA) {
        storage.remove(storage.KEYS.CURRENT_USER);
      }
    }
    return { success: true };
  },

  /**
   * Request password reset instructions
   * Calls POST /api/auth/forgot-password
   * @param {string} email
   * @returns {Promise<{ success: boolean, message: string, error?: string }>}
   */
  async requestPasswordReset(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return {
        success: true,
        message: response.data.message || 'If an account exists for this email, reset instructions have been sent.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to request password reset.',
      };
    }
  },

  /**
   * Validate a reset password token
   * Calls GET /api/auth/reset-password/:token/validate
   * @param {string} token
   * @returns {Promise<{ valid: boolean, reason?: string, email?: string, message?: string }>}
   */
  async validateResetToken(token) {
    try {
      const response = await api.get(`/auth/reset-password/${token}/validate`);
      return response.data;
    } catch (err) {
      return {
        valid: false,
        reason: 'error',
        message: err.response?.data?.error || 'Unable to validate reset token.',
      };
    }
  },

  /**
   * Reset user password using token
   * Calls POST /api/auth/reset-password/:token
   * @param {string} token
   * @param {string} newPassword
   * @returns {Promise<{ success: boolean, message?: string, error?: string, reason?: string }>}
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { newPassword });
      return {
        success: true,
        message: response.data.message || 'Password updated. Please log in.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Failed to reset password.',
        reason: err.response?.data?.reason,
      };
    }
  },

  /**
   * Get all registered users (for Admin page)
   * Calls GET /api/admin/users
   * Never falls back to cached session user.
   * @returns {Promise<Array>}
   */
  async getAllUsers() {
    if (USE_MOCK_DATA) {
      return storage.get(storage.KEYS.USERS) || [];
    }

    const res = await api.get('/admin/users');
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    throw new Error(res.data?.error || 'Failed to retrieve registered users directory from server.');
  },
};

export default authService;
