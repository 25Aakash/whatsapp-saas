const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
      maxlength: 100,
    },
    phoneNumberId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    businessAccountId: {
      type: String,
      index: true,
    },
    accessToken: {
      type: String, // AES-256 encrypted
    },
    webhookSecret: {
      type: String, // AES-256 encrypted (per-tenant app secret)
    },
    displayPhoneNumber: {
      type: String, // Human-readable phone e.g. +1 555-123-4567
    },
    qualityRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    onboardingStatus: {
      type: String,
      enum: ['pending', 'connected', 'disconnected', 'error'],
      default: 'pending',
    },
    meta: {
      // Extra data from Embedded Signup
      wabaId: String,
      businessName: String,
      timezone: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Never expose encrypted tokens in API responses
        delete ret.accessToken;
        delete ret.webhookSecret;
        return ret;
      },
    },
  }
);

// Index for quick lookup by phoneNumberId (webhook routing)
tenantSchema.index({ phoneNumberId: 1, isActive: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
