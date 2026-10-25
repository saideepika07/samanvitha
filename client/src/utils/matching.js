// Pure matching score calculation function
// Urgency 35%, Unfulfilled demand 30%, Time sensitivity 20%, Delivery feasibility 15%
// Anti-bias: Purely data-driven; never ranks by popularity, wealth or donor count.

import { MATCHING_WEIGHTS, URGENCY_LEVELS, DELIVERY_CONFIG } from '../config/matching.js';

/**
 * Calculates great-circle distance between two GPS coordinates in kilometers using the Haversine formula.
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Computes delivery feasibility score based on distance in km.
 * - Distance <= 2 km: 100
 * - Decreasing linearly to 0 at maxRange (default 50 km)
 * - Distance >= 50 km: 0
 * - Missing coordinates on either side: neutral score of 50 ("Distance unknown")
 *
 * @param {number|null} distanceKm
 * @param {Object} [options]
 * @returns {{ score: number, distanceKm: number|null, distanceText: string }}
 */
export function calculateDeliveryFeasibility(distanceKm, options = {}) {
  const minKm = options.minDistanceKm ?? DELIVERY_CONFIG.MIN_DISTANCE_KM ?? 2;
  const maxKm = options.maxRangeKm ?? DELIVERY_CONFIG.MAX_RANGE_KM ?? 50;
  const neutralScore = options.neutralScore ?? DELIVERY_CONFIG.NEUTRAL_SCORE ?? 50;

  if (distanceKm == null || isNaN(distanceKm)) {
    return {
      score: neutralScore,
      distanceKm: null,
      distanceText: 'Distance unknown',
    };
  }

  const roundedDistance = Math.round(distanceKm * 10) / 10;

  if (distanceKm <= minKm) {
    return {
      score: 100,
      distanceKm: roundedDistance,
      distanceText: `${roundedDistance} km`,
    };
  }

  if (distanceKm >= maxKm) {
    return {
      score: 0,
      distanceKm: roundedDistance,
      distanceText: `${roundedDistance} km`,
    };
  }

  // Linear decrease from 100 at minKm down to 0 at maxKm
  const ratio = (distanceKm - minKm) / (maxKm - minKm);
  const rawScore = 100 - ratio * 100;
  const score = Math.round(rawScore * 10) / 10;

  return {
    score,
    distanceKm: roundedDistance,
    distanceText: `${roundedDistance} km`,
  };
}

/**
 * Calculates a match score between a donation and an institution's need.
 * @param {Object} donation - The donation record
 * @param {Object} need - The institution need record
 * @param {Object} [options] - Additional parameters like custom weights or distance
 * @returns {Object} breakdown - Component scores (0-100), weights, and final score
 */
export function calculateMatchScore(donation, need, options = {}) {
  const weights = options.weights || MATCHING_WEIGHTS;

  // 1. Urgency Component (0-100, 35% weight)
  const urgencyConfig = URGENCY_LEVELS[need?.urgency] || URGENCY_LEVELS.Medium;
  const urgencyScore = urgencyConfig.score;

  // 2. Unfulfilled Demand Component (0-100, 30% weight)
  // Remaining need = max(0, required - usable stock - reserved)
  const remainingNeed = Math.max(
    0,
    (need?.requiredQuantity || 0) - (need?.usableStock || 0) - (need?.reservedQuantity || 0)
  );

  let demandScore = 0;
  if (remainingNeed > 0 && donation?.quantity > 0) {
    const fulfillmentRatio = donation.quantity / remainingNeed;
    if (fulfillmentRatio >= 1) {
      demandScore = 100;
    } else {
      demandScore = Math.round(fulfillmentRatio * 100);
    }
  }

  // 3. Time Sensitivity Component (0-100, 20% weight)
  let timeScore = 50;
  if (need?.deadline) {
    const today = new Date();
    const deadlineDate = new Date(need.deadline);
    const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
      timeScore = 100;
    } else if (diffDays <= 7) {
      timeScore = 80;
    } else if (diffDays <= 14) {
      timeScore = 60;
    } else if (diffDays <= 30) {
      timeScore = 40;
    } else {
      timeScore = 20;
    }
  }

  // 4. Delivery Feasibility Component (0-100, 15% weight)
  // Distance-based with Haversine formula; neutral 50 if either coordinate is missing
  let distanceKm = null;
  const hasDonationCoords =
    donation?.latitude != null &&
    donation?.longitude != null &&
    !isNaN(Number(donation.latitude)) &&
    !isNaN(Number(donation.longitude));

  const hasNeedCoords =
    need?.latitude != null &&
    need?.longitude != null &&
    !isNaN(Number(need.latitude)) &&
    !isNaN(Number(need.longitude));

  if (hasDonationCoords && hasNeedCoords) {
    distanceKm = calculateHaversineDistance(
      Number(donation.latitude),
      Number(donation.longitude),
      Number(need.latitude),
      Number(need.longitude)
    );
  }

  const deliveryFeas = calculateDeliveryFeasibility(distanceKm, options);
  const feasibilityScore = deliveryFeas.score;

  // Final Weighted Score
  const rawFinal =
    urgencyScore * weights.urgency +
    demandScore * weights.unfulfilledDemand +
    timeScore * weights.timeSensitivity +
    feasibilityScore * weights.deliveryFeasibility;

  const finalScore = Math.round(rawFinal * 10) / 10;

  return {
    finalScore,
    components: {
      urgency: {
        score: urgencyScore,
        weight: weights.urgency,
        weightedScore: Math.round(urgencyScore * weights.urgency * 10) / 10,
        label: need?.urgency || 'Medium',
      },
      unfulfilledDemand: {
        score: demandScore,
        weight: weights.unfulfilledDemand,
        weightedScore: Math.round(demandScore * weights.unfulfilledDemand * 10) / 10,
        remainingNeed,
        offeredQuantity: donation?.quantity || 0,
      },
      timeSensitivity: {
        score: timeScore,
        weight: weights.timeSensitivity,
        weightedScore: Math.round(timeScore * weights.timeSensitivity * 10) / 10,
        deadline: need?.deadline,
      },
      deliveryFeasibility: {
        score: feasibilityScore,
        weight: weights.deliveryFeasibility,
        weightedScore: Math.round(feasibilityScore * weights.deliveryFeasibility * 10) / 10,
        donorLocation: donation?.location,
        institutionLocation: need?.address || need?.location,
        distanceKm: deliveryFeas.distanceKm,
        distanceText: deliveryFeas.distanceText,
      },
    },
  };
}

/**
 * Calculates the remaining unfulfilled need:
 * Remaining need = max(0, required - usable stock - reserved quantity)
 */
export function calculateRemainingNeed(required, usableStock = 0, reservedQuantity = 0) {
  const req = Number(required) || 0;
  const stock = Number(usableStock) || 0;
  const reserved = Number(reservedQuantity) || 0;
  return Math.max(0, req - stock - reserved);
}
