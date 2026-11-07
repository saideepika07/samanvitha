const Donation = require('../models/Donation.js');
const Need = require('../models/Need.js');
const Institution = require('../models/Institution.js');
const asyncHandler = require('../utils/asyncHandler.js');
const { DONATION_STATUS } = require('../config/donationStatus.js');
const { ROLES } = require('../config/roles.js');
const { expireStaleReservations } = require('../services/reservationExpiryService.js');
const { storageAdapter } = require('../services/storage/storageAdapter.js');

/**
 * @desc    Get authenticated donor's donations
 * @route   GET /api/donations/my
 * @access  Private (Donor only)
 */
const getMyDonations = asyncHandler(async (req, res) => {
  // Lazy expiry check: Release stale reservations
  await expireStaleReservations();

  const donations = await Donation.find({ donorId: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: donations.map((d) => d.toJSON()),
    count: donations.length,
  });
});

/**
 * @desc    Get all donations (Admin or filtered)
 * @route   GET /api/donations
 * @access  Private (Admin or Authenticated)
 */
const getAllDonations = asyncHandler(async (req, res) => {
  // Lazy expiry check: Release stale reservations
  await expireStaleReservations();
  const { category, status, donorId } = req.query;

  const query = {};
  if (category && category !== 'all') query.category = category;
  if (status && status !== 'all') query.status = status;
  if (donorId) query.donorId = donorId;

  // Non-admins can only see their own donations if not filtering
  if (req.user.role === ROLES.DONOR && !donorId) {
    query.donorId = req.user._id;
  }

  const donations = await Donation.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: donations.map((d) => d.toJSON()),
    count: donations.length,
  });
});

/**
 * @desc    Get single donation by ID
 * @route   GET /api/donations/:id
 * @access  Private
 */
const getDonationById = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);

  if (!donation) {
    return res.status(404).json({
      success: false,
      error: 'Donation record not found.',
    });
  }

  // Authorization check
  const isDonorOwner = req.user.role === ROLES.DONOR && donation.donorId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;
  let isMatchedInst = false;

  if (req.user.role === ROLES.INSTITUTION && donation.matchedInstitutionId) {
    const inst = await Institution.findOne({ userId: req.user._id });
    if (inst && inst._id.toString() === donation.matchedInstitutionId.toString()) {
      isMatchedInst = true;
    }
  }

  if (!isDonorOwner && !isAdmin && !isMatchedInst) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this donation record.',
    });
  }

  res.status(200).json({
    success: true,
    data: donation.toJSON(),
  });
});

/**
 * @desc    Create a new donation pledge
 * @route   POST /api/donations
 * @access  Private (Donor only)
 */
