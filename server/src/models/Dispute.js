// Dispute Model - Delivery & Condition Reconciliation
const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      default: null,
      index: true,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    donorName: {
      type: String,
      default: '',
      trim: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
    },
    institutionName: {
      type: String,
      default: '',
      trim: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID of dispute applicant is required.'],
      index: true,
    },
    raisedByRole: {
      type: String,
      enum: ['donor', 'institution', 'admin'],
      default: 'donor',
    },
    issueType: {
      type: String,
      required: [true, 'Issue type is required.'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Dispute explanation or description is required.'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Under Review', 'Resolved', 'Dismissed'],
      default: 'Open',
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: null,
      trim: true,
    },
    isSample: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

const Dispute = mongoose.model('Dispute', disputeSchema);

module.exports = Dispute;
