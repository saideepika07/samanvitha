// User Model - Central Authentication & Role Base
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ROLES, DONOR_ACCOUNT_TYPES, INSTITUTION_TYPES } = require('../config/roles.js');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email address.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address.'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password.'],
      minlength: [8, 'Password must be at least 8 characters long.'],
    },
    name: {
      type: String,
      required: [true, 'Please provide a name.'],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: [ROLES.DONOR, ROLES.INSTITUTION, ROLES.ADMIN],
        message: 'Invalid user role.',
      },
      required: [true, 'Please specify an account role.'],
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    accountType: {
      type: String,
      enum: {
        values: [...DONOR_ACCOUNT_TYPES, null],
        message: 'Invalid donor account type.',
      },
      default: null,
    },
    institutionType: {
      type: String,
      enum: {
        values: [...INSTITUTION_TYPES, null],
        message: 'Invalid institution type.',
      },
      default: null,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
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
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Virtual alias 'location' mapped to 'address' for backward compatibility with frontend mock
userSchema.virtual('location').get(function () {
  return this.address;
});

// Pre-save hook: Hash password with bcrypt before saving to database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: Verify entered password against hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Instance method: Generate signed JWT access token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
      name: this.name,
    },
    process.env.JWT_SECRET || 'samanvitha_default_jwt_secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
