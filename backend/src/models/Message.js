const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    waMessageId: {
      type: String,
      index: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'template', 'image', 'video', 'audio', 'document', 'location', 'contacts', 'interactive', 'reaction', 'sticker', 'unknown'],
      default: 'text',
    },
    body: {
      type: String,
      default: '',
    },
    // For template messages
    templateName: {
      type: String,
      default: null,
    },
    templateLanguage: {
      type: String,
      default: null,
    },
    templateComponents: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // For media messages
    media: {
      id: String,
      mimeType: String,
      url: String,
      caption: String,
      filename: String,
    },
    // Message status tracking
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
    },
    statusTimestamps: {
      sent: { type: Date, default: null },
      delivered: { type: Date, default: null },
      read: { type: Date, default: null },
      failed: { type: Date, default: null },
    },
    errorInfo: {
      code: { type: Number, default: null },
      title: { type: String, default: null },
      details: { type: String, default: null },
    },
    // Context (replied-to message)
    context: {
      messageId: { type: String, default: null },
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Who sent the outbound message (agent)
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Dedup: unique WhatsApp message ID per tenant
messageSchema.index({ tenant: 1, waMessageId: 1 }, { unique: true, sparse: true });

// For loading conversation messages (paginated, sorted by time)
messageSchema.index({ conversation: 1, timestamp: 1 });

// For status update lookups
messageSchema.index({ waMessageId: 1 });

module.exports = mongoose.model('Message', messageSchema);
