// Admin Controller - Institutional Verification Review & Platform Governance
const Institution = require('../models/Institution.js');
const VerificationRecord = require('../models/VerificationRecord.js');
const User = require('../models/User.js');
const Need = require('../models/Need.js');
const Donation = require('../models/Donation.js');
const Dispute = require('../models/Dispute.js');
const ActivityLog = require('../models/ActivityLog.js');
const { ROLES } = require('../config/roles.js');
const { DONATION_STATUS } = require('../config/donationStatus.js');
const { CATEGORY_LABELS } = require('../config/categories.js');
const asyncHandler = require('../utils/asyncHandler.js');

/**
 * @desc    Get all institutions for administrative review
 * @route   GET /api/admin/institutions
 * @access  Private (Admin only)
 */
const getAllInstitutions = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  const filter = {};
  if (status && status !== 'all') {
    filter.verificationStatus = status;
  }
  if (search) {
    const q = search.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { contactPerson: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { address: { $regex: q, $options: 'i' } },
    ];
  }

  const institutions = await Institution.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: institutions.map((i) => i.toJSON()),
    count: institutions.length,
  });
});

/**
 * @desc    Get institution profile and verification audit trail by ID
 * @route   GET /api/admin/institutions/:id
 * @access  Private (Admin only)
 */
const getInstitutionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let institution = await Institution.findById(id);
  if (!institution) {
    // Also try lookup by userId for seamless frontend lookup
    institution = await Institution.findOne({ userId: id });
  }

  if (!institution) {
    return res.status(404).json({
      success: false,
      error: 'Institution record not found.',
    });
  }

  const auditLogs = await VerificationRecord.find({
    institutionId: institution._id,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      ...institution.toJSON(),
      auditLogs: auditLogs.map((log) => log.toJSON()),
    },
  });
});

/**
 * @desc    Update institution verification status (Approved, Rejected, Suspended, Pending)
 * @route   PUT /api/admin/institutions/:id/verification
 * @access  Private (Admin only)
 */
const updateInstitutionVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const validStatuses = ['Approved', 'Rejected', 'Suspended', 'Pending'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Permitted values: ${validStatuses.join(', ')}`,
    });
  }

  let institution = await Institution.findById(id);
  if (!institution) {
    institution = await Institution.findOne({ userId: id });
  }

  if (!institution) {
    return res.status(404).json({
      success: false,
      error: 'Institution record not found.',
    });
  }

  const previousStatus = institution.verificationStatus;
  institution.verificationStatus = status;
  institution.reviewedAt = new Date();
  institution.verifiedBy = req.user._id;

  if (status === 'Approved') {
    institution.rejectionReason = null;
    institution.verificationNotice =
      'Prototype review approved. Note: This indicates simulated compliance for testing, not formal legal authentication.';
  } else if (status === 'Rejected') {
    institution.rejectionReason = reason || 'Documentation incomplete or invalid.';
    institution.verificationNotice = `Prototype review rejected: ${institution.rejectionReason}`;
  } else {
    institution.rejectionReason = reason || null;
    institution.verificationNotice = `Prototype review status: ${status}`;
  }

  await institution.save();

  // Create audit log record
  const auditRecord = await VerificationRecord.create({
    institutionId: institution._id,
    action: status.toUpperCase(),
    previousStatus,
    newStatus: status,
    reason:
      reason ||
      (status === 'Approved'
        ? 'Prototype review approved by platform administrator.'
        : `Status modified to ${status}.`),
    reviewedBy: req.user._id,
    reviewerEmail: req.user.email,
  });

  res.status(200).json({
    success: true,
    data: institution.toJSON(),
    audit: auditRecord.toJSON(),
    message: `Institution verification status updated to ${status}.`,
  });
});

/**
 * @desc    Get audit trail for a specific institution
 * @route   GET /api/admin/institutions/:id/audit
 * @access  Private (Admin only)
 */
const getInstitutionAuditLogs = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let institution = await Institution.findById(id);
  if (!institution) {
    institution = await Institution.findOne({ userId: id });
  }

  if (!institution) {
    return res.status(404).json({
      success: false,
      error: 'Institution not found.',
    });
  }

  const auditLogs = await VerificationRecord.find({
    institutionId: institution._id,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: auditLogs.map((l) => l.toJSON()),
  });
});

/**
 * @desc    Get platform-wide activity logs
 * @route   GET /api/admin/activity-logs
 * @access  Private (Admin only)
 */
const getActivityLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
  res.status(200).json({
    success: true,
    data: logs.map((l) => l.toJSON()),
    count: logs.length,
  });
});

/**
 * @desc    Get platform KPI analytics, deficit metrics & category distributions
 * @route   GET /api/admin/analytics
 * @access  Private (Admin only)
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    donorsCount,
    institutionsUserCount,
    adminCount,
    totalInstitutions,
    approvedInstitutions,
    pendingInstitutions,
    rejectedInstitutions,
    needs,
    donations,
    openDisputes,
    resolvedDisputes,
    recentActivities,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: ROLES.DONOR }),
    User.countDocuments({ role: ROLES.INSTITUTION }),
    User.countDocuments({ role: ROLES.ADMIN }),
    Institution.countDocuments(),
    Institution.countDocuments({ verificationStatus: 'Approved' }),
    Institution.countDocuments({ verificationStatus: 'Pending' }),
    Institution.countDocuments({ verificationStatus: 'Rejected' }),
    Need.find(),
    Donation.find(),
    Dispute.countDocuments({ status: { $in: ['Open', 'Under Review'] } }),
    Dispute.countDocuments({ status: 'Resolved' }),
    ActivityLog.find().sort({ createdAt: -1 }).limit(10),
  ]);

  // Aggregate Deficit Metrics
  let totalRequired = 0;
  let totalUsableStock = 0;
  let totalReservedQuantity = 0;
  let totalRemainingDeficit = 0;

  const categoryBreakdown = {};
  CATEGORY_LABELS.forEach((cat) => {
    categoryBreakdown[cat] = {
      category: cat,
      required: 0,
      stock: 0,
      reserved: 0,
      remaining: 0,
      donationsCount: 0,
    };
  });

  needs.forEach((n) => {
    const rem = n.remainingNeed;
    totalRequired += n.requiredQuantity || 0;
    totalUsableStock += n.usableStock || 0;
    totalReservedQuantity += n.reservedQuantity || 0;
    totalRemainingDeficit += rem;

    if (categoryBreakdown[n.category]) {
      categoryBreakdown[n.category].required += n.requiredQuantity || 0;
      categoryBreakdown[n.category].stock += n.usableStock || 0;
      categoryBreakdown[n.category].reserved += n.reservedQuantity || 0;
      categoryBreakdown[n.category].remaining += rem;
    }
  });

  // Donation Status Distribution
  const donationStatusCounts = {};
  Object.values(DONATION_STATUS).forEach((st) => {
    donationStatusCounts[st] = 0;
  });

  donations.forEach((d) => {
    if (donationStatusCounts[d.status] !== undefined) {
      donationStatusCounts[d.status] += 1;
    }
    if (categoryBreakdown[d.category]) {
      categoryBreakdown[d.category].donationsCount += 1;
    }
  });

  // 1. Single platform definition for Completed Deliveries:
  // Counted as completed when the recipient institution has acknowledged receipt (Received or Completed)
  const completedDeliveriesCount =
    (donationStatusCounts[DONATION_STATUS.RECEIVED] || 0) +
    (donationStatusCounts[DONATION_STATUS.COMPLETED] || 0);

  // 2. Single platform definition for Pledged Donations:
  // Count only active and fulfilled pledges that are not Cancelled
  const pledgedDonationsCount = donations.filter(
    (d) => d.status !== DONATION_STATUS.CANCELLED
  ).length;

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        donors: donorsCount,
        institutions: institutionsUserCount,
        admins: adminCount,
      },
      institutions: {
        total: totalInstitutions,
        approved: approvedInstitutions,
        pending: pendingInstitutions,
        rejected: rejectedInstitutions,
      },
      needs: {
        totalNeeds: needs.length,
        totalRequired,
        totalUsableStock,
        totalReservedQuantity,
        totalRemainingDeficit,
      },
      donations: {
        total: pledgedDonationsCount, // Excludes Cancelled pledges
        allTotal: donations.length,
        completed: completedDeliveriesCount, // Received or Completed
        byStatus: donationStatusCounts,
      },
      disputes: {
        open: openDisputes,
        resolved: resolvedDisputes,
        total: openDisputes + resolvedDisputes,
      },
      categoryData: Object.values(categoryBreakdown),
      recentActivities: recentActivities.map((a) => a.toJSON()),
    },
  });
});

/**
 * @desc    Get all registered users for administration
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, status, search } = req.query;

  const query = {};
  if (role && role !== 'all') query.role = role;
  if (status && status !== 'all') query.status = status;

  if (search && search.trim()) {
    const q = search.trim();
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { address: { $regex: q, $options: 'i' } },
    ];
  }

  const users = await User.find(query).select('-password').sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: users.map((u) => u.toJSON()),
    count: users.length,
  });
});

/**
 * @desc    Update user account status (active / suspended)
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin only)
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status. Status must be "active" or "suspended".',
    });
  }

  // Security Rule: Administrators cannot suspend their own accounts
  if (id === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      error: 'Administrators cannot modify or suspend their own accounts.',
    });
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: 'User account not found.',
    });
  }

  targetUser.status = status;
  await targetUser.save();

  res.status(200).json({
    success: true,
    data: targetUser.toJSON(),
    message: `User account status updated to "${status}".`,
  });
});

module.exports = {
  getAllInstitutions,
  getInstitutionById,
  updateInstitutionVerification,
  getInstitutionAuditLogs,
  getActivityLogs,
  getAnalytics,
  getUsers,
  updateUserStatus,
};

