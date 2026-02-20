declare module 'whatsapp-saas-sdk' {
  interface ClientOptions {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
  }

  interface PaginationParams {
    page?: number;
    limit?: number;
  }

  interface Message {
    _id: string;
    conversation: string;
    direction: 'inbound' | 'outbound';
    type: string;
    body: string;
    status: string;
    timestamp: string;
  }

  interface Conversation {
    _id: string;
    customerPhone: string;
    customerName: string;
    lastMessage: { body: string; timestamp: string; direction: string };
    status: string;
    unreadCount: number;
  }

  interface Contact {
    _id: string;
    phone: string;
    name: string;
    email?: string;
    tags: string[];
    groups: string[];
  }

  interface Template {
    _id: string;
    name: string;
    language: string;
    category: string;
    status: string;
    components: unknown[];
  }

  interface Campaign {
    _id: string;
    name: string;
    status: string;
    stats: { total: number; sent: number; delivered: number; read: number; failed: number };
  }

  interface Flow {
    _id: string;
    name: string;
    description: string;
    status: string;
    trigger: { type: string; keywords: string[] };
    nodes: unknown[];
    edges: unknown[];
    stats: { triggered: number; completed: number; errors: number };
  }

  class Messages {
    list(conversationId: string, params?: PaginationParams): Promise<{ data: Message[] }>;
    sendText(data: { conversationId: string; body: string }): Promise<{ data: Message }>;
    sendTemplate(data: {
      conversationId: string;
      templateName: string;
      language: string;
      components?: unknown[];
    }): Promise<{ data: Message }>;
    sendMedia(data: {
      conversationId: string;
      type: string;
      mediaUrl?: string;
      mediaId?: string;
      caption?: string;
      filename?: string;
    }): Promise<{ data: Message }>;
    sendInteractive(data: {
      conversationId: string;
      interactive: Record<string, unknown>;
    }): Promise<{ data: Message }>;
    sendLocation(data: {
      conversationId: string;
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    }): Promise<{ data: Message }>;
  }

  class Conversations {
    list(params?: PaginationParams & { status?: string; search?: string }): Promise<{ data: Conversation[] }>;
    get(id: string): Promise<{ data: Conversation }>;
    markRead(id: string): Promise<{ success: boolean }>;
    assignAgent(id: string, agentId: string): Promise<{ success: boolean }>;
    close(id: string): Promise<{ success: boolean }>;
    updateTags(id: string, tags: string[]): Promise<{ success: boolean }>;
  }

  class Contacts {
    list(params?: PaginationParams & { search?: string; tags?: string }): Promise<{ data: Contact[] }>;
    get(id: string): Promise<{ data: Contact }>;
    create(data: { phone: string; name?: string; email?: string; tags?: string[] }): Promise<{ data: Contact }>;
    update(id: string, data: Partial<Contact>): Promise<{ data: Contact }>;
    delete(id: string): Promise<{ success: boolean }>;
    bulkImport(contacts: Array<{ phone: string; name?: string; tags?: string[] }>): Promise<{ success: boolean }>;
  }

  class Templates {
    list(params?: { status?: string }): Promise<{ data: Template[] }>;
    sync(): Promise<{ success: boolean }>;
    create(data: { name: string; category: string; language: string; components: unknown[] }): Promise<{ data: Template }>;
    update(id: string, data: Partial<Template>): Promise<{ data: Template }>;
    delete(id: string): Promise<{ success: boolean }>;
  }

  class Campaigns {
    list(params?: PaginationParams & { status?: string }): Promise<{ data: Campaign[] }>;
    get(id: string): Promise<{ data: Campaign }>;
    create(data: {
      name: string;
      templateName: string;
      templateLanguage?: string;
      audienceType: string;
      scheduledAt?: string;
    }): Promise<{ data: Campaign }>;
    launch(id: string): Promise<{ success: boolean }>;
    cancel(id: string): Promise<{ success: boolean }>;
  }

  class Analytics {
    dashboard(params?: { startDate?: string; endDate?: string }): Promise<{ data: unknown }>;
    messageVolume(params?: { startDate?: string; endDate?: string; granularity?: string }): Promise<{ data: unknown }>;
    responseTime(params?: { startDate?: string; endDate?: string }): Promise<{ data: unknown }>;
    agentPerformance(params?: { startDate?: string; endDate?: string }): Promise<{ data: unknown }>;
    usage(): Promise<{ data: unknown }>;
    exportCSV(type: string, params?: { startDate?: string; endDate?: string }): Promise<Buffer>;
  }

  class Flows {
    list(params?: PaginationParams & { status?: string }): Promise<{ data: Flow[] }>;
    get(id: string): Promise<{ data: Flow }>;
    create(data: Partial<Flow>): Promise<{ data: Flow }>;
    update(id: string, data: Partial<Flow>): Promise<{ data: Flow }>;
    delete(id: string): Promise<{ success: boolean }>;
    activate(id: string): Promise<{ data: Flow }>;
    pause(id: string): Promise<{ data: Flow }>;
  }

  class Channels {
    list(): Promise<{ data: Array<{ name: string; available: boolean }> }>;
    send(data: {
      channel: string;
      to: string;
      type?: string;
      body?: string;
      template?: unknown;
      media?: unknown;
      interactive?: unknown;
    }): Promise<{ data: unknown }>;
    broadcast(data: {
      channels: string[];
      to: string;
      type?: string;
      body?: string;
    }): Promise<{ data: unknown[] }>;
  }

  class Media {
    getUrl(mediaId: string): Promise<{ data: { url: string } }>;
  }

  class Webhooks {
    static verifySignature(payload: unknown, signature: string, secret: string): boolean;
  }

  class WhatsAppSaaS {
    constructor(options: ClientOptions);
    messages: Messages;
    conversations: Conversations;
    contacts: Contacts;
    templates: Templates;
    campaigns: Campaigns;
    analytics: Analytics;
    flows: Flows;
    channels: Channels;
    media: Media;
    webhooks: Webhooks;
    health(): Promise<{ status: string; timestamp: string }>;
  }

  export = WhatsAppSaaS;
}
