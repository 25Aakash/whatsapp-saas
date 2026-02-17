const whatsappService = require('../services/whatsapp.service');
const Template = require('../models/Template');
const Tenant = require('../models/Tenant');
const { apiResponse } = require('../utils/helpers');
const { ApiError } = require('../middlewares/error.middleware');

/**
 * GET /api/v1/templates
 * List templates for current tenant
 */
const listTemplates = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return apiResponse(res, 400, 'Tenant context required');
    }

    const filter = { tenant: tenantId };
    if (req.query.status) {
      filter.status = req.query.status.toUpperCase();
    }

    const templates = await Template.find(filter).sort({ name: 1 }).lean();
    return apiResponse(res, 200, 'Templates fetched', { templates });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/templates/sync
 * Sync templates from Meta for current tenant
 */
const syncTemplates = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return apiResponse(res, 400, 'Tenant context required');
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.businessAccountId) {
      throw new ApiError(400, 'Tenant WhatsApp Business Account not configured');
    }

    const metaTemplates = await whatsappService.syncTemplates(tenantId, tenant.businessAccountId);

    // Upsert templates in database
    const operations = metaTemplates.map((t) => ({
      updateOne: {
        filter: { tenant: tenantId, waTemplateId: t.id },
        update: {
          $set: {
            name: t.name,
            language: t.language,
            category: t.category,
            status: t.status,
            components: t.components || [],
            lastSyncedAt: new Date(),
            // Generate preview text from body component
            previewText: t.components
              ?.find((c) => c.type === 'BODY')
              ?.text || '',
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await Template.bulkWrite(operations);
    }

    const templates = await Template.find({ tenant: tenantId }).sort({ name: 1 });
    return apiResponse(res, 200, `Synced ${metaTemplates.length} templates`, { templates });
  } catch (error) {
    next(error);
  }
};

module.exports = { listTemplates, syncTemplates };
