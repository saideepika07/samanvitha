// Algorithmic Matching Weights Configuration
// Strictly weighted: Urgency 35%, Unfulfilled demand 30%, Time sensitivity 20%, Delivery feasibility 15%
// Anti-bias rule: Never rank by popularity, wealth or number of donors.

export const MATCHING_WEIGHTS = {
  urgency: 0.35,
  unfulfilledDemand: 0.30,
  timeSensitivity: 0.20,
  deliveryFeasibility: 0.15,
};

export const MATCHING_WEIGHT_PERCENTAGES = {
  urgency: '35%',
  unfulfilledDemand: '30%',
  timeSensitivity: '20%',
  deliveryFeasibility: '15%',
};

export const URGENCY_LEVELS = {
  Critical: { score: 100, label: 'Critical', color: 'terracotta' },
  High: { score: 75, label: 'High', color: 'terracotta' },
  Medium: { score: 50, label: 'Medium', color: 'sand' },
  Low: { score: 25, label: 'Low', color: 'sage' },
};

export const DELIVERY_CONFIG = {
  MIN_DISTANCE_KM: 2, // <= 2 km gives 100 score
  MAX_RANGE_KM: 50, // default 50 km gives 0 score
  NEUTRAL_SCORE: 50, // neutral score when coordinates are missing
};
