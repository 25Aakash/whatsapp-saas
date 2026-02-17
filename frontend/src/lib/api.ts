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
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  customerRegister: (data: { email: string; password: string; name: string; businessName: string }) =>
    api.post("/auth/customer-register", data),
  register: (data: { email: string; password: string; name: string; role?: string; tenantId?: string }) =>
    api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),
  getTeam: (tenantId?: string) => api.get("/auth/team", { params: { tenantId } }),
  removeTeamMember: (id: string) => api.delete(`/auth/team/${id}`),
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
};

// ============ Template API ============
export const templateAPI = {
  list: (status?: string) => api.get("/templates", { params: { status } }),
  sync: () => api.post("/templates/sync"),
};

export default api;
