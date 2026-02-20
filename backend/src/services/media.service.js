const whatsappService = require('./whatsapp.service');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/error.middleware');

/**
 * Upload media file to WhatsApp and return media ID
 */
const uploadMedia = async (tenantId, phoneNumberId, file) => {
  if (!file || !file.buffer) {
    throw new ApiError(400, 'No file provided');
  }

  const result = await whatsappService.uploadMedia(
    tenantId,
    phoneNumberId,
    file.buffer,
    file.mimetype,
    file.originalname
  );

  return {
    mediaId: result.id,
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
};

/**
 * Get a media URL (temporary, signed by Meta)
 */
const getMediaUrl = async (tenantId, mediaId) => {
  const url = await whatsappService.getMediaUrl(tenantId, mediaId);
  if (!url) throw new ApiError(404, 'Media not found');
  return url;
};

/**
 * Download media from WhatsApp (proxy to avoid exposing tokens in frontend)
 */
const downloadMedia = async (tenantId, mediaId) => {
  // First get the URL
  const url = await getMediaUrl(tenantId, mediaId);

  // Then download the binary
  return whatsappService.downloadMedia(tenantId, url);
};

module.exports = { uploadMedia, getMediaUrl, downloadMedia };
