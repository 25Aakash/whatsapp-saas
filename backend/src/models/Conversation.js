const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      index: true,
    },
    customerName: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    lastMessage: {
      body: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now },
      direction: { type: String, enum: ['inbound', 'outbound'], default: 'inbound' },
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    windowExpiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'expired'],
      default: 'open',
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one conversation per customer per tenant
conversationSchema.index({ tenant: 1, customerPhone: 1 }, { unique: true });

// For listing conversations sorted by last message time
conversationSchema.index({ tenant: 1, 'lastMessage.timestamp': -1 });

// For searching
conversationSchema.index({ tenant: 1, customerName: 'text', customerPhone: 'text' });

// Check if the 24-hour conversation window is open
conversationSchema.methods.isWindowOpen = function () {
  if (!this.windowExpiresAt) return false;
  return new Date() < this.windowExpiresAt;
};

module.exports = mongoose.model('Conversation', conversationSchema);