const createDonation = asyncHandler(async (req, res) => {
  const {
    category,
    itemType,
    quantity,
    unit,
    condition,
    location,
    latitude,
    longitude,
    deadline,
    notes,
    image,
    matchedNeedId,
  } = req.body;

  let parsedLat = null;
  let parsedLng = null;

  if (latitude !== undefined && latitude !== null && latitude !== '') {
    const num = Number(latitude);
    if (isNaN(num) || num < -90 || num > 90) {
      return res.status(400).json({
        success: false,
        error: 'Latitude must be a valid number between -90 and 90.',
      });
    }
    // Round to 2 decimals (~1 km) for donor privacy
    parsedLat = Math.round(num * 100) / 100;
  }

  if (longitude !== undefined && longitude !== null && longitude !== '') {
    const num = Number(longitude);
    if (isNaN(num) || num < -180 || num > 180) {
      return res.status(400).json({
        success: false,
        error: 'Longitude must be a valid number between -180 and 180.',
      });
    }
    // Round to 2 decimals (~1 km) for donor privacy
    parsedLng = Math.round(num * 100) / 100;
  }

  let matchedNeed = null;
  let matchedInstitution = null;

  // Direct pledge to an existing need
  if (matchedNeedId) {
    matchedNeed = await Need.findById(matchedNeedId);
    if (!matchedNeed) {
      return res.status(404).json({
        success: false,
        error: 'The selected institution need no longer exists.',
      });
    }

    matchedInstitution = await Institution.findById(matchedNeed.institutionId);
    if (!matchedInstitution || matchedInstitution.verificationStatus !== 'Approved') {
      return res.status(403).json({
        success: false,
        error: 'Pledges can only be reserved for approved care institutions.',
      });
    }

    if (matchedNeed.remainingNeed <= 0) {
      return res.status(400).json({
        success: false,
        error: 'This need has already been completely fulfilled or reserved.',
      });
    }
  }

  // Process donation photo through storage adapter if base64 data URI provided
  let processedImage = image || null;
  if (image && typeof image === 'string' && image.startsWith('data:image/')) {
    try {
      const savedPhoto = await storageAdapter.saveDonationPhotoBase64(image);
      processedImage = savedPhoto?.url || savedPhoto || image;
    } catch (photoErr) {
      console.warn('Donation photo processing warning:', photoErr.message);
    }
  }

  const totalQty = Number(quantity);
  const needRemaining = matchedNeed
    ? Math.max(
        0,
        (matchedNeed.requiredQuantity || 0) -
          (matchedNeed.usableStock || 0) -
          (matchedNeed.reservedQuantity || 0)
      )
    : 0;

  const reserveQty = matchedNeed ? Math.min(totalQty, needRemaining) : 0;
  const unreservedQty = matchedNeed ? totalQty - reserveQty : 0;

  const donation = new Donation({
    donorId: req.user._id,
    donorName: req.user.name,
    category,
    itemType: (itemType || '').trim(),
    quantity: matchedNeed ? reserveQty : totalQty,
    reservedQuantity: matchedNeed ? reserveQty : 0,
    unit: (unit || '').trim(),
    condition: condition || 'New or gently used in clean, usable condition',
    location: (location || req.user.address || 'Hyderabad').trim(),
    latitude: parsedLat,
    longitude: parsedLng,
    deadline: deadline || null,
    notes: (notes || '').trim(),
    image: processedImage || null,
    status: matchedNeed ? DONATION_STATUS.RESERVED : DONATION_STATUS.LISTED,
    matchedNeedId: matchedNeed ? matchedNeed._id : null,
    matchedInstitutionId: matchedInstitution ? matchedInstitution._id : null,
    matchedInstitutionName: matchedInstitution ? matchedInstitution.name : null,
    reservedAt: matchedNeed ? new Date() : null,
    isSample: false,
  });

  await donation.save();

  let unreservedDonation = null;
  if (matchedNeed && unreservedQty > 0) {
    unreservedDonation = new Donation({
      donorId: req.user._id,
      donorName: req.user.name,
      category,
      itemType: (itemType || '').trim(),
      quantity: unreservedQty,
      reservedQuantity: 0,
      unit: (unit || '').trim(),
      condition: condition || 'New or gently used in clean, usable condition',
      location: (location || req.user.address || 'Hyderabad').trim(),
      latitude: parsedLat,
      longitude: parsedLng,
      deadline: deadline || null,
      notes: (notes || '').trim(),
      image: processedImage || null,
      status: DONATION_STATUS.LISTED,
      matchedNeedId: null,
      matchedInstitutionId: null,
      matchedInstitutionName: null,
      reservedAt: null,
      isSample: false,
    });
    await unreservedDonation.save();
  }

  // Deduplication & Inventory Reservation: Atomically increment reserved quantity on the need
  if (matchedNeed) {
    const updatedNeed = await Need.findOneAndUpdate(
      {
        _id: matchedNeed._id,
        $expr: {
          $gte: [
            {
              $subtract: [
                '$requiredQuantity',
                { $add: [{ $ifNull: ['$usableStock', 0] }, { $ifNull: ['$reservedQuantity', 0] }] }
              ]
            },
            reserveQty
          ]
        }
      },
      { $inc: { reservedQuantity: reserveQty } },
      { new: true }
    );

    if (!updatedNeed) {
      await Donation.findByIdAndDelete(donation._id);
      if (unreservedDonation) await Donation.findByIdAndDelete(unreservedDonation._id);
      return res.status(400).json({
        success: false,
        error: 'This need has already been completely fulfilled or reserved.',
      });
    }

    if (
      updatedNeed.status === 'Open' &&
      (updatedNeed.usableStock || 0) + (updatedNeed.reservedQuantity || 0) >= updatedNeed.requiredQuantity
    ) {
      updatedNeed.status = 'Fulfilled';
      await Need.findByIdAndUpdate(updatedNeed._id, { $set: { status: 'Fulfilled' } });
    }
  }

  res.status(201).json({
    success: true,
    data: donation.toJSON(),
    message: matchedNeed
      ? `Donation successfully reserved for ${matchedInstitution.name}!`
      : 'Donation listed successfully! Matching suggestions are now available.',
  });
});

