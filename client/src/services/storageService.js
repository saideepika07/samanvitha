// Mock Data Storage Layer
// WARNING: This localStorage-based store is strictly for the frontend prototype phase.
// It is NOT secure and must be completely replaced by real backend REST/GraphQL APIs and a secure database.

import { SAMPLE_USERS } from '../data/sample/users.js';
import { SAMPLE_INSTITUTIONS } from '../data/sample/institutions.js';
import { SAMPLE_NEEDS } from '../data/sample/needs.js';
import { SAMPLE_DONATIONS } from '../data/sample/donations.js';
import { SAMPLE_NOTIFICATIONS } from '../data/sample/notifications.js';
import { SAMPLE_DISPUTES } from '../data/sample/disputes.js';
import { USE_MOCK_DATA } from '../config/featureFlags.js';

const STORAGE_KEYS = {
  USERS: 'samanvitha_mock_users',
  CURRENT_USER: 'samanvitha_mock_current_user',
  INSTITUTIONS: 'samanvitha_mock_institutions',
  NEEDS: 'samanvitha_mock_needs',
  DONATIONS: 'samanvitha_mock_donations',
  NOTIFICATIONS: 'samanvitha_mock_notifications',
  DISPUTES: 'samanvitha_mock_disputes',
  PASSWORD_RESETS: 'samanvitha_mock_password_resets',
};

// Initialize default storage with sample seed data if not present (only in Mock Mode)
function initializeStore() {
  if (typeof window === 'undefined') return;
  if (!USE_MOCK_DATA) return;

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SAMPLE_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INSTITUTIONS)) {
    localStorage.setItem(STORAGE_KEYS.INSTITUTIONS, JSON.stringify(SAMPLE_INSTITUTIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NEEDS)) {
    localStorage.setItem(STORAGE_KEYS.NEEDS, JSON.stringify(SAMPLE_NEEDS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DONATIONS)) {
    localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(SAMPLE_DONATIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SAMPLE_NOTIFICATIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DISPUTES)) {
    localStorage.setItem(STORAGE_KEYS.DISPUTES, JSON.stringify(SAMPLE_DISPUTES));
  }
}

initializeStore();

export const storage = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Error reading ${key} from storage:`, err);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error writing ${key} to storage:`, err);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`Error removing ${key} from storage:`, err);
    }
  },

  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.INSTITUTIONS);
    localStorage.removeItem(STORAGE_KEYS.NEEDS);
    localStorage.removeItem(STORAGE_KEYS.DONATIONS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.DISPUTES);
    localStorage.removeItem(STORAGE_KEYS.PASSWORD_RESETS);
    initializeStore();
  },

  KEYS: STORAGE_KEYS,
};

export default storage;
