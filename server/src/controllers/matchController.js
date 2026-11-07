// Match Controller - Algorithmic Matching & Reservation Endpoints
const Donation = require('../models/Donation.js');
const Need = require('../models/Need.js');
const Institution = require('../models/Institution.js');
const matchEngine = require('../services/matchEngine.js');
const asyncHandler = require('../utils/asyncHandler.js');
const { DONATION_STATUS } = require('../config/donationStatus.js');
const { ROLES } = require('../config/roles.js');
const { expireDonationRecord, expireStaleReservations } = require('../services/reservationExpiryService.js');

/**
 * @desc    Get algorithmic match suggestions for a specific donation
 * @route   GET /api/matches/suggestions/:donationId
 * @access  Private (Donor or Admin)
 */
const getMatchSuggestions = asyncHandler(async (req, res) => {
  // Lazy expiry check: Release any stale reservations before computing match suggestions
  await expireStaleReservations();

  const { donationId } = req.params;

  const donation = await Donation.findById(donationId);
  if (!donation) {
    return res.status(404).json({
      success: false,
      error: 'Donation record not found.',
    });
  }

  // Ownership check: Donor who listed the donation or an Admin
  if (
    req.user.role === ROLES.DONOR &&
    donation.donorId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. You can only view match suggestions for your own donations.',
    });
  }

  const suggestions = await matchEngine.getSuggestionsForDonation(donation._id);

  res.status(200).json({
    success: true,
    data: suggestions,
    count: suggestions.length,
  });
});

/**
 * @desc    Reserve an algorithmic match between a donation and an institution need
 * @route   POST /api/matches/reserve
 * @access  Private (Donor or Admin)
 */