/**
 * @desc    Update donation lifecycle status (Listed -> Reserved -> Ready -> Delivered -> Received -> Completed)
 * @route   PUT /api/donations/:id/status
 * @access  Private
 */
const updateDonationStatus = asyncHandler(async (req, res) => {
  const { status, notes, cancelReason } = req.body;
  const donation = await Donation.findById(req.params.id);

  if (!donation) {
    return res.status(404).json({
      success: false,
      error: 'Donation record not found.',
    });
  }

  const previousStatus = donation.status;
  const isDonorOwner = donation.donorId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;

  let isMatchedInst = false;
  if (req.user.role === ROLES.INSTITUTION && donation.matchedInstitutionId) {
    const inst = await Institution.findOne({ userId: req.user._id });
    if (inst && inst._id.toString() === donation.matchedInstitutionId.toString()) {
      isMatchedInst = true;
    }
  }

  // Role permissions check
  if (status === DONATION_STATUS.READY_FOR_DELIVERY || status === DONATION_STATUS.DELIVERED) {
    if (!isDonorOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only the donating party or an admin can update delivery readiness.',
      });
    }
  } else if (status === DONATION_STATUS.RECEIVED || status === DONATION_STATUS.COMPLETED) {
    if (!isMatchedInst && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only the recipient institution or an admin can confirm receipt.',
      });
    }
  } else if (status === DONATION_STATUS.CANCELLED) {
    if (!isDonorOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only the donor or an admin can cancel a donation.',
      });
    }

    if (donation.status === DONATION_STATUS.CANCELLED) {
      return res.status(200).json({
        success: true,
        data: donation.toJSON(),
        message: 'Donation is already cancelled.',
      });
    }

    // Atomic conditional transition from active reserved state to Cancelled
    const qtyToRelease = donation.reservedQuantity || donation.quantity;
    const cancelledReserved = await Donation.findOneAndUpdate(
      {
        _id: donation._id,
        status: {
          $in: [
            DONATION_STATUS.RESERVED,
            DONATION_STATUS.MATCHED,
            DONATION_STATUS.READY_FOR_DELIVERY,
          ],
        },
      },
      {
        $set: {
          status: DONATION_STATUS.CANCELLED,
          reservedQuantity: 0,
          cancelReason: cancelReason || notes || 'Cancelled by donor.',
        },
      },
      { new: true }
    );

    if (cancelledReserved) {
      if (cancelledReserved.matchedNeedId) {
        await Need.findByIdAndUpdate(cancelledReserved.matchedNeedId, {
          $inc: { reservedQuantity: -qtyToRelease },
        });
        const checkNeed = await Need.findById(cancelledReserved.matchedNeedId);
        if (
          checkNeed &&
          checkNeed.status === 'Fulfilled' &&
          (checkNeed.usableStock || 0) + (checkNeed.reservedQuantity || 0) < checkNeed.requiredQuantity
        ) {
          await Need.findByIdAndUpdate(checkNeed._id, { $set: { status: 'Open' } });
        }
      }
      return res.status(200).json({
        success: true,
        data: cancelledReserved.toJSON(),
        message: 'Donation status updated to "Cancelled".',
      });
    }

    const cancelledListed = await Donation.findOneAndUpdate(
      {
        _id: donation._id,
        status: DONATION_STATUS.LISTED,
      },
      {
        $set: {
          status: DONATION_STATUS.CANCELLED,
          cancelReason: cancelReason || notes || 'Cancelled by donor.',
        },
      },
      { new: true }
    );

    if (cancelledListed) {
      return res.status(200).json({
        success: true,
        data: cancelledListed.toJSON(),
        message: 'Donation status updated to "Cancelled".',
      });
    }

    const latest = await Donation.findById(donation._id);
    if (latest.status === DONATION_STATUS.CANCELLED) {
      return res.status(200).json({
        success: true,
        data: latest.toJSON(),
        message: 'Donation is already cancelled.',
      });
    }

    return res.status(400).json({
      success: false,
      error: `Cannot cancel donation in "${latest.status}" state.`,
    });
  }

  // Inventory & Deficit State Transitions
  // 1. If transitioning to Received or Completed: Reserved quantity transitions into usable stock!
  if (
    (status === DONATION_STATUS.RECEIVED || status === DONATION_STATUS.COMPLETED) &&
    previousStatus !== DONATION_STATUS.RECEIVED &&
    previousStatus !== DONATION_STATUS.COMPLETED
  ) {
    if (donation.matchedNeedId) {
      const qtyToAcknowledge = donation.reservedQuantity || donation.quantity;
      await Need.findByIdAndUpdate(donation.matchedNeedId, {
        $inc: {
          reservedQuantity: -qtyToAcknowledge,
          usableStock: qtyToAcknowledge,
        },
      });
      const checkNeed = await Need.findById(donation.matchedNeedId);
      if (
        checkNeed &&
        checkNeed.status === 'Open' &&
        (checkNeed.usableStock || 0) + (checkNeed.reservedQuantity || 0) >= checkNeed.requiredQuantity
      ) {
        await Need.findByIdAndUpdate(checkNeed._id, { $set: { status: 'Fulfilled' } });
      }
    }
    if (!donation.receivedAt) {
      donation.receivedAt = new Date();
    }
    if (status === DONATION_STATUS.COMPLETED && !donation.completedAt) {
      donation.completedAt = new Date();
    }
  }

  // If already Received and now transitioning to Completed
  if (status === DONATION_STATUS.COMPLETED && !donation.completedAt) {
    donation.completedAt = new Date();
  }

  if (status === DONATION_STATUS.DELIVERED && !donation.deliveredAt) {
    donation.deliveredAt = new Date();
  }

  donation.status = status;
  if (notes) donation.notes = notes.trim();

  await donation.save();

  res.status(200).json({
    success: true,
    data: donation.toJSON(),
    message: `Donation status updated to "${status}".`,
  });
});

