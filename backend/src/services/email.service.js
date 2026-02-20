const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const env = require('../config/env');

let transporter = null;

/**
 * Get or create the nodemailer transporter
 */
const getTransporter = () => {
  if (transporter) return transporter;

  if (!env.smtpHost) {
    logger.debug('SMTP not configured — email sending disabled');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: parseInt(env.smtpPort, 10) || 587,
    secure: env.smtpPort === '465',
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
};

/**
 * Send an email (best-effort, never throws)
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailer = getTransporter();
    if (!mailer) {
      logger.debug(`Email not sent (SMTP not configured): ${subject}`);
      return null;
    }

    const from = env.smtpFrom || `"WA SaaS" <${env.smtpUser}>`;
    const info = await mailer.sendMail({ from, to, subject, html, text });
    logger.info(`Email sent: ${info.messageId} to ${to}`);
    return info;
  } catch (err) {
    logger.error(`Email send failed: ${err.message}`);
    return null;
  }
};

// ============ Email templates ============

const sendWelcomeEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to WA SaaS Platform',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#059669">Welcome, ${user.name}!</h2>
        <p>Your account has been created successfully. You can now log in and start using the platform.</p>
        <p>Here are your next steps:</p>
        <ol>
          <li>Connect your WhatsApp Business Account via Meta Embedded Signup</li>
          <li>Import your contacts or wait for inbound messages</li>
          <li>Set up auto-reply rules for automation</li>
          <li>Create message templates for outbound campaigns</li>
        </ol>
        <a href="${env.frontendUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Go to Dashboard</a>
        <p style="margin-top:24px;font-size:12px;color:#999">If you didn't create this account, please ignore this email.</p>
      </div>
    `,
  });
};

const sendTeamInviteEmail = async (newUser, inviterName, tempPassword) => {
  return sendEmail({
    to: newUser.email,
    subject: `You've been invited to WA SaaS Platform`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#059669">Team Invitation</h2>
        <p><strong>${inviterName}</strong> has invited you to join their team on WA SaaS.</p>
        <p>Your temporary credentials:</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0"><strong>Email:</strong> ${newUser.email}</p>
          <p style="margin:8px 0 0"><strong>Password:</strong> ${tempPassword}</p>
        </div>
        <p>Please change your password after your first login.</p>
        <a href="${env.frontendUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Login Now</a>
      </div>
    `,
  });
};

const sendPlanUpgradeEmail = async (user, plan) => {
  return sendEmail({
    to: user.email,
    subject: `Plan Upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#059669">Plan Upgraded!</h2>
        <p>Hi ${user.name}, your plan has been upgraded to <strong>${plan}</strong>.</p>
        <p>Your new limits are now in effect. Enjoy the additional features!</p>
        <a href="${env.frontendUrl}/dashboard/settings" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">View Plan Details</a>
      </div>
    `,
  });
};

const sendUsageLimitWarningEmail = async (user, limitType, percentUsed) => {
  return sendEmail({
    to: user.email,
    subject: `Usage Alert: ${limitType} at ${percentUsed}%`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#d97706">Usage Warning</h2>
        <p>Hi ${user.name}, your <strong>${limitType}</strong> usage has reached <strong>${percentUsed}%</strong> of your plan limit.</p>
        <p>Consider upgrading your plan to avoid service interruptions.</p>
        <a href="${env.frontendUrl}/dashboard/settings" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Manage Plan</a>
      </div>
    `,
  });
};

const sendCampaignCompleteEmail = async (user, campaign) => {
  return sendEmail({
    to: user.email,
    subject: `Campaign "${campaign.name}" Completed`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#059669">Campaign Complete</h2>
        <p>Your campaign <strong>${campaign.name}</strong> has finished processing.</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0">Total: ${campaign.stats?.total || 0}</p>
          <p style="margin:4px 0">Sent: ${campaign.stats?.sent || 0}</p>
          <p style="margin:4px 0">Delivered: ${campaign.stats?.delivered || 0}</p>
          <p style="margin:4px 0">Failed: ${campaign.stats?.failed || 0}</p>
        </div>
        <a href="${env.frontendUrl}/dashboard/campaigns" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">View Details</a>
      </div>
    `,
  });
};

const send2FAEnabledEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: 'Two-Factor Authentication Enabled',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#059669">2FA Enabled</h2>
        <p>Hi ${user.name}, two-factor authentication has been enabled on your account.</p>
        <p>You'll now need to enter a verification code from your authenticator app when logging in.</p>
        <p style="margin-top:16px;font-size:12px;color:#999">If you didn't do this, please contact support immediately.</p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendTeamInviteEmail,
  sendPlanUpgradeEmail,
  sendUsageLimitWarningEmail,
  sendCampaignCompleteEmail,
  send2FAEnabledEmail,
};
