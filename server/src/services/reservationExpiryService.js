// Reservation Expiry Service - Automatic & Lazy Expiration of Stale Reservations
const Donation = require('../models/Donation.js');
const Need = require('../models/Need.js');
const Institution = require('../models/Institution.js');
const { DONATION_STATUS, RESERVATION_EXPIRY_HOURS } = require('../config/donationStatus.js');
const { sendNotification } = require('./notificationHelper.js');

/**
 * Checks whether a given deadline has passed.
 * Supports ISO date strings, timestamps, or 'YYYY-MM-DD' formatted dates.
 */
function isPastDeadline(deadline) {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return false;
  if (typeof deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return new Date() > new Date(`${deadline}T23:59:59.999Z`);
  }
  return new Date() > d;
}

/**
 * Atomically expires a single donation reservation.
 * Idempotent: strictly guards that status is currently RESERVED (or MATCHED).
 * Decrements the need's reservedQuantity exactly once.
 * Dispatches in-app notifications to both parties.
 *
 * @param {Object} donation - The donation document (or populated object)
 * @returns {Promise<{ expired: boolean, donation: Object|null }>}
 */
async function expireDonationRecord(donation) {
  if (!donation) return { expired: false, donation: null };

  // Guard: Only Reserved (or Matched) donations can expire.
  // A donation already 'Ready for delivery', 'Delivered', etc., never expires.
  if (
    donation.status !== DONATION_STATUS.RESERVED &&
    donation.status !== DONATION_STATUS.MATCHED
  ) {
    return { expired: false, donation: null };
  }

  // Determine target status: Expired if past its own deadline, otherwise Listed
  const targetStatus = isPastDeadline(donation.deadline)
    ? DONATION_STATUS.EXPIRED
    : DONATION_STATUS.LISTED;

  const qtyToRelease = donation.reservedQuantity || donation.quantity;

  // ATOMIC CONDITIONAL UPDATE:
  // Only transitions if the donation is still in RESERVED or MATCHED status.
  const expiredDonation = await Donation.findOneAndUpdate(
    {
      _id: donation._id,
      status: { $in: [DONATION_STATUS.RESERVED, DONATION_STATUS.MATCHED] },
    },
    {
      $set: {
        status: targetStatus,
        reservedQuantity: 0,
        matchedNeedId: null,
        matchedInstitutionId: null,
        matchedInstitutionName: null,
        reservedAt: null,
      },
    },
    { new: true }
  );

  // If null, another concurrent action (e.g. marked Ready for delivery, cancelled, or already expired) won the race
  if (!expiredDonation) {
    return { expired: false, donation: null };
  }

  // Decrement the Need's reservedQuantity exactly once
  if (donation.matchedNeedId) {
    await Need.findByIdAndUpdate(donation.matchedNeedId, {
      $inc: { reservedQuantity: -qtyToRelease },
    });
    const checkNeed = await Need.findById(donation.matchedNeedId);
    if (
      checkNeed &&
      checkNeed.status === 'Fulfilled' &&
      (checkNeed.usableStock || 0) + (checkNeed.reservedQuantity || 0) < checkNeed.requiredQuantity
    ) {
      await Need.findByIdAndUpdate(checkNeed._id, { $set: { status: 'Open' } });
    }
  }

  // Dispatch in-app notification to the donor
  if (donation.donorId) {
    const statusLabel = targetStatus === DONATION_STATUS.EXPIRED ? 'Expired' : 'Listed';
    await sendNotification({
      userId: donation.donorId,
      title: 'Reservation Expired',
      message: `Your reservation of ${donation.quantity} ${donation.unit} of "${donation.itemType}" has expired because it was not marked ready for delivery within ${RESERVATION_EXPIRY_HOURS} hours. Its status has returned to ${statusLabel}.`,
      type: 'reservation',
      link: '/donor/my-donations',
    });
  }

  // Dispatch in-app notification to the recipient institution user
  let institutionUserId = null;
  if (donation.matchedInstitutionId) {
    const inst = await Institution.findById(donation.matchedInstitutionId);
    institutionUserId = inst?.userId;
  }
  if (institutionUserId) {
    await sendNotification({
      userId: institutionUserId,
      title: 'Reservation Expired',
      message: `The reserved allocation of ${donation.quantity} ${donation.unit} of "${donation.itemType}" has expired without dispatch and the deficit has been restored to your need.`,
      type: 'reservation',
      link: '/institution/incoming-requests',
    });
  }

  return { expired: true, donation: expiredDonation };
}

/**
 * Scans and expires all reservations older than RESERVATION_EXPIRY_HOURS.
 * Safe to run lazily on reads or during a periodic sweep.
 *
 * @param {number} [expiryHours=RESERVATION_EXPIRY_HOURS] - Expiry threshold in hours
 * @returns {Promise<Array>} Array of expired donation records
 */
async function expireStaleReservations(expiryHours = RESERVATION_EXPIRY_HOURS) {
  const cutoff = new Date(Date.now() - expiryHours * 60 * 60 * 1000);

  const staleDonations = await Donation.find({
    status: DONATION_STATUS.RESERVED,
    $or: [
      { reservedAt: { $lte: cutoff } },
      { reservedAt: null, createdAt: { $lte: cutoff } },
      { reservedAt: { $exists: false }, createdAt: { $lte: cutoff } },
    ],
  });

  const expiredList = [];
  for (const donation of staleDonations) {
    const result = await expireDonationRecord(donation);
    if (result.expired) {
      expiredList.push(result.donation);
    }
  }

  return expiredList;
}

let sweepInterval = null;

/**
 * Starts an optional periodic background sweep for stale reservations.
 * Timer is unref'd so it does not block application or test suite shutdown.
 */
function startPeriodicSweep(intervalMs = 15 * 60 * 1000) {
  if (sweepInterval) return sweepInterval;
  sweepInterval = setInterval(() => {
    expireStaleReservations().catch((err) => {
      console.error('Reservation expiry sweep error:', err.message);
    });
  }, intervalMs);

  if (sweepInterval.unref) {
    sweepInterval.unref();
  }
  return sweepInterval;
}

function stopPeriodicSweep() {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}

module.exports = {
  RESERVATION_EXPIRY_HOURS,
  isPastDeadline,
  expireDonationRecord,
  expireStaleReservations,
  startPeriodicSweep,
  stopPeriodicSweep,
};