/**
 * @desc    Cancel a donation pledge and release reserved need deficit
 * @route   POST /api/donations/:id/cancel
 * @access  Private (Donor or Admin)
 */
const cancelDonation = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const donation = await Donation.findById(req.params.id);

  if (!donation) {
    return res.status(404).json({
      success: false,
      error: 'Donation record not found.',
    });
  }

  const isDonorOwner = donation.donorId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;

  if (!isDonorOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. You can only cancel your own donations.',
    });
  }

  // Idempotency: If already cancelled, return success without altering need reservedQuantity again!
  if (donation.status === DONATION_STATUS.CANCELLED) {
    return res.status(200).json({
      success: true,
      data: donation.toJSON(),
      message: 'Donation pledge has already been cancelled.',
    });
  }

  const qtyToRelease = donation.reservedQuantity || donation.quantity;

  // Atomic conditional transition from an active reserved state to CANCELLED:
  // Exactly ONE concurrent / duplicate call matches and transitions status.
  const cancelledReservedDonation = await Donation.findOneAndUpdate(
    {
      _id: donation._id,
      status: {
        $in: [
          DONATION_STATUS.RESERVED,
          DONATION_STATUS.MATCHED,
          DONATION_STATUS.READY_FOR_DELIVERY,
        ],
      },
    },
    {
      $set: {
        status: DONATION_STATUS.CANCELLED,
        reservedQuantity: 0,
        cancelReason: reason || 'Cancelled by donor.',
      },
    },
    { new: true }
  );

  if (cancelledReservedDonation) {
    // Only the winning call that actually transitioned the status decrements Need reservedQuantity!
    if (cancelledReservedDonation.matchedNeedId) {
      await Need.findByIdAndUpdate(cancelledReservedDonation.matchedNeedId, {
        $inc: { reservedQuantity: -qtyToRelease },
      });
      const checkNeed = await Need.findById(cancelledReservedDonation.matchedNeedId);
      if (
        checkNeed &&
        checkNeed.status === 'Fulfilled' &&
        (checkNeed.usableStock || 0) + (checkNeed.reservedQuantity || 0) < checkNeed.requiredQuantity
      ) {
        await Need.findByIdAndUpdate(checkNeed._id, { $set: { status: 'Open' } });
      }
    }
    return res.status(200).json({
      success: true,
      data: cancelledReservedDonation.toJSON(),
      message: 'Donation pledge cancelled and reserved deficit restored.',
    });
  }

  // If donation was Listed (not reserved)
  const cancelledListedDonation = await Donation.findOneAndUpdate(
    {
      _id: donation._id,
      status: DONATION_STATUS.LISTED,
    },
    {
      $set: {
        status: DONATION_STATUS.CANCELLED,
        cancelReason: reason || 'Cancelled by donor.',
      },
    },
    { new: true }
  );

  if (cancelledListedDonation) {
    return res.status(200).json({
      success: true,
      data: cancelledListedDonation.toJSON(),
      message: 'Donation pledge cancelled.',
    });
  }

  // If another concurrent request already cancelled it:
  const currentDonation = await Donation.findById(donation._id);
  if (currentDonation.status === DONATION_STATUS.CANCELLED) {
    return res.status(200).json({
      success: true,
      data: currentDonation.toJSON(),
      message: 'Donation pledge has already been cancelled.',
    });
  }

  return res.status(400).json({
    success: false,
    error: `Cannot cancel donation in "${currentDonation.status}" state.`,
  });
});

