// Dispute Controller - Delivery Reconciliation & Administrative Resolution
const Dispute = require('../models/Dispute.js');
const Donation = require('../models/Donation.js');
const Institution = require('../models/Institution.js');
const { sendNotification, logActivity } = require('../services/notificationHelper.js');
const asyncHandler = require('../utils/asyncHandler.js');
const { ROLES } = require('../config/roles.js');

/**
 * @desc    Get disputes (Admin sees all; Users see disputes relevant to their accounts)
 * @route   GET /api/disputes
 * @access  Private
 */
const getDisputes = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }

  // Non-admins only see disputes they created or are involved in
  if (req.user.role !== ROLES.ADMIN) {
    let institutionId = null;
    if (req.user.role === ROLES.INSTITUTION) {
      const inst = await Institution.findOne({ userId: req.user._id });
      if (inst) institutionId = inst._id;
    }

    query.$or = [
      { raisedBy: req.user._id },
      { donorId: req.user._id },
    ];
    if (institutionId) {
      query.$or.push({ institutionId });
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    query.$and = [
      {
        $or: [
          { issueType: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { donorName: { $regex: q, $options: 'i' } },
          { institutionName: { $regex: q, $options: 'i' } },
        ],
      },
    ];
  }

  const disputes = await Dispute.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: disputes.map((d) => d.toJSON()),
    count: disputes.length,
  });
});

/**
 * @desc    Get dispute by ID
 * @route   GET /api/disputes/:id
 * @access  Private
 */
const getDisputeById = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);

  if (!dispute) {
    return res.status(404).json({
      success: false,
      error: 'Dispute record not found.',
    });
  }

  // Authorization check
  const isAdmin = req.user.role === ROLES.ADMIN;
  const isApplicant = dispute.raisedBy.toString() === req.user._id.toString();
  const isDonorParty = dispute.donorId && dispute.donorId.toString() === req.user._id.toString();

  let isInstParty = false;
  if (req.user.role === ROLES.INSTITUTION && dispute.institutionId) {
    const inst = await Institution.findOne({ userId: req.user._id });
    if (inst && inst._id.toString() === dispute.institutionId.toString()) {
      isInstParty = true;
    }
  }

  if (!isAdmin && !isApplicant && !isDonorParty && !isInstParty) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this dispute file.',
    });
  }

  res.status(200).json({
    success: true,
    data: dispute.toJSON(),
  });
});

/**
 * @desc    Submit a new delivery or condition dispute
 * @route   POST /api/disputes
 * @access  Private
 */
const createDispute = asyncHandler(async (req, res) => {
  const { donationId, issueType, description, donorName, institutionName } = req.body;

  let donorId = null;
  let institutionId = null;
  let finalDonorName = donorName || '';
  let finalInstitutionName = institutionName || '';

  if (donationId) {
    const donation = await Donation.findById(donationId);
    if (donation) {
      donorId = donation.donorId;
      finalDonorName = donation.donorName || finalDonorName;
      institutionId = donation.matchedInstitutionId;
      finalInstitutionName = donation.matchedInstitutionName || finalInstitutionName;
    }
  }

  const dispute = await Dispute.create({
    donationId: donationId || null,
    donorId,
    donorName: finalDonorName,
    institutionId,
    institutionName: finalInstitutionName,
    raisedBy: req.user._id,
    raisedByRole: req.user.role,
    issueType: (issueType || 'General Inconvenience').trim(),
    description: (description || '').trim(),
    status: 'Open',
    isSample: false,
  });

  await logActivity({
    req,
    action: 'DISPUTE_SUBMITTED',
    entityType: 'Dispute',
    entityId: dispute._id,
    details: { issueType: dispute.issueType },
  });

  res.status(201).json({
    success: true,
    data: dispute.toJSON(),
    message: 'Dispute submitted. Platform administrators will review the reconciliation details.',
  });
});

/**
 * @desc    Resolve or dismiss a dispute
 * @route   PUT /api/disputes/:id/resolve
 * @access  Private (Admin only)
 */
const resolveDispute = asyncHandler(async (req, res) => {
  const { status, resolutionNotes } = req.body;

  const validStatuses = ['Resolved', 'Dismissed', 'Under Review'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Permitted values: ${validStatuses.join(', ')}`,
    });
  }

  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) {
    return res.status(404).json({
      success: false,
      error: 'Dispute record not found.',
    });
  }

  dispute.status = status;
  if (status === 'Resolved' || status === 'Dismissed') {
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = req.user._id;
  }
  dispute.resolutionNotes =
    (resolutionNotes || '').trim() ||
    `Dispute status modified to ${status} by administrative coordination.`;

  await dispute.save();

  // Notify applicant of resolution
  await sendNotification({
    userId: dispute.raisedBy,
    title: `Dispute ${status}`,
    message: `Your reported issue regarding ${dispute.issueType} has been ${status.toLowerCase()}: "${dispute.resolutionNotes}"`,
    type: 'dispute',
  });

  await logActivity({
    req,
    action: 'DISPUTE_RESOLVED',
    entityType: 'Dispute',
    entityId: dispute._id,
    details: { status, resolutionNotes: dispute.resolutionNotes },
  });

  res.status(200).json({
    success: true,
    data: dispute.toJSON(),
    message: `Dispute marked as ${status}.`,
  });
});

module.exports = {
  getDisputes,
  getDisputeById,
  createDispute,
  resolveDispute,
};
