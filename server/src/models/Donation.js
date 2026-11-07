// Donation Model - Community Donation & Resource Lifecycle
const mongoose = require('mongoose');
const { DONATION_STATUS, RESERVATION_EXPIRY_HOURS } = require('../config/donationStatus.js');
const { CATEGORY_LABELS } = require('../config/categories.js');

const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donor ID is required.'],
      index: true,
    },
    donorName: {
      type: String,
      required: [true, 'Donor name is required.'],
      trim: true,
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
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [1, 'Quantity must be at least 1.'],
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
    condition: {
      type: String,
      default: 'New or gently used in clean, usable condition',
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Donor pickup/dropoff location is required.'],
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
    deadline: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(DONATION_STATUS),
      default: DONATION_STATUS.LISTED,
      index: true,
    },
    matchedNeedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Need',
      default: null,
      index: true,
    },
    matchedInstitutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    matchedInstitutionName: {
      type: String,
      default: null,
      trim: true,
    },
    reservedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
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
        ret.availableQuantity =
          ret.status === DONATION_STATUS.LISTED || ret.status === DONATION_STATUS.MATCHED
            ? Math.max(0, (ret.quantity || 0) - (ret.reservedQuantity || 0))
            : 0;
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

// Privacy safeguard: Donor exact GPS coordinates are NEVER stored; rounded to 2 decimals (~1 km)
donationSchema.pre('save', function (next) {
  if (this.latitude != null && !isNaN(this.latitude)) {
    this.latitude = Math.round(Number(this.latitude) * 100) / 100;
  }
  if (this.longitude != null && !isNaN(this.longitude)) {
    this.longitude = Math.round(Number(this.longitude) * 100) / 100;
  }
  next();
});

// Available quantity virtual for listed & unreserved amounts
donationSchema.virtual('availableQuantity').get(function () {
  if (this.status === DONATION_STATUS.LISTED || this.status === DONATION_STATUS.MATCHED) {
    return Math.max(0, (this.quantity || 0) - (this.reservedQuantity || 0));
  }
  return 0;
});

// Expiry timestamp virtual for active reservations (computed from reservedAt + RESERVATION_EXPIRY_HOURS)
donationSchema.virtual('expiresAt').get(function () {
  if (this.status === DONATION_STATUS.RESERVED && this.reservedAt) {
    const hours = RESERVATION_EXPIRY_HOURS || 72;
    return new Date(new Date(this.reservedAt).getTime() + hours * 60 * 60 * 1000);
  }
  return null;
});

const Donation = mongoose.model('Donation', donationSchema);

module.exports = Donation;
