import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Redirect to login if not already there
        if (window.location.pathname !== "/" && window.location.pathname !== "/register") {
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ============ Auth API ============
export const authAPI = {
  login: (email: string, password: string, twoFactorToken?: string) =>
    api.post("/auth/login", { email, password, twoFactorToken }),
  customerRegister: (data: { email: string; password: string; name: string; businessName: string }) =>
    api.post("/auth/customer-register", data),
  register: (data: { email: string; password: string; name: string; role?: string; tenantId?: string }) =>
    api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),
  getTeam: (tenantId?: string) => api.get("/auth/team", { params: { tenantId } }),
  removeTeamMember: (id: string) => api.delete(`/auth/team/${id}`),
  enable2FA: () => api.post("/auth/2fa/enable"),
  verify2FA: (token: string) => api.post("/auth/2fa/verify", { token }),
  disable2FA: (token: string) => api.post("/auth/2fa/disable", { token }),
};

// ============ Tenant API ============
export const tenantAPI = {
  // Admin endpoints
  list: () => api.get("/tenants"),
  get: (id: string) => api.get(`/tenants/${id}`),
  create: (name: string) => api.post("/tenants", { name }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
  checkStatus: (id: string) => api.get(`/tenants/${id}/status`),
  // Customer endpoints
  getMyAccount: () => api.get("/tenants/my-account"),
  checkMyStatus: () => api.get("/tenants/my-account/status"),
  embeddedSignup: (code: string) =>
    api.post("/tenants/embedded-signup", { code }),
};

// ============ Conversation API ============
export const conversationAPI = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string; tenantId?: string }) =>
    api.get("/conversations", { params }),
  get: (id: string) => api.get(`/conversations/${id}`),
  markRead: (id: string) => api.put(`/conversations/${id}/read`),
  assignAgent: (id: string, agentId: string) =>
    api.put(`/conversations/${id}/assign`, { agentId }),
  updateTags: (id: string, tags: string[]) =>
    api.put(`/conversations/${id}/tags`, { tags }),
  updateNotes: (id: string, notes: string) =>
    api.put(`/conversations/${id}/notes`, { notes }),
  close: (id: string) => api.put(`/conversations/${id}/close`),
};

// ============ Message API ============
export const messageAPI = {
  list: (conversationId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/messages/${conversationId}`, { params }),
  send: (conversationId: string, body: string) =>
    api.post("/messages/send", { conversationId, body }),
  sendTemplate: (data: {
    conversationId: string;
    templateName: string;
    language: string;
    components?: unknown[];
  }) => api.post("/messages/send-template", data),
  sendMedia: (data: {
    conversationId: string;
    type: string;
    mediaUrl?: string;
    mediaId?: string;
    caption?: string;
    filename?: string;
  }) => api.post("/messages/send-media", data),
  sendInteractive: (data: {
    conversationId: string;
    interactive: Record<string, unknown>;
  }) => api.post("/messages/send-interactive", data),
  sendLocation: (data: {
    conversationId: string;
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }) => api.post("/messages/send-location", data),
  sendReaction: (data: {
    conversationId: string;
    messageId: string;
    emoji: string;
  }) => api.post("/messages/send-reaction", data),
};

// ============ Template API ============
export const templateAPI = {
  list: (status?: string) => api.get("/templates", { params: { status } }),
  sync: () => api.post("/templates/sync"),
  create: (data: { name: string; category: string; language: string; components: unknown[] }) =>
    api.post("/templates", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

// ============ Contact API ============
export const contactAPI = {
  list: (params?: { page?: number; limit?: number; search?: string; tags?: string; groups?: string }) =>
    api.get("/contacts", { params }),
  get: (id: string) => api.get(`/contacts/${id}`),
  create: (data: { phone: string; name?: string; email?: string; tags?: string[]; groups?: string[]; attributes?: Record<string, string> }) =>
    api.post("/contacts", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  bulkImport: (contacts: Array<{ phone: string; name?: string; tags?: string[] }>) =>
    api.post("/contacts/import", { contacts }),
};

// ============ Campaign API ============
export const campaignAPI = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get("/campaigns", { params }),
  get: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: {
    name: string;
    templateName: string;
    templateLanguage?: string;
    audienceType: string;
    audienceFilter?: { tags?: string[]; groups?: string[]; contactIds?: string[] };
    scheduledAt?: string;
  }) => api.post("/campaigns", data),
  launch: (id: string) => api.post(`/campaigns/${id}/launch`),
  cancel: (id: string) => api.post(`/campaigns/${id}/cancel`),
};

// ============ Analytics API ============
export const analyticsAPI = {
  dashboard: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/analytics/dashboard", { params }),
  messageVolume: (params?: { startDate?: string; endDate?: string; granularity?: string }) =>
    api.get("/analytics/messages", { params }),
  responseTime: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/analytics/response-time", { params }),
  agentPerformance: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/analytics/agents", { params }),
  usage: () => api.get("/analytics/usage"),
  billing: () => api.get("/analytics/billing"),
  setCredits: (tenantId: string, credits: number, mode: "add" | "set" = "add") =>
    api.post("/analytics/billing/credits", { tenantId, credits, mode }),
  setCostPerMessage: (tenantId: string, cost: number) =>
    api.post("/analytics/billing/cost-per-message", { tenantId, cost }),
  exportCSV: (type: string, params?: { startDate?: string; endDate?: string }) =>
    api.get("/analytics/export/csv", { params: { type, ...params }, responseType: "blob" }),
};

// ============ API Key API ============
export const apiKeyAPI = {
  list: () => api.get("/api-keys"),
  create: (data: { name: string; permissions?: string[]; ipWhitelist?: string[]; expiresAt?: string }) =>
    api.post("/api-keys", data),
  revoke: (id: string) => api.delete(`/api-keys/${id}`),
};

// ============ Canned Response API ============
export const cannedResponseAPI = {
  list: (params?: { category?: string }) =>
    api.get("/canned-responses", { params }),
  get: (id: string) => api.get(`/canned-responses/${id}`),
  create: (data: { title: string; shortcode: string; body: string; category?: string; variables?: string[] }) =>
    api.post("/canned-responses", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/canned-responses/${id}`, data),
  delete: (id: string) => api.delete(`/canned-responses/${id}`),
};

