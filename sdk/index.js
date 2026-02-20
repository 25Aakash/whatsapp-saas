const axios = require('axios');

/**
 * WhatsApp SaaS SDK
 * Official Node.js client for the WhatsApp SaaS Platform API
 *
 * Usage:
 *   const WhatsAppSaaS = require('whatsapp-saas-sdk');
 *   const client = new WhatsAppSaaS({
 *     apiKey: 'your-api-key',
 *     baseUrl: 'https://api.yourdomain.com/api/v1',
 *   });
 *
 *   // Send a message
 *   await client.messages.sendText({ conversationId: '...', body: 'Hello!' });
 */

class WhatsAppSaaS {
  constructor({ apiKey, baseUrl = 'http://localhost:5000/api/v1', timeout = 30000 } = {}) {
    if (!apiKey) throw new Error('apiKey is required');

    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    // Sub-modules
    this.messages = new Messages(this.client);
    this.conversations = new Conversations(this.client);
    this.contacts = new Contacts(this.client);
    this.templates = new Templates(this.client);
    this.campaigns = new Campaigns(this.client);
    this.analytics = new Analytics(this.client);
    this.flows = new Flows(this.client);
    this.channels = new Channels(this.client);
    this.media = new Media(this.client);
    this.webhooks = new Webhooks(this.client);
  }

  /**
   * Health check
   */
  async health() {
    const { data } = await this.client.get('/health');
    return data;
  }
}

// ============ Messages ============
class Messages {
  constructor(client) { this.client = client; }

  async list(conversationId, params = {}) {
    const { data } = await this.client.get(`/messages/${conversationId}`, { params });
    return data;
  }

  async sendText({ conversationId, body }) {
    const { data } = await this.client.post('/messages/send', { conversationId, body });
    return data;
  }

  async sendTemplate({ conversationId, templateName, language, components }) {
    const { data } = await this.client.post('/messages/send-template', {
      conversationId, templateName, language, components,
    });
    return data;
  }

  async sendMedia({ conversationId, type, mediaUrl, mediaId, caption, filename }) {
    const { data } = await this.client.post('/messages/send-media', {
      conversationId, type, mediaUrl, mediaId, caption, filename,
    });
    return data;
  }

  async sendInteractive({ conversationId, interactive }) {
    const { data } = await this.client.post('/messages/send-interactive', {
      conversationId, interactive,
    });
    return data;
  }

  async sendLocation({ conversationId, latitude, longitude, name, address }) {
    const { data } = await this.client.post('/messages/send-location', {
      conversationId, latitude, longitude, name, address,
    });
    return data;
  }
}

// ============ Conversations ============
class Conversations {
  constructor(client) { this.client = client; }

  async list(params = {}) {
    const { data } = await this.client.get('/conversations', { params });
    return data;
  }

  async get(id) {
    const { data } = await this.client.get(`/conversations/${id}`);
    return data;
  }

  async markRead(id) {
    const { data } = await this.client.put(`/conversations/${id}/read`);
    return data;
  }

  async assignAgent(id, agentId) {
    const { data } = await this.client.put(`/conversations/${id}/assign`, { agentId });
    return data;
  }

  async close(id) {
    const { data } = await this.client.put(`/conversations/${id}/close`);
    return data;
  }

  async updateTags(id, tags) {
    const { data } = await this.client.put(`/conversations/${id}/tags`, { tags });
    return data;
  }
}

// ============ Contacts ============
class Contacts {
  constructor(client) { this.client = client; }

  async list(params = {}) {
    const { data } = await this.client.get('/contacts', { params });
    return data;
  }

  async get(id) {
    const { data } = await this.client.get(`/contacts/${id}`);
    return data;
  }

  async create(contactData) {
    const { data } = await this.client.post('/contacts', contactData);
    return data;
  }

  async update(id, contactData) {
    const { data } = await this.client.put(`/contacts/${id}`, contactData);
    return data;
  }

  async delete(id) {
    const { data } = await this.client.delete(`/contacts/${id}`);
    return data;
  }

  async bulkImport(contacts) {
    const { data } = await this.client.post('/contacts/bulk-import', { contacts });
    return data;
  }
}

