const mongoose = require('mongoose');

/**
 * CSAT Survey configuration model
 */
const csatSurveySchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    // The question to ask
    question: {
      type: String,
      required: true,
      default: 'How would you rate your experience? Reply with a number from 1 to 5.',
    },
    // Optional follow-up for feedback
    followUpQuestion: {
      type: String,
      default: 'Thank you! Would you like to share any additional feedback?',
    },
    // Rating scale
    scale: {
      type: Number,
      default: 5,
      min: 3,
      max: 10,
    },
    // When to trigger
    trigger: {
      type: String,
      enum: ['conversation_close', 'manual', 'after_resolution', 'scheduled'],
      default: 'conversation_close',
    },
    // Cooldown: don't send survey to same customer within X hours
    cooldownHours: {
      type: Number,
      default: 24,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Thank you message after rating
    thankYouMessage: {
      type: String,
      default: 'Thank you for your feedback! We appreciate your time.',
    },
    // Stats
    stats: {
      sent: { type: Number, default: 0 },
      responses: { type: Number, default: 0 },
      avgRating: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

csatSurveySchema.index({ tenant: 1, isActive: 1 });

module.exports = mongoose.model('CSATSurvey', csatSurveySchema);
