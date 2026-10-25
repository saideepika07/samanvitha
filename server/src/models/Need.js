// Need Model - Institutional Resource Deficit Tracking
// Remaining need formula: max(0, requiredQuantity - usableStock - reservedQuantity)

const mongoose = require('mongoose');
const { CATEGORY_LABELS } = require('../config/categories.js');

const needSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required.'],
      index: true,
    },
    institutionName: {
      type: String,
      required: [true, 'Institution name is required.'],
      trim: true,
    },
    institutionType: {
      type: String,
      enum: ['orphanage', 'old_age_home'],
      default: 'orphanage',
    },
    category: {
      type: String,
      required: [true, 'Category is required.'],
      enum: {
        values: CATEGORY_LABELS,
        message: 'Category must be one of the permitted non-perishable categories.',
      },
      index: true,
    },
    itemType: {
      type: String,
      required: [true, 'Item specifics or description is required.'],
      trim: true,
    },
    requiredQuantity: {
      type: Number,
      required: [true, 'Required quantity is required.'],
      min: [1, 'Required quantity must be at least 1.'],
    },
    usableStock: {
      type: Number,
      default: 0,
      min: [0, 'Usable stock cannot be negative.'],
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative.'],
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required.'],
      trim: true,
    },
    urgency: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
      index: true,
    },
    deadline: {
      type: String,
      default: null,
    },
    acceptableCondition: {
      type: String,
      default: 'New or gently used in clean, usable condition',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90.'],
      max: [90, 'Latitude must be between -90 and 90.'],
      default: null,
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180.'],
      max: [180, 'Longitude must be between -180 and 180.'],
      default: null,
    },
    status: {
      type: String,
      enum: ['Open', 'Fulfilled', 'Archived'],
      default: 'Open',
      index: true,
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
        ret.remainingNeed = Math.max(
          0,
          (ret.requiredQuantity || 0) - (ret.usableStock || 0) - (ret.reservedQuantity || 0)
        );
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

// Virtual calculation for real-time remaining deficit
needSchema.virtual('remainingNeed').get(function () {
  return Math.max(
    0,
    (this.requiredQuantity || 0) - (this.usableStock || 0) - (this.reservedQuantity || 0)
  );
});

// Pre-save hook: auto-sync status if fulfilled
needSchema.pre('save', function (next) {
  const remaining = Math.max(
    0,
    (this.requiredQuantity || 0) - (this.usableStock || 0) - (this.reservedQuantity || 0)
  );
  if (remaining === 0 && this.status === 'Open') {
    this.status = 'Fulfilled';
  } else if (remaining > 0 && this.status === 'Fulfilled') {
    this.status = 'Open';
  }
  next();
});

const Need = mongoose.model('Need', needSchema);

module.exports = Need;
