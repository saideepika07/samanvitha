import React from 'react';
import { DONATION_STATUS, STATUS_BADGE_STYLES } from '../../config/donationStatus.js';

export function StatusBadge({ status, type = 'donation', className = '' }) {
  if (type === 'urgency') {
    const urgencyStyles = {
      Critical: 'bg-red-50 text-red-700 border-red-200',
      High: 'bg-terracotta-50 text-terracotta-800 border-terracotta-300',
      Medium: 'bg-sand-100 text-charcoal-700 border-sand-300',
      Low: 'bg-sage-50 text-sage-800 border-sage-200',
    }[status] || 'bg-sand-100 text-charcoal-700 border-sand-300';

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${urgencyStyles} ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'Critical'
              ? 'bg-red-500 animate-ping'
              : status === 'High'
              ? 'bg-terracotta-500'
              : status === 'Medium'
              ? 'bg-amber-500'
              : 'bg-sage-500'
          }`}
          aria-hidden="true"
        />
        {status} Urgency
      </span>
    );
  }

  if (type === 'verification') {
    const verifStyles = {
      Approved: 'bg-sage-100 text-sage-800 border-sage-300',
      Pending: 'bg-amber-50 text-amber-800 border-amber-300',
      Rejected: 'bg-red-50 text-red-700 border-red-200',
      Suspended: 'bg-charcoal-100 text-charcoal-800 border-charcoal-300',
    }[status] || 'bg-sand-100 text-charcoal-700 border-sand-300';

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${verifStyles} ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'Approved' ? 'bg-sage-600' : status === 'Pending' ? 'bg-amber-500' : 'bg-red-500'
          }`}
          aria-hidden="true"
        />
        Prototype: {status}
      </span>
    );
  }

  // Default: Donation lifecycle status badge
  const style = STATUS_BADGE_STYLES[status] || 'bg-sand-100 text-charcoal-700 border-sand-200';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-soft-sm ${style} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === DONATION_STATUS.COMPLETED
            ? 'bg-sage-700'
            : status === DONATION_STATUS.CANCELLED
            ? 'bg-red-500'
            : status === DONATION_STATUS.RESERVED || status === DONATION_STATUS.MATCHED
            ? 'bg-terracotta-500'
            : 'bg-sage-500'
        }`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

export default StatusBadge;
