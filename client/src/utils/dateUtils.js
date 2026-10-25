// Date & Expiry Utilities for Samanvitha Community Network
import { RESERVATION_EXPIRY_HOURS } from '../config/donationStatus.js';

/**
 * Formats the remaining time until a reservation expires.
 * e.g., "Expires in 2 days", "Expires in 1 day 4h", "Expires in 18 hours", "Expires in 45 mins", or "Expired".
 *
 * @param {string|Date} reservedAt - When the donation was marked Reserved
 * @param {number} [expiryHours=RESERVATION_EXPIRY_HOURS] - Expiry duration in hours (default 72)
 * @returns {string} Human-friendly expiry text
 */
export function formatReservationExpiry(reservedAt, expiryHours = RESERVATION_EXPIRY_HOURS || 72) {
  if (!reservedAt) return 'Expires in 3 days';

  const reservedTime = new Date(reservedAt).getTime();
  if (isNaN(reservedTime)) return 'Expires in 3 days';

  const expiryTime = reservedTime + expiryHours * 60 * 60 * 1000;
  const diffMs = expiryTime - Date.now();

  if (diffMs <= 0) {
    return 'Expired';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 2) {
    return `Expires in ${diffDays} days`;
  }
  if (diffDays === 1) {
    const remHours = diffHours % 24;
    return remHours > 0 ? `Expires in 1 day ${remHours}h` : 'Expires in 1 day';
  }
  if (diffHours >= 1) {
    return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }

  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return `Expires in ${diffMinutes} min${diffMinutes > 1 ? 's' : ''}`;
}

export default formatReservationExpiry;
