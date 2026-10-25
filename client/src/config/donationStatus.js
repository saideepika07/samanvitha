// Donation lifecycle status definitions and flow
// Flow: Listed -> Matched -> Reserved -> Ready for delivery -> Delivered -> Received -> Completed (or Cancelled)

export const DONATION_STATUS = {
  LISTED: 'Listed',
  MATCHED: 'Matched',
  RESERVED: 'Reserved',
  READY_FOR_DELIVERY: 'Ready for delivery',
  DELIVERED: 'Delivered',
  RECEIVED: 'Received',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export const RESERVATION_EXPIRY_HOURS = 72;

export const DONATION_STATUS_STEPS = [
  DONATION_STATUS.LISTED,
  DONATION_STATUS.MATCHED,
  DONATION_STATUS.RESERVED,
  DONATION_STATUS.READY_FOR_DELIVERY,
  DONATION_STATUS.DELIVERED,
  DONATION_STATUS.RECEIVED,
  DONATION_STATUS.COMPLETED,
];

export const STATUS_BADGE_STYLES = {
  [DONATION_STATUS.LISTED]: 'bg-sand-100 text-charcoal-700 border-sand-300',
  [DONATION_STATUS.MATCHED]: 'bg-sage-100 text-sage-800 border-sage-300',
  [DONATION_STATUS.RESERVED]: 'bg-terracotta-100 text-terracotta-800 border-terracotta-300',
  [DONATION_STATUS.READY_FOR_DELIVERY]: 'bg-amber-100 text-amber-900 border-amber-300',
  [DONATION_STATUS.DELIVERED]: 'bg-blue-100 text-blue-800 border-blue-300',
  [DONATION_STATUS.RECEIVED]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  [DONATION_STATUS.COMPLETED]: 'bg-sage-200 text-sage-900 border-sage-400 font-semibold',
  [DONATION_STATUS.CANCELLED]: 'bg-red-50 text-red-700 border-red-200',
  [DONATION_STATUS.EXPIRED]: 'bg-charcoal-100 text-charcoal-700 border-charcoal-300',
};
