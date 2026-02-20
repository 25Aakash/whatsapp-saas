const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: 200,
    },
    // Template to send
    templateName: {
      type: String,
      required: true,
    },
    templateLanguage: {
      type: String,
      required: true,
    },
    templateComponents: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    // Audience targeting
    audience: {
      type: { type: String, enum: ['all', 'tags', 'groups', 'contacts'], default: 'all' },
      tags: [String],
      groups: [String],
      contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    },
    // Scheduling
    scheduledAt: {
      type: Date,
      default: null, // null = send immediately
    },
    // Processing status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'draft',
    },
    // Stats
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    // A/B Testing variants
    abTesting: {
      enabled: { type: Boolean, default: false },
      variants: [
        {
          variantId: { type: String, required: true },
          name: { type: String, required: true }, // e.g. "Variant A", "Variant B"
          templateName: { type: String, required: true },
          templateLanguage: { type: String, default: 'en' },
          templateComponents: { type: mongoose.Schema.Types.Mixed, default: [] },
          percentage: { type: Number, required: true, min: 1, max: 100 }, // % of audience
          stats: {
            total: { type: Number, default: 0 },
            sent: { type: Number, default: 0 },
            delivered: { type: Number, default: 0 },
            read: { type: Number, default: 0 },
            failed: { type: Number, default: 0 },
          },
        },
      ],
      winnerVariantId: { type: String, default: null },
      winnerMetric: {
        type: String,
        enum: ['delivered', 'read', 'clicked'],
        default: 'read',
      },
    },
    // Phone number to send from
    phoneNumberId: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

campaignSchema.index({ tenant: 1, status: 1 });
campaignSchema.index({ status: 1, scheduledAt: 1 }); // For scheduler to pick up due campaigns

module.exports = mongoose.model('Campaign', campaignSchema);
