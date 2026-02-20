const axios = require('axios');
const FormData = require('form-data');
const { getDecryptedToken } = require('./tenant.service');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/error.middleware');

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Get authenticated Axios instance for a tenant
 */
const getClient = async (tenantId, phoneNumberId) => {
  const token = await getDecryptedToken(tenantId);
  return {
    token,
    phoneNumberId,
    baseUrl: `${META_GRAPH_URL}/${phoneNumberId}`,
  };
};

/**
 * Send a text message via WhatsApp Cloud API
 */
const sendTextMessage = async (tenantId, phoneNumberId, to, text) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  try {
    const response = await axios.post(
      `${baseUrl}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Text message sent to ${to}, waMessageId: ${waMessageId}`);

    return {
      waMessageId,
      status: 'sent',
    };
  } catch (error) {
    const errorData = error.response?.data?.error;
    logger.error('WhatsApp send text error:', errorData || error.message);
    throw new ApiError(
      error.response?.status || 500,
      `Failed to send message: ${errorData?.message || error.message}`,
      errorData
    );
  }
};

/**
 * Send a template message via WhatsApp Cloud API
 */
const sendTemplateMessage = async (tenantId, phoneNumberId, to, templateName, language, components = []) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
      },
    };

    if (components.length > 0) {
      payload.template.components = components;
    }

    const response = await axios.post(`${baseUrl}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Template message '${templateName}' sent to ${to}, waMessageId: ${waMessageId}`);

    return {
      waMessageId,
      status: 'sent',
    };
  } catch (error) {
    const errorData = error.response?.data?.error;
    logger.error('WhatsApp send template error:', errorData || error.message);
    throw new ApiError(
      error.response?.status || 500,
      `Failed to send template: ${errorData?.message || error.message}`,
      errorData
    );
  }
};

/**
 * Mark a message as read
 */
const markAsRead = async (tenantId, phoneNumberId, waMessageId) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  try {
    await axios.post(
      `${baseUrl}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: waMessageId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    logger.warn(`Failed to mark message as read: ${error.message}`);
  }
};

/**
 * Sync message templates from Meta
 */
const syncTemplates = async (tenantId, wabaId) => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.get(`${META_GRAPH_URL}/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        fields: 'name,language,category,status,components,id',
        limit: 100,
      },
    });

    const templates = response.data.data || [];
    logger.info(`Synced ${templates.length} templates for tenant ${tenantId}`);
    return templates;
  } catch (error) {
    logger.error('Template sync error:', error.response?.data || error.message);
    throw new ApiError(500, 'Failed to sync templates from Meta');
  }
};

/**
 * Get media URL by media ID
 */
const getMediaUrl = async (tenantId, mediaId) => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.get(`${META_GRAPH_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.url;
  } catch (error) {
    logger.error('Get media URL error:', error.message);
    return null;
  }
};

// ============ Media Messages ============

/**
 * Generic media message sender
 */
const sendMediaMessage = async (tenantId, phoneNumberId, to, mediaType, mediaPayload, context = null) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: mediaType,
      [mediaType]: mediaPayload,
    };

    if (context?.messageId) {
      payload.context = { message_id: context.messageId };
    }

    const response = await axios.post(`${baseUrl}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`${mediaType} message sent to ${to}, waMessageId: ${waMessageId}`);
    return { waMessageId, status: 'sent' };
  } catch (error) {
    const errorData = error.response?.data?.error;
    logger.error(`WhatsApp send ${mediaType} error:`, errorData || error.message);
    throw new ApiError(
      error.response?.status || 500,
      `Failed to send ${mediaType}: ${errorData?.message || error.message}`,
      errorData
    );
  }
};

const sendImageMessage = (tenantId, phoneNumberId, to, { id, link, caption } = {}, context) =>
  sendMediaMessage(tenantId, phoneNumberId, to, 'image', { ...(id ? { id } : { link }), caption }, context);

const sendVideoMessage = (tenantId, phoneNumberId, to, { id, link, caption } = {}, context) =>
  sendMediaMessage(tenantId, phoneNumberId, to, 'video', { ...(id ? { id } : { link }), caption }, context);

const sendAudioMessage = (tenantId, phoneNumberId, to, { id, link } = {}, context) =>
  sendMediaMessage(tenantId, phoneNumberId, to, 'audio', id ? { id } : { link }, context);

const sendDocumentMessage = (tenantId, phoneNumberId, to, { id, link, caption, filename } = {}, context) =>
  sendMediaMessage(tenantId, phoneNumberId, to, 'document', { ...(id ? { id } : { link }), caption, filename }, context);

const sendStickerMessage = (tenantId, phoneNumberId, to, { id, link } = {}, context) =>
  sendMediaMessage(tenantId, phoneNumberId, to, 'sticker', id ? { id } : { link }, context);

// ============ Location & Contact Messages ============

const sendLocationMessage = async (tenantId, phoneNumberId, to, { latitude, longitude, name, address } = {}, context) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'location',
    location: { latitude, longitude, name, address },
  };
  if (context?.messageId) payload.context = { message_id: context.messageId };

  try {
    const response = await axios.post(`${baseUrl}/messages`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Location message sent to ${to}, waMessageId: ${waMessageId}`);
    return { waMessageId, status: 'sent' };
  } catch (error) {
    const errorData = error.response?.data?.error;
    throw new ApiError(error.response?.status || 500, `Failed to send location: ${errorData?.message || error.message}`, errorData);
  }
};

const sendContactMessage = async (tenantId, phoneNumberId, to, contacts, context) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'contacts',
    contacts,
  };
  if (context?.messageId) payload.context = { message_id: context.messageId };

  try {
    const response = await axios.post(`${baseUrl}/messages`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Contact message sent to ${to}, waMessageId: ${waMessageId}`);
    return { waMessageId, status: 'sent' };
  } catch (error) {
    const errorData = error.response?.data?.error;
    throw new ApiError(error.response?.status || 500, `Failed to send contact: ${errorData?.message || error.message}`, errorData);
  }
};

