/**
 * Geographic Coordinate Validation and Rounding Utilities
 * 
 * Precision Guidelines:
 * - Institutions: 5 decimal places (~1.1 meter street-level precision for facilities)
 * - Donors: 2 decimal places (~1.1 km privacy radius; exact micro-coordinates never stored)
 */

/**
 * Validates latitude value (-90 to 90 degrees).
 * @param {any} lat 
 * @returns {{ isValid: boolean, value: number|null, error?: string }}
 */
function validateLatitude(lat) {
  if (lat == null || lat === '') {
    return { isValid: true, value: null };
  }
  const num = Number(lat);
  if (isNaN(num)) {
    return { isValid: false, value: null, error: 'Latitude must be a valid number.' };
  }
  if (num < -90 || num > 90) {
    return { isValid: false, value: null, error: 'Latitude must be between -90 and 90 degrees.' };
  }
  return { isValid: true, value: num };
}

/**
 * Validates longitude value (-180 to 180 degrees).
 * @param {any} lng 
 * @returns {{ isValid: boolean, value: number|null, error?: string }}
 */
function validateLongitude(lng) {
  if (lng == null || lng === '') {
    return { isValid: true, value: null };
  }
  const num = Number(lng);
  if (isNaN(num)) {
    return { isValid: false, value: null, error: 'Longitude must be a valid number.' };
  }
  if (num < -180 || num > 180) {
    return { isValid: false, value: null, error: 'Longitude must be between -180 and 180 degrees.' };
  }
  return { isValid: true, value: num };
}

/**
 * Validates a coordinate pair (latitude, longitude).
 * Coordinates are valid if both are null/empty, or both are valid numbers within geographic boundaries.
 * @param {any} lat 
 * @param {any} lng 
 * @returns {{ isValid: boolean, latitude: number|null, longitude: number|null, error?: string }}
 */
function validateCoordinates(lat, lng) {
  const isLatEmpty = lat == null || lat === '';
  const isLngEmpty = lng == null || lng === '';

  if (isLatEmpty && isLngEmpty) {
    return { isValid: true, latitude: null, longitude: null };
  }

  if (isLatEmpty !== isLngEmpty) {
    return {
      isValid: false,
      latitude: null,
      longitude: null,
      error: 'Both latitude and longitude must be provided together.',
    };
  }

  const latRes = validateLatitude(lat);
  if (!latRes.isValid) {
    return { isValid: false, latitude: null, longitude: null, error: latRes.error };
  }

  const lngRes = validateLongitude(lng);
  if (!lngRes.isValid) {
    return { isValid: false, latitude: null, longitude: null, error: lngRes.error };
  }

  return { isValid: true, latitude: latRes.value, longitude: lngRes.value };
}

/**
 * Rounds coordinate values to specified decimal precision.
 * @param {number|string|null} lat 
 * @param {number|string|null} lng 
 * @param {number} [decimals=5] 
 * @returns {{ latitude: number|null, longitude: number|null }}
 */
function roundCoordinates(lat, lng, decimals = 5) {
  const validation = validateCoordinates(lat, lng);
  if (!validation.isValid || validation.latitude == null || validation.longitude == null) {
    return { latitude: null, longitude: null };
  }

  const factor = Math.pow(10, decimals);
  const roundedLat = Math.round(validation.latitude * factor) / factor;
  const roundedLng = Math.round(validation.longitude * factor) / factor;

  return { latitude: roundedLat, longitude: roundedLng };
}

/**
 * Formats a coordinate pair into a human-readable degree string.
 * @param {number|string|null} lat 
 * @param {number|string|null} lng 
 * @param {number} [decimals=5] 
 * @returns {string} e.g. "17.44813°, 78.38456°" or ""
 */
function formatCoordinates(lat, lng, decimals = 5) {
  const rounded = roundCoordinates(lat, lng, decimals);
  if (rounded.latitude == null || rounded.longitude == null) {
    return '';
  }
  return `${rounded.latitude.toFixed(decimals)}°, ${rounded.longitude.toFixed(decimals)}°`;
}

module.exports = {
  validateLatitude,
  validateLongitude,
  validateCoordinates,
  roundCoordinates,
  formatCoordinates,
};
