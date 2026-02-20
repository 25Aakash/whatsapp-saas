const mongoose = require('mongoose');

const autoReplyRuleSchema = new mongoose.Schema(
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
      required: [true, 'Rule name is required'],
      trim: true,
      maxlength: 100,
    },
    // Trigger type
    trigger: {
      type: {
        type: String,
        enum: ['keyword', 'regex', 'first_message', 'out_of_hours', 'all'],
        required: true,
      },
      // For keyword/regex triggers
      value: { type: String, default: '' },
      // Case-insensitive keyword matching
      caseSensitive: { type: Boolean, default: false },
    },
    // Action to perform
    action: {
      type: {
        type: String,
        enum: ['text_reply', 'template_reply', 'assign_agent', 'add_tag'],
        required: true,
      },
      // For text_reply
      message: { type: String, default: '' },
      // For template_reply
      templateName: { type: String, default: '' },
      templateLanguage: { type: String, default: 'en' },
      // For assign_agent
      agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      // For add_tag
      tag: { type: String, default: '' },
    },
    // Business hours (for out_of_hours trigger)
    businessHours: {
      timezone: { type: String, default: 'UTC' },
      schedule: {
        type: Map,
        of: {
          start: String, // "09:00"
          end: String,   // "18:00"
          enabled: Boolean,
        },
        default: {
          monday: { start: '09:00', end: '18:00', enabled: true },
          tuesday: { start: '09:00', end: '18:00', enabled: true },
          wednesday: { start: '09:00', end: '18:00', enabled: true },
          thursday: { start: '09:00', end: '18:00', enabled: true },
          friday: { start: '09:00', end: '18:00', enabled: true },
          saturday: { start: '09:00', end: '18:00', enabled: false },
          sunday: { start: '09:00', end: '18:00', enabled: false },
        },
      },
    },
    // Priority (lower = higher priority)
    priority: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
    // Only reply once per conversation within this cooldown (minutes)
    cooldownMinutes: {
      type: Number,
      default: 60,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Stats
    stats: {
      triggered: { type: Number, default: 0 },
      lastTriggeredAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

autoReplyRuleSchema.index({ tenant: 1, isActive: 1, priority: 1 });

module.exports = mongoose.model('AutoReplyRule', autoReplyRuleSchema);
