// Institution Controller - Profile & Verification Document Management
const Institution = require('../models/Institution.js');
const User = require('../models/User.js');
const asyncHandler = require('../utils/asyncHandler.js');
const { ROLES } = require('../config/roles.js');
const fs = require('fs');
const path = require('path');
const { storageAdapter } = require('../services/storage/storageAdapter.js');

/**
 * @desc    Get current institution's profile
 * @route   GET /api/institutions/me
 * @access  Private (Institution role only)
 */
const getMyInstitution = asyncHandler(async (req, res) => {
  let institution = await Institution.findOne({ userId: req.user._id });

  if (!institution) {
    // If not existing yet, create a default profile for the user
    institution = await Institution.create({
      userId: req.user._id,
      name: req.user.name,
      institutionType: req.user.institutionType || 'orphanage',
      contactPerson: req.user.name,
      phone: req.user.phone || '',
      email: req.user.email,
      address: req.user.address || '',
      capacity: 30,
      verificationStatus: 'Pending',
    });
  }

  res.status(200).json({
    success: true,
    data: institution.toJSON(),
  });
});

/**
 * @desc    Update current institution's profile
 * @route   PUT /api/institutions/me
 * @access  Private (Institution role only)
 */
const updateMyInstitution = asyncHandler(async (req, res) => {
  let institution = await Institution.findOne({ userId: req.user._id });

  if (!institution) {
    institution = new Institution({ userId: req.user._id });
  }

  const {
    name,
    contactPerson,
    phone,
    email,
    address,
    district,
    latitude,
    longitude,
    capacity,
    occupancy,
    institutionType,
  } = req.body;

  if (latitude !== undefined) {
    if (latitude === null || latitude === '') {
      institution.latitude = null;
    } else {
      const num = Number(latitude);
      if (isNaN(num) || num < -90 || num > 90) {
        return res.status(400).json({
          success: false,
          error: 'Latitude must be a valid number between -90 and 90.',
        });
      }
      institution.latitude = num;
    }
  }

  if (longitude !== undefined) {
    if (longitude === null || longitude === '') {
      institution.longitude = null;
    } else {
      const num = Number(longitude);
      if (isNaN(num) || num < -180 || num > 180) {
        return res.status(400).json({
          success: false,
          error: 'Longitude must be a valid number between -180 and 180.',
        });
      }
      institution.longitude = num;
    }
  }

  if (name !== undefined) institution.name = name.trim();
  if (contactPerson !== undefined) institution.contactPerson = contactPerson.trim();
  if (phone !== undefined) institution.phone = phone.trim();
  if (email !== undefined) institution.email = email.trim().toLowerCase();
  if (address !== undefined) institution.address = address.trim();
  if (district !== undefined) institution.district = district.trim();
  if (capacity !== undefined) institution.capacity = Number(capacity);
  if (occupancy !== undefined) institution.occupancy = Number(occupancy);
  if (institutionType !== undefined) institution.institutionType = institutionType;

  // Security: Institutions cannot self-approve their verification status!
  // verificationStatus can only be modified through administrative review.

  await institution.save();

  // Keep User model in sync
  const user = await User.findById(req.user._id);
  if (user) {
    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address.trim();
    if (institutionType !== undefined) user.institutionType = institutionType;
    await user.save();
  }

  res.status(200).json({
    success: true,
    data: institution.toJSON(),
    message: 'Institution profile updated successfully.',
  });
});

/**
 * @desc    Upload verification document (PDF, PNG, JPG)
 * @route   POST /api/institutions/me/documents
 * @access  Private (Institution role only)
 */
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please select a document or image file to upload.',
    });
  }

  let institution = await Institution.findOne({ userId: req.user._id });
  if (!institution) {
    return res.status(404).json({
      success: false,
      error: 'Institution record not found.',
    });
  }

  // Save through storage adapter (supports local disk and Cloudinary authenticated upload)
  const savedDoc = await storageAdapter.saveVerificationDocument(req.file);

  institution.documents.push(savedDoc);
  await institution.save();

  res.status(201).json({
    success: true,
    data: institution.documents,
    message: 'Verification document uploaded successfully.',
  });
});

/**
 * @desc    Download/view private verification document
 * @route   GET /api/institutions/:id/documents/:docId
 * @access  Private (Owning Institution or Admin only)
 */
const getDocument = asyncHandler(async (req, res) => {
  const { id, docId } = req.params;

  const institution = await Institution.findById(id);
  if (!institution) {
    return res.status(404).json({
      success: false,
      error: 'Institution not found.',
    });
  }

  // Strict Authorization: Owning Institution or Admin only
  const isOwner =
    req.user.role === ROLES.INSTITUTION &&
    institution.userId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. You do not have permission to view this document.',
    });
  }

  const doc =
    institution.documents.id(docId) ||
    institution.documents.find(
      (d) => d._id.toString() === docId || d.filename === docId
    );

  if (!doc) {
    return res.status(404).json({
      success: false,
      error: 'Document record not found.',
    });
  }

  const access = await storageAdapter.getPrivateDocumentAccess(doc);

  if (access.type === 'signed_url') {
    // If caller requests JSON or stream
    if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
      return res.status(200).json({
        success: true,
        url: access.url,
        expiresAt: access.expiresAt,
        mimeType: access.mimeType,
        originalName: access.originalName,
      });
    }

    // Direct browser redirect to authenticated short-lived signed URL
    return res.redirect(access.url);
  }

  // Local file storage
  if (!fs.existsSync(access.path)) {
    return res.status(404).json({
      success: false,
      error: 'File does not exist on server storage.',
    });
  }

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(doc.originalName)}"`
  );
  return res.sendFile(path.resolve(access.path));
});

module.exports = {
  getMyInstitution,
  updateMyInstitution,
  uploadDocument,
  getDocument,
};
