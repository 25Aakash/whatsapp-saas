const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const whatsappService = require('../services/whatsapp.service');
const billingService = require('../services/billing.service');
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const { trackMessageUsage } = require('../middlewares/usage.middleware');
const logger = require('../utils/logger');

let campaignWorker = null;

/**
 * Pick A/B variant for a contact based on percentages
 */
const pickVariant = (variants, index, total) => {
  if (!variants || variants.length === 0) return null;

  // Distribute contacts proportionally across variants
  let cumulative = 0;
  const position = (index / total) * 100;

  for (const variant of variants) {
    cumulative += variant.percentage;
    if (position < cumulative) return variant;
  }

  return variants[variants.length - 1];
};

/**
 * Process a campaign — sends template messages to all contacts
 * Supports A/B testing with multiple template variants
 */
const processCampaign = async (job) => {
  const { campaignId, tenantId, phoneNumberId, templateName, templateLanguage, templateComponents, contacts, abTesting } = job.data;

  logger.info(`Processing campaign ${campaignId}: ${contacts.length} contacts${abTesting?.enabled ? ' (A/B test)' : ''}`);

  let sent = 0;
  let failed = 0;
  const variantStats = {}; // variantId -> { sent, failed }

  if (abTesting?.enabled && abTesting.variants?.length > 0) {
    abTesting.variants.forEach((v) => {
      variantStats[v.variantId] = { sent: 0, failed: 0 };
    });
  }

  // Pre-check: verify tenant has enough credits for the campaign
  const creditCheck = await billingService.checkCredits(tenantId);
  if (!creditCheck.allowed) {
    await Campaign.findByIdAndUpdate(campaignId, {
      $set: { status: 'failed', errorMessage: `Insufficient credits. Balance: ${creditCheck.balance}, need at least ${creditCheck.cost} per message.` },
    });
    logger.warn(`Campaign ${campaignId} failed: insufficient credits (${creditCheck.balance})`);
    return { sent: 0, failed: contacts.length, variantStats };
  }

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    // Determine which template to use (A/B testing or default)
    let tplName = templateName;
    let tplLang = templateLanguage;
    let tplComps = templateComponents;
    let variantId = null;

    if (abTesting?.enabled && abTesting.variants?.length > 0) {
      const variant = pickVariant(abTesting.variants, i, contacts.length);
      if (variant) {
        tplName = variant.templateName;
        tplLang = variant.templateLanguage || 'en';
        tplComps = variant.templateComponents || [];
        variantId = variant.variantId;
      }
    }

    try {
      await whatsappService.sendTemplateMessage(
        tenantId,
        phoneNumberId,
        contact.phone,
        tplName,
        tplLang,
        tplComps
      );

      // Deduct credit for this message
      const deductResult = await billingService.deductCredit(tenantId);
      if (!deductResult.success) {
        logger.warn(`Campaign ${campaignId}: credits exhausted at message ${i + 1}`);
        await Campaign.findByIdAndUpdate(campaignId, {
          $set: {
            status: 'failed',
            errorMessage: `Credits exhausted after sending ${sent} messages`,
            'stats.sent': sent,
            'stats.failed': contacts.length - sent,
            'stats.total': contacts.length,
          },
        });
        break;
      }

      sent++;
      if (variantId && variantStats[variantId]) variantStats[variantId].sent++;
      trackMessageUsage(tenantId, 'outbound', 'template');

      // Update last contacted on contact
      Contact.findOneAndUpdate(
        { tenant: tenantId, phone: contact.phone },
        { $set: { lastContactedAt: new Date() } }
      ).catch(() => {});

      // Update campaign stats periodically (every 10 messages)
      if (sent % 10 === 0) {
        const update = { $set: { 'stats.sent': sent, 'stats.failed': failed } };
        // Also update variant stats
        if (abTesting?.enabled) {
          for (const [vid, vs] of Object.entries(variantStats)) {
            update.$set[`abTesting.variants.$[v${vid}].stats.sent`] = vs.sent;
            update.$set[`abTesting.variants.$[v${vid}].stats.failed`] = vs.failed;
          }
        }
        await Campaign.findByIdAndUpdate(campaignId, {
          $set: { 'stats.sent': sent, 'stats.failed': failed },
        });
      }

      // Small delay to respect rate limits (30 msg/sec max on WhatsApp)
      await delay(100);
    } catch (error) {
      failed++;
      if (variantId && variantStats[variantId]) variantStats[variantId].failed++;
      logger.warn(`Campaign ${campaignId}: failed to send to ${contact.phone}: ${error.message}`);
    }
  }

  // Final campaign status update
  const finalUpdate = {
    status: failed === contacts.length ? 'failed' : 'completed',
    'stats.sent': sent,
    'stats.failed': failed,
    'stats.total': contacts.length,
    completedAt: new Date(),
    ...(failed === contacts.length && { errorMessage: 'All messages failed to send' }),
  };

  await Campaign.findByIdAndUpdate(campaignId, { $set: finalUpdate });

  // Update A/B variant stats
  if (abTesting?.enabled) {
    const campaign = await Campaign.findById(campaignId);
    if (campaign?.abTesting?.variants) {
      for (const variant of campaign.abTesting.variants) {
        const vs = variantStats[variant.variantId];
        if (vs) {
          variant.stats.sent = vs.sent;
          variant.stats.failed = vs.failed;
          variant.stats.total = vs.sent + vs.failed;
        }
      }
      await campaign.save();
    }
  }

  logger.info(`Campaign ${campaignId} completed: ${sent} sent, ${failed} failed`);
  return { sent, failed, variantStats };
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start the campaign worker
 */
const startCampaignWorker = () => {
  const connection = getRedisConnection();

  campaignWorker = new Worker('campaigns', processCampaign, {
    connection,
    concurrency: 2, // Process 2 campaigns at a time
    limiter: { max: 5, duration: 1000 },
  });

  campaignWorker.on('completed', (job) => {
    logger.info(`Campaign job completed: ${job.id}`);
  });

  campaignWorker.on('failed', (job, err) => {
    logger.error(`Campaign job failed: ${job?.id}`, err.message);
    // Mark campaign as failed
    if (job?.data?.campaignId) {
      Campaign.findByIdAndUpdate(job.data.campaignId, {
        $set: { status: 'failed', errorMessage: err.message },
      }).catch(() => {});
    }
  });

  logger.info('Campaign worker started');
  return campaignWorker;
};

module.exports = { startCampaignWorker };
