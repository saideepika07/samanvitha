// Algorithmic Matching Weights Configuration
// Strictly weighted: Urgency 35%, Unfulfilled demand 30%, Time sensitivity 20%, Delivery feasibility 15%
// Anti-bias rule: Never rank by popularity, wealth, or number of donors.

const MATCHING_WEIGHTS = {
  urgency: 0.35,
  unfulfilledDemand: 0.30,
  timeSensitivity: 0.20,
  deliveryFeasibility: 0.15,
};

const URGENCY_LEVELS = {
  Critical: { score: 100, label: 'Critical' },
  High: { score: 75, label: 'High' },
  Medium: { score: 50, label: 'Medium' },
  Low: { score: 25, label: 'Low' },
};

// Delivery Feasibility Distance Configuration (Haversine km)
const DELIVERY_CONFIG = {
  MIN_DISTANCE_KM: 2, // <= 2 km gives 100 score
  MAX_RANGE_KM: parseInt(process.env.MAX_DELIVERY_RANGE_KM, 10) || 50, // default 50 km gives 0 score
  NEUTRAL_SCORE: 50, // neutral score when coordinates are missing on either side
};

module.exports = {
  MATCHING_WEIGHTS,
  URGENCY_LEVELS,
  DELIVERY_CONFIG,
};
