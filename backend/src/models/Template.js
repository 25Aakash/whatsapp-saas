const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    waTemplateId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    language: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'],
      required: true,
    },
    status: {
      type: String,
      enum: ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED'],
      default: 'PENDING',
    },
    components: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    // Cached preview text
    previewText: {
      type: String,
      default: '',
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique template per tenant (by WhatsApp template ID)
templateSchema.index({ tenant: 1, waTemplateId: 1 }, { unique: true });

// For listing templates
templateSchema.index({ tenant: 1, status: 1, name: 1 });

module.exports = mongoose.model('Template', templateSchema);
