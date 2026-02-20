const mongoose = require('mongoose');

const cannedResponseSchema = new mongoose.Schema(
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
    // Short code to trigger (e.g. /greeting)
    shortcode: {
      type: String,
      required: [true, 'Shortcode is required'],
      trim: true,
      maxlength: 50,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 100,
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      maxlength: 4096,
    },
    // Category for organization
    category: {
      type: String,
      default: 'general',
      trim: true,
    },
    // Support variables like {{name}}, {{company}}
    variables: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique shortcode per tenant
cannedResponseSchema.index({ tenant: 1, shortcode: 1 }, { unique: true });
cannedResponseSchema.index({ tenant: 1, category: 1 });

module.exports = mongoose.model('CannedResponse', cannedResponseSchema);
