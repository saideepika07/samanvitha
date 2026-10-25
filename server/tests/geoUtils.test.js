const {
  validateLatitude,
  validateLongitude,
  validateCoordinates,
  roundCoordinates,
  formatCoordinates,
} = require('../src/utils/geoUtils.js');

describe('Geographic Coordinate Validation & Rounding Helpers', () => {
  describe('validateLatitude', () => {
    test('accepts valid latitudes between -90 and 90', () => {
      expect(validateLatitude(0)).toEqual({ isValid: true, value: 0 });
      expect(validateLatitude(17.448129)).toEqual({ isValid: true, value: 17.448129 });
      expect(validateLatitude(-45.5)).toEqual({ isValid: true, value: -45.5 });
      expect(validateLatitude(90)).toEqual({ isValid: true, value: 90 });
      expect(validateLatitude(-90)).toEqual({ isValid: true, value: -90 });
      expect(validateLatitude('17.448')).toEqual({ isValid: true, value: 17.448 });
    });

    test('accepts null, undefined, and empty string as optional values', () => {
      expect(validateLatitude(null)).toEqual({ isValid: true, value: null });
      expect(validateLatitude(undefined)).toEqual({ isValid: true, value: null });
      expect(validateLatitude('')).toEqual({ isValid: true, value: null });
    });

    test('rejects latitudes outside -90 to 90 degrees', () => {
      expect(validateLatitude(90.0001).isValid).toBe(false);
      expect(validateLatitude(-90.1).isValid).toBe(false);
      expect(validateLatitude(120).isValid).toBe(false);
      expect(validateLatitude(-105).isValid).toBe(false);
    });

    test('rejects non-numeric inputs', () => {
      expect(validateLatitude('abc').isValid).toBe(false);
      expect(validateLatitude(NaN).isValid).toBe(false);
    });
  });

  describe('validateLongitude', () => {
    test('accepts valid longitudes between -180 and 180', () => {
      expect(validateLongitude(0)).toEqual({ isValid: true, value: 0 });
      expect(validateLongitude(78.384562)).toEqual({ isValid: true, value: 78.384562 });
      expect(validateLongitude(-122.4194)).toEqual({ isValid: true, value: -122.4194 });
      expect(validateLongitude(180)).toEqual({ isValid: true, value: 180 });
      expect(validateLongitude(-180)).toEqual({ isValid: true, value: -180 });
      expect(validateLongitude('78.384')).toEqual({ isValid: true, value: 78.384 });
    });

    test('accepts null, undefined, and empty string as optional values', () => {
      expect(validateLongitude(null)).toEqual({ isValid: true, value: null });
      expect(validateLongitude(undefined)).toEqual({ isValid: true, value: null });
      expect(validateLongitude('')).toEqual({ isValid: true, value: null });
    });

    test('rejects longitudes outside -180 to 180 degrees', () => {
      expect(validateLongitude(180.0001).isValid).toBe(false);
      expect(validateLongitude(-180.5).isValid).toBe(false);
      expect(validateLongitude(200).isValid).toBe(false);
      expect(validateLongitude(-195).isValid).toBe(false);
    });

    test('rejects non-numeric inputs', () => {
      expect(validateLongitude('xyz').isValid).toBe(false);
      expect(validateLongitude(NaN).isValid).toBe(false);
    });
  });

  describe('validateCoordinates', () => {
    test('validates paired coordinates successfully', () => {
      const res = validateCoordinates(17.448129, 78.384562);
      expect(res.isValid).toBe(true);
      expect(res.latitude).toBe(17.448129);
      expect(res.longitude).toBe(78.384562);
    });

    test('accepts when both coordinates are null', () => {
      const res = validateCoordinates(null, null);
      expect(res.isValid).toBe(true);
      expect(res.latitude).toBeNull();
      expect(res.longitude).toBeNull();
    });

    test('rejects when only one coordinate is provided', () => {
      const res1 = validateCoordinates(17.448, null);
      expect(res1.isValid).toBe(false);
      expect(res1.error).toContain('Both latitude and longitude must be provided together');

      const res2 = validateCoordinates(null, 78.384);
      expect(res2.isValid).toBe(false);
      expect(res2.error).toContain('Both latitude and longitude must be provided together');
    });

    test('rejects when either coordinate is out of bounds', () => {
      const res = validateCoordinates(95, 78.384);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Latitude must be between -90 and 90');
    });
  });

  describe('roundCoordinates', () => {
    test('rounds to 5 decimal places by default (street-level precision for institutions ~1.1 meters)', () => {
      const rounded = roundCoordinates(17.448129482, 78.384562912, 5);
      expect(rounded.latitude).toBe(17.44813);
      expect(rounded.longitude).toBe(78.38456);
    });

    test('rounds to 2 decimal places for donors (~1.1 km privacy radius)', () => {
      const rounded = roundCoordinates(17.448129, 78.384562, 2);
      expect(rounded.latitude).toBe(17.45);
      expect(rounded.longitude).toBe(78.38);
    });

    test('returns null coordinates when input is null or invalid', () => {
      expect(roundCoordinates(null, null)).toEqual({ latitude: null, longitude: null });
      expect(roundCoordinates(17.44, null)).toEqual({ latitude: null, longitude: null });
      expect(roundCoordinates('invalid', 78.38)).toEqual({ latitude: null, longitude: null });
    });
  });

  describe('formatCoordinates', () => {
    test('formats coordinate pair with degree symbol at specified precision', () => {
      const formatted5 = formatCoordinates(17.448129, 78.384562, 5);
      expect(formatted5).toBe('17.44813°, 78.38456°');

      const formatted2 = formatCoordinates(17.448129, 78.384562, 2);
      expect(formatted2).toBe('17.45°, 78.38°');
    });

    test('returns empty string for null or missing coordinates', () => {
      expect(formatCoordinates(null, null)).toBe('');
      expect(formatCoordinates(undefined, undefined)).toBe('');
    });
  });
});