/**
 * @desc    Get incoming donations/reservations for current institution
 * @route   GET /api/donations/institution/incoming
 * @access  Private (Institution only)
 */
const getInstitutionIncoming = asyncHandler(async (req, res) => {
  // Lazy expiry check: Release stale reservations before displaying incoming items
  await expireStaleReservations();

  const institution = await Institution.findOne({ userId: req.user._id });
  if (!institution) {
    return res.status(404).json({
      success: false,
      error: 'Institution profile not found.',
    });
  }

  const incomingStatuses = [
    DONATION_STATUS.MATCHED,
    DONATION_STATUS.RESERVED,
    DONATION_STATUS.READY_FOR_DELIVERY,
    DONATION_STATUS.DELIVERED,
  ];

  const donations = await Donation.find({
    matchedInstitutionId: institution._id,
    status: { $in: incomingStatuses },
  }).sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    data: donations.map((d) => d.toJSON()),
    count: donations.length,
  });
});

/**
 * @desc    Get received & completed donations for current institution
 * @route   GET /api/donations/institution/received
 * @access  Private (Institution only)
 */
const getInstitutionReceived = asyncHandler(async (req, res) => {
  const institution = await Institution.findOne({ userId: req.user._id });
  if (!institution) {
    return res.status(404).json({
      success: false,
      error: 'Institution profile not found.',
    });
  }

  const receivedStatuses = [DONATION_STATUS.RECEIVED, DONATION_STATUS.COMPLETED];

  const donations = await Donation.find({
    matchedInstitutionId: institution._id,
    status: { $in: receivedStatuses },
  }).sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    data: donations.map((d) => d.toJSON()),
    count: donations.length,
  });
});

/**
 * @desc    Upload donation photo (JPG, PNG, WebP)
 * @route   POST /api/donations/upload-photo
 * @access  Private (Donor only)
 */
const uploadDonationPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please select a photo to upload.',
    });
  }

  const result = await storageAdapter.saveDonationPhoto(req.file);

  res.status(200).json({
    success: true,
    data: {
      url: result.url,
      filename: result.filename,
    },
    message: 'Donation photo uploaded successfully.',
  });
});

module.exports = {
  getMyDonations,
  getAllDonations,
  getDonationById,
  createDonation,
  uploadDonationPhoto,
  updateDonationStatus,
  cancelDonation,
  getInstitutionIncoming,
  getInstitutionReceived,
};
