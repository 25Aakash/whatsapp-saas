const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
      maxlength: 100,
    },
    phoneNumberId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    businessAccountId: {
      type: String,
      index: true,
    },
    accessToken: {
      type: String, // AES-256 encrypted
    },
    webhookSecret: {
      type: String, // AES-256 encrypted (per-tenant app secret)
    },
    displayPhoneNumber: {
      type: String, // Human-readable phone e.g. +1 555-123-4567
    },
    qualityRating: {
      type: String,
      enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    plan: {
      type: String,
      default: 'default',
    },
    // Enforced plan limits
    planLimits: {
      messagesPerMonth: { type: Number, default: 1000 },
      teamMembers: { type: Number, default: 3 },
      phoneNumbers: { type: Number, default: 1 },
      campaigns: { type: Number, default: 5 },
      contacts: { type: Number, default: 500 },
      apiKeys: { type: Number, default: 2 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    onboardingStatus: {
      type: String,
      enum: ['pending', 'connected', 'disconnected', 'error'],
      default: 'pending',
    },
    // Multi-number support: additional phone numbers beyond the primary
    phoneNumbers: [
      {
        phoneNumberId: { type: String, required: true },
        displayPhoneNumber: String,
        verifiedName: String,
        qualityRating: {
          type: String,
          enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
          default: 'UNKNOWN',
        },
        isActive: { type: Boolean, default: true },
      },
    ],
    // Webhook forwarding to customer's own server
    webhookUrl: {
      type: String,
      default: null,
    },
    webhookEvents: {
      type: [String],
      default: ['message.received', 'message.status', 'conversation.created'],
      enum: [
        'message.received',
        'message.sent',
        'message.status',
        'conversation.created',
        'conversation.closed',
        'contact.created',
        'campaign.completed',
      ],
    },
    // Credit-based billing (admin assigns credits, messages deduct them)
    credits: {
      balance: { type: Number, default: 0 },        // Current credit balance
      totalAllocated: { type: Number, default: 0 },  // Total credits ever given by admin
      totalUsed: { type: Number, default: 0 },       // Total credits consumed
      lastTopUp: { type: Date, default: null },       // When admin last added credits
      costPerMessage: { type: Number, default: 1 },   // Credits deducted per outbound message
    },
    meta: {
      // Extra data from Embedded Signup
      wabaId: String,
      businessName: String,
      timezone: String,
      fbUserId: String, // Facebook user ID from Embedded Signup (needed for data deletion callback)
    },
    // SSO Configuration
    sso: {
      enabled: { type: Boolean, default: false },
      provider: { type: String, enum: ['saml', 'oidc', null], default: null },
      entryPoint: String,
      issuer: String,
      cert: String,
      discoveryUrl: String,
      clientId: String,
      clientSecret: String,
      callbackUrl: String,
      defaultRole: { type: String, enum: ['customer', 'customer_agent'], default: 'customer_agent' },
      autoProvision: { type: Boolean, default: true },
      domains: [String],
    },
    // Multi-channel configuration
    channels: {
      sms: {
        enabled: { type: Boolean, default: false },
        provider: { type: String, enum: ['twilio', null], default: null },
        accountSid: String,
        authToken: String,
        phoneNumber: String,
      },
      email: {
        enabled: { type: Boolean, default: false },
        fromAddress: String,
        fromName: String,
      },
      rcs: {
        enabled: { type: Boolean, default: false },
        agentId: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Never expose encrypted tokens in API responses
        delete ret.accessToken;
        delete ret.webhookSecret;
        return ret;
      },
    },
  }
);

// Index for quick lookup by phoneNumberId (webhook routing)
tenantSchema.index({ phoneNumberId: 1, isActive: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
