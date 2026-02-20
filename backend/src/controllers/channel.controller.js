const channelService = require('../services/channel.service');
const { catchAsync } = require('../middlewares/error.middleware');

/**
 * List available channels
 */
const listChannels = catchAsync(async (req, res) => {
  const channels = channelService.listChannels();
  res.json({ success: true, data: channels });
});

/**
 * Send message via a specific channel
 */
const sendMessage = catchAsync(async (req, res) => {
  const { channel, to, type, body, subject, template, media, interactive, phoneNumberId } = req.body;

  const tenant = req.user.tenant;
  const tenantId = typeof tenant === 'object' ? tenant._id : tenant;

  // Build channel context from tenant config or request
  const ctx = {
    phoneNumberId: phoneNumberId || tenant?.phoneNumberId,
    twilioAccountSid: tenant?.channels?.sms?.accountSid,
    twilioAuthToken: tenant?.channels?.sms?.authToken,
    twilioPhoneNumber: tenant?.channels?.sms?.phoneNumber,
  };

  const result = await channelService.sendMessage(channel || 'whatsapp', tenantId, {
    to,
    type: type || 'text',
    body,
    subject,
    template,
    media,
    interactive,
  }, ctx);

  res.json({ success: true, data: result });
});

/**
 * Broadcast message across multiple channels
 */
const broadcastMessage = catchAsync(async (req, res) => {
  const { channels, to, type, body, subject, template, media, interactive, phoneNumberId } = req.body;

  const tenant = req.user.tenant;
  const tenantId = typeof tenant === 'object' ? tenant._id : tenant;

  const ctx = {
    phoneNumberId: phoneNumberId || tenant?.phoneNumberId,
    twilioAccountSid: tenant?.channels?.sms?.accountSid,
    twilioAuthToken: tenant?.channels?.sms?.authToken,
    twilioPhoneNumber: tenant?.channels?.sms?.phoneNumber,
  };

  const results = await channelService.broadcastMessage(
    channels || ['whatsapp'],
    tenantId,
    { to, type: type || 'text', body, subject, template, media, interactive },
    ctx
  );

  res.json({ success: true, data: results });
});

module.exports = { listChannels, sendMessage, broadcastMessage };
