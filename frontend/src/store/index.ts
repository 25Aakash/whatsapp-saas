import { create } from "zustand";
import { authAPI, conversationAPI, messageAPI } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

// ============ Types ============
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer" | "customer_agent";
  tenant?: Tenant;
  avatar?: string;
}

export interface Tenant {
  _id: string;
  name: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
  plan: string;
  isActive: boolean;
  onboardingStatus: string;
}

export interface Conversation {
  _id: string;
  tenant: string | Tenant;
  customerPhone: string;
  customerName: string;
  lastMessage: {
    body: string;
    timestamp: string;
    direction: "inbound" | "outbound";
  };
  unreadCount: number;
  windowExpiresAt: string | null;
  status: "open" | "closed" | "expired";
  assignedAgent?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  waMessageId?: string;
  direction: "inbound" | "outbound";
  type: string;
  body: string;
  templateName?: string;
  media?: { id: string; mimeType: string; url?: string; caption?: string; filename?: string };
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  statusTimestamps: { sent?: string; delivered?: string; read?: string; failed?: string };
  errorInfo?: { code: number; title: string; details?: string };
  timestamp: string;
  sentBy?: { _id: string; name: string };
  createdAt: string;
}

// ============ Auth Store ============
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  customerRegister: (data: { email: string; password: string; name: string; businessName: string }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const res = await authAPI.login(email, password);
    const { token, user } = res.data.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    connectSocket(token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  customerRegister: async (data) => {
    const res = await authAPI.customerRegister(data);
    const { token, user } = res.data.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    connectSocket(token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const res = await authAPI.getMe();
      const user = res.data.data.user;
      connectSocket(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// ============ Chat Store ============
interface ChatState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  currentPage: number;
  searchQuery: string;

  loadConversations: (search?: string) => Promise<void>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  loadMessages: (conversationId: string, page?: number) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageStatus: (waMessageId: string, status: string) => void;
  updateConversation: (conversation: Partial<Conversation> & { _id: string }) => void;
  setSearchQuery: (query: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  hasMoreMessages: true,
  currentPage: 1,
  searchQuery: "",

  loadConversations: async (search?: string) => {
    set({ isLoadingConversations: true });
    try {
      const res = await conversationAPI.list({ limit: 50, search });
      set({ conversations: res.data.data, isLoadingConversations: false });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  selectConversation: async (conversation: Conversation) => {
    set({ selectedConversation: conversation, messages: [], currentPage: 1, hasMoreMessages: true });
    await get().loadMessages(conversation._id);
    // Mark as read
    try {
      await conversationAPI.markRead(conversation._id);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === conversation._id ? { ...c, unreadCount: 0 } : c
        ),
        selectedConversation: state.selectedConversation
          ? { ...state.selectedConversation, unreadCount: 0 }
          : null,
      }));
    } catch { /* ignore */ }
  },

  loadMessages: async (conversationId: string, page = 1) => {
    set({ isLoadingMessages: true });
    try {
      const res = await messageAPI.list(conversationId, { page, limit: 50 });
      const { data, pagination } = res.data;
      set({
        messages: page === 1 ? data : [...data, ...get().messages],
        isLoadingMessages: false,
        currentPage: page,
        hasMoreMessages: pagination.hasNext,
      });
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  loadMoreMessages: async () => {
    const { selectedConversation, currentPage, hasMoreMessages, isLoadingMessages } = get();
    if (!selectedConversation || !hasMoreMessages || isLoadingMessages) return;
    await get().loadMessages(selectedConversation._id, currentPage + 1);
  },

  addMessage: (message: Message) => {
    set((state) => {
      // Dedup
      if (state.messages.find((m) => m._id === message._id)) return state;
      return { messages: [...state.messages, message] };
    });
  },

  updateMessageStatus: (waMessageId: string, status: string) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.waMessageId === waMessageId ? { ...m, status: status as Message["status"] } : m
      ),
    }));
  },

  updateConversation: (updated: Partial<Conversation> & { _id: string }) => {
    set((state) => ({
      conversations: state.conversations
        .map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
        .sort(
          (a, b) =>
            new Date(b.lastMessage?.timestamp || b.updatedAt).getTime() -
            new Date(a.lastMessage?.timestamp || a.updatedAt).getTime()
        ),
    }));
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },
}));
