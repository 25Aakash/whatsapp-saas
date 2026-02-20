const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    // Billing period (YYYY-MM)
    period: {
      type: String,
      required: true,
      index: true,
    },
    // Message counts
    messages: {
      inbound: { type: Number, default: 0 },
      outbound: { type: Number, default: 0 },
      template: { type: Number, default: 0 },
      media: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    // API call counts
    apiCalls: {
      total: { type: Number, default: 0 },
      byEndpoint: {
        type: Map,
        of: Number,
        default: {},
      },
    },
    // Campaign stats
    campaigns: {
      sent: { type: Number, default: 0 },
      totalRecipients: { type: Number, default: 0 },
    },
    // Conversation stats for the period
    conversations: {
      opened: { type: Number, default: 0 },
      closed: { type: Number, default: 0 },
    },
    // Contact count snapshot
    contactCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique usage record per tenant per period
usageLogSchema.index({ tenant: 1, period: 1 }, { unique: true });

/**
 * Increment a counter atomically
 */
usageLogSchema.statics.increment = async function (tenantId, field, amount = 1) {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const update = { $inc: { [field]: amount } };

  return this.findOneAndUpdate(
    { tenant: tenantId, period },
    update,
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('UsageLog', usageLogSchema);
