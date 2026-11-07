const Need = require('../models/Need.js');
const Institution = require('../models/Institution.js');
const asyncHandler = require('../utils/asyncHandler.js');
const { ROLES } = require('../config/roles.js');
const { expireStaleReservations } = require('../services/reservationExpiryService.js');

/**
 * @desc    Get public needs directory (sanitized, approved institutions only)
 * @route   GET /api/needs/public
 * @access  Public
 */
const getPublicNeeds = asyncHandler(async (req, res) => {
  // Lazy expiry check: Release any stale reservations so need deficits are fresh
  await expireStaleReservations();

  const { category, urgency, search } = req.query;

  // Rule: Only open needs from Approved institutions can appear on the public board
  const approvedInstitutions = await Institution.find({
    verificationStatus: 'Approved',
  }).select('_id name institutionType address latitude longitude');

  const approvedMap = new Map();
  approvedInstitutions.forEach((inst) => {
    approvedMap.set(inst._id.toString(), inst);
  });
  const approvedIds = approvedInstitutions.map((i) => i._id);

  const query = {
    institutionId: { $in: approvedIds },
    status: { $in: ['Open', 'Fulfilled'] },
  };

  if (category && category !== 'all') {
    query.category = category;
  }
  if (urgency && urgency !== 'all') {
    query.urgency = urgency;
  }
  if (search && search.trim()) {
    const q = search.trim();
    query.$or = [
      { itemType: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
      { institutionName: { $regex: q, $options: 'i' } },
    ];
  }

  const needs = await Need.find(query).sort({ createdAt: -1 });

  const data = needs.map((n) => {
    const json = n.toJSON();
    const inst = approvedMap.get(n.institutionId.toString());
    if (inst) {
      json.latitude = json.latitude ?? inst.latitude ?? null;
      json.longitude = json.longitude ?? inst.longitude ?? null;
      json.institution = {
        id: inst._id.toString(),
        name: inst.name,
        institutionType: inst.institutionType,
        address: inst.address,
        latitude: inst.latitude ?? null,
        longitude: inst.longitude ?? null,
      };
    }
    return json;
  });

  res.status(200).json({
    success: true,
    data,
    count: data.length,
  });
});

/**
 * @desc    Get institution needs (filtered by institution ID or authenticated institution)
 * @route   GET /api/needs
 * @access  Private / Public depending on query
 */
const getNeeds = asyncHandler(async (req, res) => {
  // Lazy expiry check: Release stale reservations
  await expireStaleReservations();

  const { institutionId } = req.query;

  let query = {};
  if (institutionId) {
    // If institutionId is an ObjectId or custom lookup
    query.institutionId = institutionId;
  } else if (req.user && req.user.role === ROLES.INSTITUTION) {
    const inst = await Institution.findOne({ userId: req.user._id });
    if (inst) {
      query.institutionId = inst._id;
    }
  }

  const needs = await Need.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: needs.map((n) => n.toJSON()),
    count: needs.length,
  });
});

/**
 * @desc    Get need by ID
 * @route   GET /api/needs/:id
 * @access  Public
 */
const getNeedById = asyncHandler(async (req, res) => {
  // Lazy expiry check: Release stale reservations
  await expireStaleReservations();

  const need = await Need.findById(req.params.id);
  if (!need) {
    return res.status(404).json({
      success: false,
      error: 'Need record not found.',
    });
  }

  res.status(200).json({
    success: true,
    data: need.toJSON(),
  });
});

/**
 * @desc    Publish a new institution need
 * @route   POST /api/needs
 * @access  Private (Approved Institution only)
 */