// ============ Templates ============
class Templates {
  constructor(client) { this.client = client; }

  async list(params = {}) {
    const { data } = await this.client.get('/templates', { params });
    return data;
  }

  async sync() {
    const { data } = await this.client.post('/templates/sync');
    return data;
  }

  async create(templateData) {
    const { data } = await this.client.post('/templates', templateData);
    return data;
  }

  async update(id, templateData) {
    const { data } = await this.client.put(`/templates/${id}`, templateData);
    return data;
  }

  async delete(id) {
    const { data } = await this.client.delete(`/templates/${id}`);
    return data;
  }
}

// ============ Campaigns ============
class Campaigns {
  constructor(client) { this.client = client; }

  async list(params = {}) {
    const { data } = await this.client.get('/campaigns', { params });
    return data;
  }

  async get(id) {
    const { data } = await this.client.get(`/campaigns/${id}`);
    return data;
  }

  async create(campaignData) {
    const { data } = await this.client.post('/campaigns', campaignData);
    return data;
  }

  async launch(id) {
    const { data } = await this.client.post(`/campaigns/${id}/launch`);
    return data;
  }

  async cancel(id) {
    const { data } = await this.client.post(`/campaigns/${id}/cancel`);
    return data;
  }
}

// ============ Analytics ============
class Analytics {
  constructor(client) { this.client = client; }

  async dashboard(params = {}) {
    const { data } = await this.client.get('/analytics/dashboard', { params });
    return data;
  }

  async messageVolume(params = {}) {
    const { data } = await this.client.get('/analytics/message-volume', { params });
    return data;
  }

  async responseTime(params = {}) {
    const { data } = await this.client.get('/analytics/response-time', { params });
    return data;
  }

  async agentPerformance(params = {}) {
    const { data } = await this.client.get('/analytics/agent-performance', { params });
    return data;
  }

  async usage() {
    const { data } = await this.client.get('/analytics/usage');
    return data;
  }

  async exportCSV(type, params = {}) {
    const { data } = await this.client.get('/analytics/export/csv', {
      params: { type, ...params },
      responseType: 'arraybuffer',
    });
    return data;
  }
}

// ============ Flows ============
class Flows {
  constructor(client) { this.client = client; }

  async list(params = {}) {
    const { data } = await this.client.get('/flows', { params });
    return data;
  }

  async get(id) {
    const { data } = await this.client.get(`/flows/${id}`);
    return data;
  }

  async create(flowData) {
    const { data } = await this.client.post('/flows', flowData);
    return data;
  }

  async update(id, flowData) {
    const { data } = await this.client.put(`/flows/${id}`, flowData);
    return data;
  }

  async delete(id) {
    const { data } = await this.client.delete(`/flows/${id}`);
    return data;
  }

  async activate(id) {
    const { data } = await this.client.post(`/flows/${id}/activate`);
    return data;
  }

  async pause(id) {
    const { data } = await this.client.post(`/flows/${id}/pause`);
    return data;
  }
}

// ============ Channels ============
class Channels {
  constructor(client) { this.client = client; }

  async list() {
    const { data } = await this.client.get('/channels');
    return data;
  }

  async send({ channel, to, type, body, template, media, interactive }) {
    const { data } = await this.client.post('/channels/send', {
      channel, to, type, body, template, media, interactive,
    });
    return data;
  }

  async broadcast({ channels, to, type, body, template, media, interactive }) {
    const { data } = await this.client.post('/channels/broadcast', {
      channels, to, type, body, template, media, interactive,
    });
    return data;
  }
}

// ============ Media ============
class Media {
  constructor(client) { this.client = client; }

  async getUrl(mediaId) {
    const { data } = await this.client.get(`/media/${mediaId}`);
    return data;
  }
}

// ============ Webhooks ============
class Webhooks {
  constructor(client) { this.client = client; }

  /**
   * Verify webhook signature (for validating incoming webhooks)
   */
  static verifySignature(payload, signature, secret) {
    const crypto = require('crypto');
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return `sha256=${expectedSig}` === signature;
  }
}

module.exports = WhatsAppSaaS;