// ============ Auto Reply API ============
export const autoReplyAPI = {
  list: () => api.get("/auto-replies"),
  get: (id: string) => api.get(`/auto-replies/${id}`),
  create: (data: {
    name: string;
    trigger: { type: string; value?: string; flags?: string };
    action: { type: string; message?: string; templateName?: string; agentId?: string; tag?: string };
    isActive?: boolean;
    priority?: number;
    businessHours?: Record<string, { enabled: boolean; start: string; end: string }>;
    cooldownMinutes?: number;
  }) => api.post("/auto-replies", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/auto-replies/${id}`, data),
  delete: (id: string) => api.delete(`/auto-replies/${id}`),
};

// ============ Media API ============
export const mediaAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getUrl: (mediaId: string) => api.get(`/media/${mediaId}`),
};

// ============ Scheduled Message API ============
export const scheduledMessageAPI = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get("/scheduled-messages", { params }),
  schedule: (data: {
    conversationId?: string;
    contactPhone: string;
    phoneNumberId: string;
    type?: string;
    body?: string;
    templateName?: string;
    templateLanguage?: string;
    mediaUrl?: string;
    scheduledAt: string;
  }) => api.post("/scheduled-messages", data),
  cancel: (id: string) => api.post(`/scheduled-messages/${id}/cancel`),
};

// ============ Audit Log API ============
export const auditLogAPI = {
  list: (params?: { page?: number; limit?: number; action?: string; startDate?: string; endDate?: string }) =>
    api.get("/audit-logs", { params }),
};

// ============ Flow API ============
export const flowAPI = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get("/flows", { params }),
  get: (id: string) => api.get(`/flows/${id}`),
  create: (data: {
    name: string;
    description?: string;
    trigger: { type: string; keywords?: string[] };
    nodes?: unknown[];
    edges?: unknown[];
    priority?: number;
  }) => api.post("/flows", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/flows/${id}`, data),
  delete: (id: string) => api.delete(`/flows/${id}`),
  activate: (id: string) => api.post(`/flows/${id}/activate`),
  pause: (id: string) => api.post(`/flows/${id}/pause`),
  getSessions: (id: string, params?: { page?: number; limit?: number; status?: string }) =>
    api.get(`/flows/${id}/sessions`, { params }),
};

// ============ Channel API ============
export const channelAPI = {
  list: () => api.get("/channels"),
  send: (data: { channel: string; to: string; message: string; templateName?: string; templateLanguage?: string; mediaUrl?: string }) =>
    api.post("/channels/send", data),
  broadcast: (data: { channels: string[]; contacts: string[]; message: string }) =>
    api.post("/channels/broadcast", data),
};

// ============ Catalog API ============
export const catalogAPI = {
  getProducts: (catalogId: string, params?: { limit?: number; after?: string }) =>
    api.get(`/catalog/${catalogId}/products`, { params }),
  getProduct: (productId: string) =>
    api.get(`/catalog/products/${productId}`),
  sendProduct: (data: { conversationId: string; catalogId: string; productId: string }) =>
    api.post("/catalog/send-product", data),
  sendProductList: (data: { conversationId: string; catalogId: string; productIds: string[]; headerText?: string; bodyText?: string }) =>
    api.post("/catalog/send-product-list", data),
  sendCatalog: (data: { conversationId: string; bodyText?: string; footerText?: string }) =>
    api.post("/catalog/send-catalog", data),
};

// ============ CSAT API ============
export const csatAPI = {
  listSurveys: () => api.get("/csat/surveys"),
  createSurvey: (data: {
    question: string;
    followUpQuestion?: string;
    scale?: number;
    trigger?: string;
    cooldownHours?: number;
    thankYouMessage?: string;
  }) => api.post("/csat/surveys", data),
  updateSurvey: (id: string, data: Record<string, unknown>) =>
    api.put(`/csat/surveys/${id}`, data),
  deleteSurvey: (id: string) => api.delete(`/csat/surveys/${id}`),
  sendSurvey: (data: { customerPhone: string; conversationId?: string; surveyId?: string; phoneNumberId?: string }) =>
    api.post("/csat/send", data),
  getAnalytics: (params?: { startDate?: string; endDate?: string; agentId?: string }) =>
    api.get("/csat/analytics", { params }),
  getResponses: (params?: { page?: number; limit?: number; category?: string }) =>
    api.get("/csat/responses", { params }),
};

// ============ SSO API ============
export const ssoAPI = {
  getConfig: () => api.get("/sso/config"),
  updateConfig: (data: {
    enabled: boolean;
    provider: string;
    entryPoint?: string;
    issuer?: string;
    cert?: string;
    discoveryUrl?: string;
    clientId?: string;
    clientSecret?: string;
    defaultRole?: string;
    autoProvision?: boolean;
    domains?: string[];
  }) => api.put("/sso/config", data),
  getLoginUrl: (domain: string) => api.get("/sso/login", { params: { domain } }),
};

export default api;
