const mongoose = require('mongoose');

/**
 * CSAT Survey Response model
 * Tracks customer satisfaction ratings collected via WhatsApp
 */
const csatResponseSchema = new mongoose.Schema(
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
    customerPhone: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      default: 'Unknown',
    },
    // The agent who handled the conversation
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Survey configuration
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CSATSurvey',
      default: null,
    },
    // Rating (1-5 or custom scale)
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    maxRating: {
      type: Number,
      default: 5,
    },
    // Optional text feedback
    feedback: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    // Normalized score (0-100)
    score: {
      type: Number,
      default: 0,
    },
    // Categorized: detractor (1-2), passive (3), promoter (4-5)
    category: {
      type: String,
      enum: ['detractor', 'passive', 'promoter'],
      default: 'passive',
    },
  },
  {
    timestamps: true,
  }
);

csatResponseSchema.index({ tenant: 1, createdAt: -1 });
csatResponseSchema.index({ tenant: 1, agent: 1 });
csatResponseSchema.index({ tenant: 1, category: 1 });

// Calculate score and category before saving
csatResponseSchema.pre('save', function (next) {
  this.score = Math.round((this.rating / this.maxRating) * 100);

  const normalized = this.rating / this.maxRating;
  if (normalized <= 0.4) {
    this.category = 'detractor';
  } else if (normalized <= 0.6) {
    this.category = 'passive';
  } else {
    this.category = 'promoter';
  }

  next();
});

module.exports = mongoose.model('CSATResponse', csatResponseSchema);
