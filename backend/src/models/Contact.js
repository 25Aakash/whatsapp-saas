const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      index: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    // Custom attributes (key-value pairs)
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tags: [{
      type: String,
      trim: true,
    }],
    // Segment / group for campaigns
    groups: [{
      type: String,
      trim: true,
    }],
    // Opt-in status for marketing
    optIn: {
      status: { type: Boolean, default: true },
      timestamp: { type: Date, default: Date.now },
      source: { type: String, default: 'manual' }, // manual, api, import
    },
    // Last interaction timestamp
    lastContactedAt: {
      type: Date,
      default: null,
    },
    // Linked conversation
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique contact per tenant
contactSchema.index({ tenant: 1, phone: 1 }, { unique: true });

// For searching
contactSchema.index({ tenant: 1, name: 'text', phone: 'text', email: 'text' });

// For campaign targeting
contactSchema.index({ tenant: 1, tags: 1 });
contactSchema.index({ tenant: 1, groups: 1 });

module.exports = mongoose.model('Contact', contactSchema);
