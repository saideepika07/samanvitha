// Institution Model - Profile & Verification State
const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide the institution name.'],
      trim: true,
    },
    institutionType: {
      type: String,
      enum: ['orphanage', 'old_age_home'],
      required: [true, 'Please specify if this is an orphanage or old-age home.'],
    },
    contactPerson: {
      type: String,
      required: [true, 'Please provide the contact person name.'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide a contact phone number.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address.'],
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please provide the institutional physical address.'],
      trim: true,
    },
    district: {
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
    capacity: {
      type: Number,
      required: [true, 'Please provide resident capacity.'],
      min: [1, 'Capacity must be at least 1 resident.'],
      default: 30,
    },
    occupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Suspended'],
      default: 'Pending',
      index: true,
    },
    verificationNotice: {
      type: String,
      default: 'Prototype review pending administrative submission review.',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    documents: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        path: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        storageDriver: { type: String, enum: ['local', 'cloudinary'], default: 'local' },
        publicId: { type: String, default: null },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    reviewedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

const Institution = mongoose.model('Institution', institutionSchema);

module.exports = Institution;
