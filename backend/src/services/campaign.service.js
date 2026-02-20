const Campaign = require('../models/Campaign');
const Tenant = require('../models/Tenant');
const { getQueues } = require('../queues');
const contactService = require('./contact.service');
const { ApiError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

/**
 * Create a new campaign
 */
const createCampaign = async (tenantId, userId, data) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant || !tenant.phoneNumberId) {
    throw new ApiError(400, 'WhatsApp Business Account not configured');
  }

  const campaign = await Campaign.create({
    tenant: tenantId,
    createdBy: userId,
    name: data.name,
    templateName: data.templateName,
    templateLanguage: data.templateLanguage,
    templateComponents: data.templateComponents || [],
    audience: data.audience || { type: 'all' },
    scheduledAt: data.scheduledAt || null,
    phoneNumberId: data.phoneNumberId || tenant.phoneNumberId,
    status: data.scheduledAt ? 'scheduled' : 'draft',
  });

  logger.info(`Campaign created: ${campaign._id} for tenant ${tenantId}`);
  return campaign;
};

/**
 * List campaigns for a tenant
 */
const listCampaigns = async (tenantId, { skip = 0, limit = 20, status } = {}) => {
  const filter = { tenant: tenantId };
  if (status) filter.status = status;

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Campaign.countDocuments(filter),
  ]);

  return { campaigns, total };
};

/**
 * Get campaign by ID
 */
const getCampaignById = async (tenantId, campaignId) => {
  const campaign = await Campaign.findOne({ _id: campaignId, tenant: tenantId });
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  return campaign;
};

/**
 * Start/launch a campaign — resolves audience and enqueues messages
 */
const launchCampaign = async (tenantId, campaignId) => {
  const campaign = await getCampaignById(tenantId, campaignId);

  if (!['draft', 'scheduled'].includes(campaign.status)) {
    throw new ApiError(400, `Campaign cannot be launched in '${campaign.status}' status`);
  }

  // Resolve audience
  const contacts = await contactService.getContactsByAudience(tenantId, campaign.audience);
  if (contacts.length === 0) {
    throw new ApiError(400, 'No contacts match the audience criteria');
  }

  // Update campaign status
  campaign.status = 'processing';
  campaign.startedAt = new Date();
  campaign.stats.total = contacts.length;
  await campaign.save();

  // Enqueue campaign job
  const { campaignQueue } = getQueues();
  await campaignQueue.add('process-campaign', {
    campaignId: campaign._id.toString(),
    tenantId: tenantId.toString(),
    phoneNumberId: campaign.phoneNumberId,
    templateName: campaign.templateName,
    templateLanguage: campaign.templateLanguage,
    templateComponents: campaign.templateComponents,
    contacts: contacts.map((c) => ({ phone: c.phone, name: c.name })),
  }, {
    attempts: 1, // Don't retry the whole campaign
  });

  logger.info(`Campaign launched: ${campaign._id}, ${contacts.length} recipients`);
  return campaign;
};

/**
 * Cancel a running or scheduled campaign
 */
const cancelCampaign = async (tenantId, campaignId) => {
  const campaign = await getCampaignById(tenantId, campaignId);

  if (!['draft', 'scheduled', 'processing'].includes(campaign.status)) {
    throw new ApiError(400, 'Campaign cannot be cancelled');
  }

  campaign.status = 'cancelled';
  await campaign.save();

  logger.info(`Campaign cancelled: ${campaign._id}`);
  return campaign;
};

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaignById,
  launchCampaign,
  cancelCampaign,
};
