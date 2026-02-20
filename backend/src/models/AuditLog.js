const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
    userEmail: String,
    action: {
      type: String,
      required: true,
      enum: [
        'user.login',
        'user.logout',
        'user.register',
        'user.2fa_enabled',
        'user.2fa_disabled',
        'user.password_changed',
        'team.member_added',
        'team.member_removed',
        'tenant.updated',
        'tenant.plan_upgraded',
        'tenant.whatsapp_connected',
        'apikey.created',
        'apikey.revoked',
        'message.sent',
        'message.template_sent',
        'message.media_sent',
        'campaign.created',
        'campaign.launched',
        'campaign.cancelled',
        'contact.created',
        'contact.deleted',
        'contact.bulk_imported',
        'template.created',
        'template.deleted',
        'auto_reply.created',
        'auto_reply.deleted',
        'canned_response.created',
        'canned_response.deleted',
        'webhook.configured',
        'billing.checkout_created',
        'billing.subscription_updated',
        'settings.updated',
        'export.csv',
      ],
      index: true,
    },
    resource: {
      type: { type: String }, // e.g. 'message', 'campaign', 'contact'
      id: String,
      name: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// TTL: auto-delete after 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
auditLogSchema.index({ tenant: 1, createdAt: -1 });
auditLogSchema.index({ tenant: 1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
