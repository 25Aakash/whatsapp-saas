"use client";

import { useState, useEffect } from "react";
import { conversationAPI } from "@/lib/api";
import { Conversation } from "@/store";
import { MessageSquare, Search, Clock, User } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const res = await conversationAPI.list({ limit: 100 });
      setConversations(res.data.data || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = conversations.filter(
    (c) =>
      c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.customerPhone?.includes(search)
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          All Conversations
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          View conversations across all customers (read-only)
        </p>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare className="h-12 w-12 mb-3 text-gray-200" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((conv) => (
              <div
                key={conv._id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
                  {conv.customerName?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {conv.customerName || conv.customerPhone}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conv.lastMessage?.body || "No messages"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {conv.lastMessage?.timestamp
                      ? new Date(conv.lastMessage.timestamp).toLocaleDateString()
                      : "—"}
                  </p>
                  <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    conv.status === "open"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {conv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