const reserveMatch = asyncHandler(async (req, res) => {
  const { donationId, needId, quantity } = req.body;

  if (!donationId || !needId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both donationId and needId.',
    });
  }

  const donation = await Donation.findById(donationId);
  if (!donation) {
    return res.status(404).json({
      success: false,
      error: 'Donation record not found.',
    });
  }

  // Ownership check
  if (
    req.user.role === ROLES.DONOR &&
    donation.donorId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. You can only reserve matches for your own donations.',
    });
  }

  // Check if donation is already reserved or completed
  if (donation.status !== DONATION_STATUS.LISTED && donation.status !== DONATION_STATUS.MATCHED) {
    return res.status(400).json({
      success: false,
      error: `Donation is already in "${donation.status}" state and cannot be re-reserved.`,
    });
  }

  const need = await Need.findById(needId);
  if (!need) {
    return res.status(404).json({
      success: false,
      error: 'Institution need record not found.',
    });
  }

  // Verification rule: target institution must be Approved
  const institution = await Institution.findById(need.institutionId);
  if (!institution || institution.verificationStatus !== 'Approved') {
    return res.status(403).json({
      success: false,
      error: 'Matches can only be reserved for verified, approved care institutions.',
    });
  }

  // If caller is an institution, ensure they own the need
  if (req.user.role === ROLES.INSTITUTION) {
    if (institution.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Institutions can only reserve donations for their own needs.',
      });
    }
  }

  // Category match validation
  if (donation.category !== need.category) {
    return res.status(400).json({
      success: false,
      error: `Category mismatch: donation is "${donation.category}", but need requires "${need.category}".`,
    });
  }

  // Check remaining deficit
  const needRemaining = Math.max(
    0,
    (need.requiredQuantity || 0) - (need.usableStock || 0) - (need.reservedQuantity || 0)
  );

  if (needRemaining <= 0) {
    return res.status(400).json({
      success: false,
      error: 'This need has already been completely fulfilled or reserved by other donors.',
    });
  }

  // Calculate available donation quantity
  const donationAvailable = donation.availableQuantity != null
    ? donation.availableQuantity
    : Math.max(0, (donation.quantity || 0) - (donation.reservedQuantity || 0));

  if (donationAvailable <= 0) {
    return res.status(400).json({
      success: false,
      error: 'This donation has no available quantity remaining.',
    });
  }

  // Reserve rule: never make usableStock + reservedQuantity exceed requiredQuantity.
  // Reserve only min(donation available quantity, need remaining).
  let requestedQty;
  if (quantity !== undefined && quantity !== null && quantity !== '') {
    const parsed = Number(quantity);
    if (isNaN(parsed) || parsed <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Requested quantity must be a positive number.',
      });
    }

    if (parsed > donationAvailable) {
      return res.status(400).json({
        success: false,
        error: `Requested quantity (${parsed}) exceeds available donation quantity (${donationAvailable}).`,
      });
    }

    requestedQty = Math.min(parsed, needRemaining);
  } else {
    requestedQty = Math.min(donationAvailable, needRemaining);
  }

  // Partial reservation: Donation has more units than requested
  if (requestedQty < donation.quantity) {
    // 1. Atomic conditional decrement on original donation:
    // Guarantees quantity never goes negative under concurrent requests.
    const updatedOriginal = await Donation.findOneAndUpdate(
      {
        _id: donation._id,
        status: { $in: [DONATION_STATUS.LISTED, DONATION_STATUS.MATCHED] },
        quantity: { $gte: requestedQty + 1 },
      },
      {
        $inc: { quantity: -requestedQty },
      },
      { new: true }
    );

    if (!updatedOriginal) {
      return res.status(400).json({
        success: false,
        error: `Insufficient available donation quantity for reservation of ${requestedQty} units.`,
      });
    }

    // 2. Create the reserved donation slice and atomically increment Need reservedQuantity
    let reservedSlice;
    try {
      reservedSlice = await Donation.create({
        donorId: donation.donorId,
        donorName: donation.donorName,
        category: donation.category,
        itemType: donation.itemType,
        quantity: requestedQty,
        reservedQuantity: requestedQty,
        unit: donation.unit,
        condition: donation.condition,
        location: donation.location,
        latitude: donation.latitude,
        longitude: donation.longitude,
        deadline: donation.deadline,
        notes: donation.notes,
        image: donation.image,
        status: DONATION_STATUS.RESERVED,
        matchedNeedId: need._id,
        matchedInstitutionId: institution._id,
        matchedInstitutionName: institution.name,
        reservedAt: new Date(),
        isSample: donation.isSample || false,
      });

      // Atomic conditional update on Need: guarantees required - usable - reserved >= requestedQty
      const updatedNeed = await Need.findOneAndUpdate(
        {
          _id: need._id,
          $expr: {
            $gte: [
              {
                $subtract: [
                  '$requiredQuantity',
                  { $add: [{ $ifNull: ['$usableStock', 0] }, { $ifNull: ['$reservedQuantity', 0] }] }
                ]
              },
              requestedQty
            ]
          }
        },
        { $inc: { reservedQuantity: requestedQty } },
        { new: true }
      );

      if (!updatedNeed) {
        // Compensation rollback
        await Donation.findByIdAndUpdate(donation._id, {
          $inc: { quantity: requestedQty },
        });
        if (reservedSlice?._id) {
          await Donation.findByIdAndDelete(reservedSlice._id);
        }
        return res.status(400).json({
          success: false,
          error: 'This need has already been completely fulfilled or reserved by other donors.',
        });
      }

      if (
        updatedNeed.status === 'Open' &&
        (updatedNeed.usableStock || 0) + (updatedNeed.reservedQuantity || 0) >= updatedNeed.requiredQuantity
      ) {
        updatedNeed.status = 'Fulfilled';
        await Need.findByIdAndUpdate(updatedNeed._id, { $set: { status: 'Fulfilled' } });
      }

      return res.status(200).json({
        success: true,
        data: {
          donation: reservedSlice.toJSON(),
          need: updatedNeed.toJSON(),
          remainingDonation: updatedOriginal.toJSON(),
        },
        message: `Match reserved successfully for ${institution.name}.`,
      });
    } catch (err) {
      // COMPENSATION ROLLBACK: Revert deducted quantity on original and delete reserved slice
      await Donation.findByIdAndUpdate(donation._id, {
        $inc: { quantity: requestedQty },
      });
      if (reservedSlice?._id) {
        await Donation.findByIdAndDelete(reservedSlice._id);
      }
      throw err;
    }
  } else {
    // Full reservation: Atomic conditional update on the Donation
    // Strictly transitions status from Listed/Matched to Reserved.
    const reservedDonation = await Donation.findOneAndUpdate(
      {
        _id: donation._id,
        status: { $in: [DONATION_STATUS.LISTED, DONATION_STATUS.MATCHED] },
        quantity: requestedQty,
      },
      {
        $set: {
          status: DONATION_STATUS.RESERVED,
          reservedQuantity: requestedQty,
          matchedNeedId: need._id,
          matchedInstitutionId: institution._id,
          matchedInstitutionName: institution.name,
          reservedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!reservedDonation) {
      return res.status(400).json({
        success: false,
        error: `Donation is already in "${donation.status}" state or has insufficient quantity.`,
      });
    }

    let updatedNeed;
    try {
      // Atomic conditional update on Need: guarantees required - usable - reserved >= requestedQty
      updatedNeed = await Need.findOneAndUpdate(
        {
          _id: need._id,
          $expr: {
            $gte: [
              {
                $subtract: [
                  '$requiredQuantity',
                  { $add: [{ $ifNull: ['$usableStock', 0] }, { $ifNull: ['$reservedQuantity', 0] }] }
                ]
              },
              requestedQty
            ]
          }
        },
        { $inc: { reservedQuantity: requestedQty } },
        { new: true }
      );

      if (!updatedNeed) {
        // Compensation rollback
        await Donation.findByIdAndUpdate(donation._id, {
          $set: {
            status: donation.status,
            reservedQuantity: 0,
            matchedNeedId: null,
            matchedInstitutionId: null,
            matchedInstitutionName: null,
            reservedAt: null,
          },
        });
        return res.status(400).json({
          success: false,
          error: 'This need has already been completely fulfilled or reserved by other donors.',
        });
      }

      if (
        updatedNeed.status === 'Open' &&
        (updatedNeed.usableStock || 0) + (updatedNeed.reservedQuantity || 0) >= updatedNeed.requiredQuantity
      ) {
        updatedNeed.status = 'Fulfilled';
        await Need.findByIdAndUpdate(updatedNeed._id, { $set: { status: 'Fulfilled' } });
      }
    } catch (err) {
      // COMPENSATION ROLLBACK: Revert donation back to original Listed status
      await Donation.findByIdAndUpdate(donation._id, {
        $set: {
          status: donation.status,
          reservedQuantity: 0,
          matchedNeedId: null,
          matchedInstitutionId: null,
          matchedInstitutionName: null,
          reservedAt: null,
        },
      });
      throw err;
    }

    return res.status(200).json({
      success: true,
      data: {
        donation: reservedDonation.toJSON(),
        need: updatedNeed.toJSON(),
      },
      message: `Match reserved successfully for ${institution.name}.`,
    });
  }
});

