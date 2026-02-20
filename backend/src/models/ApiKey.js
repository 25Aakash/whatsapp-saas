const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema(
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
      required: [true, 'API key name is required'],
      trim: true,
      maxlength: 100,
    },
    // Store only a hash; the raw key is shown once at creation
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },
    // First 8 chars for display (e.g. "wk_abcd...")
    keyPrefix: {
      type: String,
      required: true,
    },
    permissions: {
      type: [String],
      default: ['messages:send', 'messages:read', 'templates:read', 'contacts:read'],
      enum: [
        'messages:send',
        'messages:read',
        'templates:read',
        'templates:write',
        'contacts:read',
        'contacts:write',
        'campaigns:read',
        'campaigns:write',
        'analytics:read',
        'conversations:read',
        'conversations:write',
        'media:upload',
        'media:read',
      ],
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null, // null = never expires
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // IP whitelist (empty = allow all)
    allowedIps: {
      type: [String],
      default: [],
    },
    // Rate limit override per key
    rateLimit: {
      maxPerMinute: { type: Number, default: 60 },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Generate a new API key and return { rawKey, keyHash, keyPrefix }
 */
apiKeySchema.statics.generateKey = function () {
  const rawKey = `wk_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 11); // "wk_" + 8 chars
  return { rawKey, keyHash, keyPrefix };
};

/**
 * Find key by raw API key value
 */
apiKeySchema.statics.findByKey = async function (rawKey) {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return this.findOne({ keyHash, isActive: true }).populate('tenant');
};

apiKeySchema.index({ keyHash: 1 }, { unique: true });
apiKeySchema.index({ tenant: 1, isActive: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);
