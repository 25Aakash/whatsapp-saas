const axios = require('axios');
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

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  markAsRead,
  syncTemplates,
  getMediaUrl,
};
