# WhatsApp SaaS SDK

Official Node.js SDK for the WhatsApp SaaS Platform.

## Installation

```bash
npm install whatsapp-saas-sdk
```

## Quick Start

```javascript
const WhatsAppSaaS = require('whatsapp-saas-sdk');

const client = new WhatsAppSaaS({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.yourdomain.com/api/v1',
});

// Send a text message
const msg = await client.messages.sendText({
  conversationId: 'conv_123',
  body: 'Hello from the SDK!',
});

// Send a template
await client.messages.sendTemplate({
  conversationId: 'conv_123',
  templateName: 'welcome',
  language: 'en',
  components: [],
});

// List conversations
const convos = await client.conversations.list({ page: 1, limit: 20 });

// Create a contact
await client.contacts.create({
  phone: '+1234567890',
  name: 'John Doe',
  tags: ['vip'],
});

// Launch a campaign
await client.campaigns.launch('campaign_id');

// Multi-channel send
await client.channels.send({
  channel: 'sms',
  to: '+1234567890',
  body: 'Hello via SMS!',
});

// Chatbot flows
const flows = await client.flows.list();
await client.flows.activate('flow_id');

// Analytics
const dashboard = await client.analytics.dashboard({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});

// Export CSV
const csv = await client.analytics.exportCSV('messages', {
  startDate: '2024-01-01',
});
```

## Webhook Verification

```javascript
const WhatsAppSaaS = require('whatsapp-saas-sdk');

// In your webhook handler
app.post('/webhook', (req, res) => {
  const isValid = WhatsAppSaaS.prototype.webhooks.constructor.verifySignature(
    req.body,
    req.headers['x-hub-signature-256'],
    'your-webhook-secret'
  );

  if (!isValid) return res.status(401).send('Invalid signature');
  // Process webhook...
});
```

## API Reference

### Messages
- `messages.list(conversationId, params?)` - List messages
- `messages.sendText({ conversationId, body })` - Send text
- `messages.sendTemplate({ conversationId, templateName, language, components? })` - Send template
- `messages.sendMedia({ conversationId, type, mediaUrl?, caption? })` - Send media
- `messages.sendInteractive({ conversationId, interactive })` - Send interactive
- `messages.sendLocation({ conversationId, latitude, longitude })` - Send location

### Conversations
- `conversations.list(params?)` - List conversations
- `conversations.get(id)` - Get conversation
- `conversations.markRead(id)` - Mark as read
- `conversations.assignAgent(id, agentId)` - Assign agent
- `conversations.close(id)` - Close conversation

### Contacts
- `contacts.list(params?)` - List contacts
- `contacts.create(data)` - Create contact
- `contacts.update(id, data)` - Update contact
- `contacts.delete(id)` - Delete contact
- `contacts.bulkImport(contacts)` - Bulk import

### Templates
- `templates.list(params?)` - List templates
- `templates.sync()` - Sync from Meta
- `templates.create(data)` - Create template

### Campaigns
- `campaigns.list(params?)` - List campaigns
- `campaigns.create(data)` - Create campaign
- `campaigns.launch(id)` - Launch campaign
- `campaigns.cancel(id)` - Cancel campaign

### Flows (Chatbot)
- `flows.list(params?)` - List flows
- `flows.create(data)` - Create flow
- `flows.activate(id)` - Activate flow
- `flows.pause(id)` - Pause flow

### Channels
- `channels.list()` - List available channels
- `channels.send(data)` - Send via specific channel
- `channels.broadcast(data)` - Send across multiple channels

### Analytics
- `analytics.dashboard(params?)` - Dashboard metrics
- `analytics.messageVolume(params?)` - Message volume
- `analytics.usage()` - Usage stats
- `analytics.exportCSV(type, params?)` - Export CSV
