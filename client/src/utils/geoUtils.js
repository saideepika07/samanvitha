/**
 * Client-side Geographic Coordinate Validation and Rounding Utilities
 * 
 * Precision Guidelines:
 * - Institutions: 5 decimal places (~1.1 meter street-level precision for facilities)
 * - Donors: 2 decimal places (~1.1 km privacy radius; exact micro-coordinates never stored)
 */

export function validateLatitude(lat) {
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

export function validateLongitude(lng) {
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

export function validateCoordinates(lat, lng) {
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

export function roundCoordinates(lat, lng, decimals = 5) {
  const validation = validateCoordinates(lat, lng);
  if (!validation.isValid || validation.latitude == null || validation.longitude == null) {
    return { latitude: null, longitude: null };
  }

  const factor = Math.pow(10, decimals);
  const roundedLat = Math.round(validation.latitude * factor) / factor;
  const roundedLng = Math.round(validation.longitude * factor) / factor;

  return { latitude: roundedLat, longitude: roundedLng };
}

export function formatCoordinates(lat, lng, decimals = 5) {
  const rounded = roundCoordinates(lat, lng, decimals);
  if (rounded.latitude == null || rounded.longitude == null) {
    return '';
  }
  return `${rounded.latitude.toFixed(decimals)}°, ${rounded.longitude.toFixed(decimals)}°`;
}
