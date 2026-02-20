const mediaService = require('../services/media.service');
const { apiResponse } = require('../utils/helpers');
const Tenant = require('../models/Tenant');

/**
 * POST /api/v1/media/upload
 */
const uploadMedia = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (!tenant?.phoneNumberId) {
      return apiResponse(res, 400, 'WhatsApp Business Account not configured');
    }

    const result = await mediaService.uploadMedia(req.tenantId, tenant.phoneNumberId, req.file);
    return apiResponse(res, 201, 'Media uploaded', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/media/:mediaId
 * Proxy media download from WhatsApp (avoids exposing tokens)
 */
const downloadMedia = async (req, res, next) => {
  try {
    const { data, contentType } = await mediaService.downloadMedia(req.tenantId, req.params.mediaId);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, max-age=3600');
    return res.send(Buffer.from(data));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/media/:mediaId/url
 * Get temporary URL (signed by Meta, expires)
 */
const getMediaUrl = async (req, res, next) => {
  try {
    const url = await mediaService.getMediaUrl(req.tenantId, req.params.mediaId);
    return apiResponse(res, 200, 'Media URL fetched', { url });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadMedia, downloadMedia, getMediaUrl };