// ============ Interactive Messages ============

/**
 * Send an interactive message (buttons, list, etc.)
 * @param {Object} interactive - WhatsApp interactive object
 *   For buttons: { type: 'button', header, body, footer, action: { buttons: [...] } }
 *   For list: { type: 'list', header, body, footer, action: { button, sections: [...] } }
 */
const sendInteractiveMessage = async (tenantId, phoneNumberId, to, interactive, context) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive,
  };
  if (context?.messageId) payload.context = { message_id: context.messageId };

  try {
    const response = await axios.post(`${baseUrl}/messages`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Interactive message sent to ${to}, waMessageId: ${waMessageId}`);
    return { waMessageId, status: 'sent' };
  } catch (error) {
    const errorData = error.response?.data?.error;
    throw new ApiError(error.response?.status || 500, `Failed to send interactive: ${errorData?.message || error.message}`, errorData);
  }
};

// ============ Reaction Messages ============

const sendReactionMessage = async (tenantId, phoneNumberId, to, messageId, emoji) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'reaction',
    reaction: { message_id: messageId, emoji },
  };

  try {
    const response = await axios.post(`${baseUrl}/messages`, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const waMessageId = response.data.messages?.[0]?.id;
    logger.info(`Reaction sent to ${to}, waMessageId: ${waMessageId}`);
    return { waMessageId, status: 'sent' };
  } catch (error) {
    const errorData = error.response?.data?.error;
    throw new ApiError(error.response?.status || 500, `Failed to send reaction: ${errorData?.message || error.message}`, errorData);
  }
};

// ============ Media Upload ============

/**
 * Upload media to WhatsApp Cloud API
 * @param {Buffer} fileBuffer - File data
 * @param {string} mimeType - MIME type
 * @param {string} filename - File name
 * @returns {{ id: string }} - Uploaded media ID
 */
const uploadMedia = async (tenantId, phoneNumberId, fileBuffer, mimeType, filename) => {
  const { token, baseUrl } = await getClient(tenantId, phoneNumberId);

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', fileBuffer, { filename, contentType: mimeType });
  form.append('type', mimeType);

  try {
    const response = await axios.post(`${baseUrl}/media`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      maxContentLength: 100 * 1024 * 1024, // 100MB
    });

    logger.info(`Media uploaded: ${response.data.id}`);
    return { id: response.data.id };
  } catch (error) {
    const errorData = error.response?.data?.error;
    throw new ApiError(error.response?.status || 500, `Failed to upload media: ${errorData?.message || error.message}`, errorData);
  }
};

/**
 * Download media binary from WhatsApp (proxy for frontend)
 */
const downloadMedia = async (tenantId, mediaUrl) => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
    });
    return {
      data: response.data,
      contentType: response.headers['content-type'],
    };
  } catch (error) {
    logger.error('Media download error:', error.message);
    throw new ApiError(500, 'Failed to download media');
  }
};

// ============ Template CRUD on Meta ============

/**
 * Create a new message template on Meta
 */
const createTemplate = async (tenantId, wabaId, templateData) => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.post(
      `${META_GRAPH_URL}/${wabaId}/message_templates`,
      templateData,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    logger.info(`Template created on Meta: ${response.data.id}`);
    return response.data;
  } catch (error) {
    const errorData = error.response?.data?.error;
    throw new ApiError(error.response?.status || 500, `Failed to create template: ${errorData?.message || error.message}`, errorData);
  }
};

/**
 * Update an existing template on Meta
 */
const updateTemplate = async (tenantId, templateId, templateData) => {
  const token = await getDecryptedToken(tenantId);

  try {
    const response = await axios.post(
      `${META_GRAPH_URL}/${templateId}`,
      templateData,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    logger.info(`Template updated on Meta: ${templateId}`);
    return response.data;
  } catch (error) {
    const errorData = error.response?.data?.error;
    throw new ApiError(error.response?.status || 500, `Failed to update template: ${errorData?.message || error.message}`, errorData);
  }
};

/**
 * Delete a template from Meta
 */
const deleteTemplate = async (tenantId, wabaId, templateName) => {
  const token = await getDecryptedToken(tenantId);

  try {
    await axios.delete(`${META_GRAPH_URL}/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { name: templateName },
    });
    logger.info(`Template deleted on Meta: ${templateName}`);
    return true;
  } catch (error) {
    const errorData = error.response?.data?.error;
    throw new ApiError(error.response?.status || 500, `Failed to delete template: ${errorData?.message || error.message}`, errorData);
  }
};

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  markAsRead,
  syncTemplates,
  getMediaUrl,
  sendImageMessage,
  sendVideoMessage,
  sendAudioMessage,
  sendDocumentMessage,
  sendStickerMessage,
  sendLocationMessage,
  sendContactMessage,
  sendInteractiveMessage,
  sendReactionMessage,
  uploadMedia,
  downloadMedia,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendMediaMessage,
};
