"use client";

import { useState, useEffect, useCallback } from "react";
import { tenantAPI, conversationAPI } from "@/lib/api";
import { useAuthStore, Tenant, Conversation } from "@/store";
import {
  MessageSquare,
  Phone,
  CheckCircle,
  AlertCircle,
  Wifi,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/* FB type is declared in FacebookSDK.tsx */

export default function CustomerDashboard() {
  const { user, loadUser } = useAuthStore();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    // Skip if admin (they'll be redirected to /admin by the layout guard)
    if (user?.role === "admin") return;
    try {
      setIsLoading(true);
      const tenantRes = await tenantAPI.getMyAccount();
      setTenant(tenantRes.data.data.tenant);

      // Load conversations if connected
      if (tenantRes.data.data.tenant?.onboardingStatus === "connected") {
        const convRes = await conversationAPI.list({ limit: 10 });
        setConversations(convRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);


  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEmbeddedSignup = () => {
    setError("");
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
    if (!configId) {
      setError("Meta Config ID is not configured. Please contact support.");
      return;
    }

    if (!window.FB) {
      setError("Facebook SDK not loaded. Please refresh the page.");
      return;
    }

    window.FB.login(
      async (response) => {
        if (response.authResponse?.code) {
          try {
            setIsConnecting(true);
            await tenantAPI.embeddedSignup(response.authResponse.code);
            await loadUser();
            await loadData();
          } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || "Failed to connect WhatsApp. Please try again.");
          } finally {
            setIsConnecting(false);
          }
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
        },
      }
    );
  };

  const isConnected = tenant?.onboardingStatus === "connected";

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome, {user?.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isConnected
            ? "Your WhatsApp Business is connected and ready to go."
            : "Get started by connecting your WhatsApp Business Account."}
        </p>
      </div>

      {/* Connection Status / CTA */}
      {!isConnected ? (
        <div className="mb-8 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-900/10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <LinkIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Connect Your WhatsApp Business
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Link your WhatsApp Business Account using Meta&apos;s Embedded Signup.
            This takes just a few minutes and lets you start messaging customers right away.
          </p>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200 max-w-md mx-auto">
              {error}
            </div>
          )}
          <Button
            onClick={handleEmbeddedSignup}
            size="lg"
            disabled={isConnecting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isConnecting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Connect WhatsApp
              </div>
            )}
          </Button>
        </div>
      ) : (
        <>
          {/* Connected Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
            <div className="rounded-xl bg-emerald-50 p-6 dark:bg-emerald-900/20">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">Connected</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tenant?.displayPhoneNumber || "Phone active"}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-6 dark:bg-blue-900/20">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Conversations</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {conversations.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active chats</p>
            </div>

            <div className="rounded-xl bg-purple-50 p-6 dark:bg-purple-900/20">
              <div className="flex items-center gap-3 mb-3">
                <Phone className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Quality</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {tenant?.qualityRating || "N/A"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quality rating</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  href="/dashboard/conversations"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      View Conversations
                    </p>
                    <p className="text-xs text-gray-500">
                      Reply to customer messages
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/templates"
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Message Templates
                    </p>
                    <p className="text-xs text-gray-500">
                      Manage WhatsApp templates
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Conversations */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Conversations
                </h2>
                <button
                  onClick={loadData}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  No conversations yet. Send a template message to get started!
                </p>
              ) : (
                <div className="space-y-3">
                  {conversations.slice(0, 5).map((conv) => (
                    <Link
                      key={conv._id}
                      href="/dashboard/conversations"
                      className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 transition-colors dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
                          {conv.customerName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {conv.customerName || conv.customerPhone}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {conv.lastMessage?.body || "No messages"}
                          </p>
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
