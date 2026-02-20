const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema(
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
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['text', 'template', 'image', 'video', 'audio', 'document'],
      default: 'text',
    },
    body: String,
    templateName: String,
    templateLanguage: String,
    templateComponents: [mongoose.Schema.Types.Mixed],
    media: {
      id: String,
      url: String,
      caption: String,
      filename: String,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    sentAt: Date,
    errorInfo: {
      code: Number,
      message: String,
    },
    resultMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

scheduledMessageSchema.index({ status: 1, scheduledAt: 1 });
scheduledMessageSchema.index({ tenant: 1, status: 1 });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