const createNeed = asyncHandler(async (req, res) => {
  const institution = await Institution.findOne({ userId: req.user._id });

  if (!institution) {
    return res.status(404).json({
      success: false,
      error: 'Institution profile not found.',
    });
  }

  // Security Rule: Only Approved institutions can publish needs
  if (institution.verificationStatus !== 'Approved') {
    return res.status(403).json({
      success: false,
      error: `Only approved institutions can create or publish needs. Your verification status is currently "${institution.verificationStatus}".`,
    });
  }

  const {
    category,
    itemType,
    requiredQuantity,
    usableStock,
    unit,
    urgency,
    deadline,
    acceptableCondition,
    notes,
  } = req.body;

  const need = await Need.create({
    institutionId: institution._id,
    institutionName: institution.name,
    institutionType: institution.institutionType,
    category,
    itemType: (itemType || '').trim(),
    requiredQuantity: Number(requiredQuantity),
    usableStock: Number(usableStock || 0),
    reservedQuantity: 0,
    unit: (unit || '').trim(),
    urgency: urgency || 'Medium',
    deadline: deadline || null,
    acceptableCondition:
      acceptableCondition || 'New or gently used in clean, usable condition',
    notes: (notes || '').trim(),
    address: institution.address,
    latitude: institution.latitude ?? null,
    longitude: institution.longitude ?? null,
    status: 'Open',
    isSample: false,
  });

  res.status(201).json({
    success: true,
    data: need.toJSON(),
    message: 'Need created and published successfully.',
  });
});

/**
 * @desc    Update existing need (details, stock levels, or status)
 * @route   PUT /api/needs/:id
 * @access  Private (Owning Institution or Admin)
 */
const updateNeed = asyncHandler(async (req, res) => {
  const need = await Need.findById(req.params.id);

  if (!need) {
    return res.status(404).json({
      success: false,
      error: 'Need record not found.',
    });
  }

  // Check ownership
  if (req.user.role === ROLES.INSTITUTION) {
    const institution = await Institution.findOne({ userId: req.user._id });
    if (!institution || need.institutionId.toString() !== institution._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only modify needs published by your institution.',
      });
    }
  }

  const {
    category,
    itemType,
    requiredQuantity,
    usableStock,
    reservedQuantity,
    unit,
    urgency,
    deadline,
    acceptableCondition,
    notes,
    status,
  } = req.body;

  if (category !== undefined) need.category = category;
  if (itemType !== undefined) need.itemType = itemType.trim();

  // Rule 1: Reject requiredQuantity < reservedQuantity with a clear message
  if (requiredQuantity !== undefined) {
    const newRequired = Number(requiredQuantity);
    const currentReserved = reservedQuantity !== undefined
      ? Number(reservedQuantity)
      : (need.reservedQuantity || 0);

    if (newRequired < currentReserved) {
      return res.status(400).json({
        success: false,
        error: `Required quantity cannot be lower than the quantity already reserved (${currentReserved})`,
      });
    }
    need.requiredQuantity = newRequired;
  }

  if (usableStock !== undefined) need.usableStock = Number(usableStock);
  if (reservedQuantity !== undefined) need.reservedQuantity = Number(reservedQuantity);
  if (unit !== undefined) need.unit = unit.trim();
  if (urgency !== undefined) need.urgency = urgency;
  if (deadline !== undefined) need.deadline = deadline;
  if (acceptableCondition !== undefined) need.acceptableCondition = acceptableCondition.trim();
  if (notes !== undefined) need.notes = notes.trim();
  if (status !== undefined) need.status = status;

  await need.save();

  res.status(200).json({
    success: true,
    data: need.toJSON(),
    message: 'Need updated successfully.',
  });
});

/**
 * @desc    Delete or archive a need
 * @route   DELETE /api/needs/:id
 * @access  Private (Owning Institution or Admin)
 */
const deleteNeed = asyncHandler(async (req, res) => {
  const need = await Need.findById(req.params.id);

  if (!need) {
    return res.status(404).json({
      success: false,
      error: 'Need record not found.',
    });
  }

  // Check ownership
  if (req.user.role === ROLES.INSTITUTION) {
    const institution = await Institution.findOne({ userId: req.user._id });
    if (!institution || need.institutionId.toString() !== institution._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only delete needs belonging to your institution.',
      });
    }
  }

  await need.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Need removed successfully.',
  });
});

module.exports = {
  getPublicNeeds,
  getNeeds,
  getNeedById,
  createNeed,
  updateNeed,
  deleteNeed,
};