/**
 * @desc    Expire an unfulfilled reservation, restoring donation status to Listed and releasing reservedQuantity on Need
 * @route   POST /api/matches/expire
 * @access  Private
 */
const expireReservation = asyncHandler(async (req, res) => {
  const { donationId } = req.body;
  const targetId = donationId || req.params.id;
  const donation = await Donation.findById(targetId);

  if (!donation) {
    return res.status(404).json({
      success: false,
      error: 'Donation record not found.',
    });
  }

  // Idempotency check: if already Listed or Cancelled, return success without touching Need
  if (donation.status === DONATION_STATUS.LISTED || donation.status === DONATION_STATUS.CANCELLED) {
    return res.status(200).json({
      success: true,
      data: donation.toJSON(),
      message: 'Reservation is already released or donation is not reserved.',
    });
  }

  // Atomic conditional transition using shared reservationExpiryService
  const { expired, donation: expiredDonation } = await expireDonationRecord(donation);

  if (expired && expiredDonation) {
    return res.status(200).json({
      success: true,
      data: expiredDonation.toJSON(),
      message: 'Reservation expired successfully and quantity released back to open pool.',
    });
  }

  const current = await Donation.findById(donation._id);
  return res.status(200).json({
    success: true,
    data: current ? current.toJSON() : donation.toJSON(),
    message: 'Reservation has already been expired or altered.',
  });
});

module.exports = {
  getMatchSuggestions,
  reserveMatch,
  expireReservation,
};
