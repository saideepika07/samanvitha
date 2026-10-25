// VerificationRecord Model - Governance Audit History
const mongoose = require('mongoose');

const verificationRecordSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      required: true,
    },
    previousStatus: {
      type: String,
      default: 'Pending',
    },
    newStatus: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewerEmail: {
      type: String,
      default: '',
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

const VerificationRecord = mongoose.model('VerificationRecord', verificationRecordSchema);

module.exports = VerificationRecord;
