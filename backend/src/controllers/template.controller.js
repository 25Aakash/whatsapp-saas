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

/**
 * POST /api/v1/templates
 * Create a new message template on Meta
 */
const createTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return apiResponse(res, 400, 'Tenant context required');

    const tenant = await Tenant.findById(tenantId);
    if (!tenant?.businessAccountId) {
      throw new ApiError(400, 'WhatsApp Business Account not configured');
    }

    const { name, language, category, components } = req.body;

    const templateData = {
      name,
      language,
      category,
      components: components || [],
    };

    const metaResult = await whatsappService.createTemplate(tenantId, tenant.businessAccountId, templateData);

    // Save locally
    const template = await Template.create({
      tenant: tenantId,
      waTemplateId: metaResult.id,
      name,
      language,
      category,
      status: metaResult.status || 'PENDING',
      components: components || [],
      previewText: components?.find((c) => c.type === 'BODY')?.text || '',
      lastSyncedAt: new Date(),
    });

    return apiResponse(res, 201, 'Template created and submitted to Meta', { template });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/templates/:id
 * Update a template on Meta
 */
const updateTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const template = await Template.findOne({ _id: req.params.id, tenant: tenantId });
    if (!template) throw new ApiError(404, 'Template not found');

    const { components } = req.body;

    await whatsappService.updateTemplate(tenantId, template.waTemplateId, {
      components: components || [],
    });

    // Update locally
    template.components = components || template.components;
    template.previewText = components?.find((c) => c.type === 'BODY')?.text || template.previewText;
    template.lastSyncedAt = new Date();
    await template.save();

    return apiResponse(res, 200, 'Template updated', { template });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/templates/:id
 * Delete a template from Meta and locally
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const template = await Template.findOne({ _id: req.params.id, tenant: tenantId });
    if (!template) throw new ApiError(404, 'Template not found');

    const tenant = await Tenant.findById(tenantId);
    if (!tenant?.businessAccountId) {
      throw new ApiError(400, 'WhatsApp Business Account not configured');
    }

    await whatsappService.deleteTemplate(tenantId, tenant.businessAccountId, template.name);
    await Template.findByIdAndDelete(template._id);

    return apiResponse(res, 200, 'Template deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { listTemplates, syncTemplates, createTemplate, updateTemplate, deleteTemplate };
