"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store";
import { apiKeyAPI, cannedResponseAPI, autoReplyAPI, analyticsAPI, authAPI } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Key,
  Building2,
  Plus,
  Trash2,
  Copy,
  Bot,
  MessageCircle,
  CreditCard,
  Loader2,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

interface ApiKey {
  _id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

interface CannedResponse {
  _id: string;
  title: string;
  shortcode: string;
  body: string;
  category: string;
}

interface AutoReply {
  _id: string;
  name: string;
  trigger: { type: string; value?: string };
  action: { type: string; message?: string };
  isActive: boolean;
  priority: number;
}

interface BillingInfo {
  credits: {
    balance: number;
    totalAllocated: number;
    totalUsed: number;
    lastTopUp: string | null;
    costPerMessage: number;
  };
  planLimits: Record<string, number>;
  currentUsage: {
    messages: number;
    messagesOutbound: number;
    messagesInbound: number;
    apiCalls: number;
    campaigns: number;
  };
  period: string;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState("profile");

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  // Canned Responses
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [loadingCanned, setLoadingCanned] = useState(false);
  const [showCreateCanned, setShowCreateCanned] = useState(false);
  const [cannedTitle, setCannedTitle] = useState("");
  const [cannedShortcode, setCannedShortcode] = useState("");
  const [cannedBody, setCannedBody] = useState("");

  // Auto Replies
  const [autoReplies, setAutoReplies] = useState<AutoReply[]>([]);
  const [loadingAutoReplies, setLoadingAutoReplies] = useState(false);
  const [showCreateAutoReply, setShowCreateAutoReply] = useState(false);
  const [arName, setArName] = useState("");
  const [arTriggerType, setArTriggerType] = useState("keyword");
  const [arTriggerValue, setArTriggerValue] = useState("");
  const [arMessage, setArMessage] = useState("");

  // Billing
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);

  // 2FA
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [twoFAUrl, setTwoFAUrl] = useState<string | null>(null);
  const [twoFAToken, setTwoFAToken] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);

  const loadApiKeys = useCallback(async () => {
    try {
      setLoadingKeys(true);
      const res = await apiKeyAPI.list();
      setApiKeys(res.data.data?.keys || res.data.data || []);
    } catch { /* ignore */ } finally { setLoadingKeys(false); }
  }, []);

  const loadCannedResponses = useCallback(async () => {
    try {
      setLoadingCanned(true);
      const res = await cannedResponseAPI.list();
      setCannedResponses(res.data.data?.cannedResponses || res.data.data || []);
    } catch { /* ignore */ } finally { setLoadingCanned(false); }
  }, []);

  const loadAutoReplies = useCallback(async () => {
    try {
      setLoadingAutoReplies(true);
      const res = await autoReplyAPI.list();
      setAutoReplies(res.data.data?.rules || res.data.data || []);
    } catch { /* ignore */ } finally { setLoadingAutoReplies(false); }
  }, []);

  const loadBilling = useCallback(async () => {
    try {
      setLoadingBilling(true);
      const res = await analyticsAPI.billing();
      setBilling(res.data.data || null);
    } catch { /* ignore */ } finally { setLoadingBilling(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "api-keys") loadApiKeys();
    if (activeTab === "canned") loadCannedResponses();
    if (activeTab === "auto-reply") loadAutoReplies();
    if (activeTab === "billing") loadBilling();
  }, [activeTab, loadApiKeys, loadCannedResponses, loadAutoReplies, loadBilling]);

  const handleCreateKey = async () => {
    try {
      setCreatingKey(true);
      const res = await apiKeyAPI.create({ name: newKeyName });
      setCreatedKey(res.data.data.rawKey);
      setNewKeyName("");
      loadApiKeys();
    } catch { /* ignore */ } finally { setCreatingKey(false); }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await apiKeyAPI.revoke(id);
    loadApiKeys();
  };

  const handleCreateCanned = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cannedResponseAPI.create({ title: cannedTitle, shortcode: cannedShortcode, body: cannedBody });
      setShowCreateCanned(false);
      setCannedTitle(""); setCannedShortcode(""); setCannedBody("");
      loadCannedResponses();
    } catch { /* ignore */ }
  };

  const handleDeleteCanned = async (id: string) => {
    if (!confirm("Delete this canned response?")) return;
    await cannedResponseAPI.delete(id);
    loadCannedResponses();
  };

  const handleCreateAutoReply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await autoReplyAPI.create({
        name: arName,
        trigger: { type: arTriggerType, value: arTriggerValue || undefined },
        action: { type: "text_reply", message: arMessage },
      });
      setShowCreateAutoReply(false);
      setArName(""); setArTriggerType("keyword"); setArTriggerValue(""); setArMessage("");
      loadAutoReplies();
    } catch { /* ignore */ }
  };

  const handleDeleteAutoReply = async (id: string) => {
    if (!confirm("Delete this auto-reply rule?")) return;
    await autoReplyAPI.delete(id);
    loadAutoReplies();
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "canned", label: "Canned Responses", icon: MessageCircle },
    { id: "auto-reply", label: "Auto Replies", icon: Bot },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  return (
    <>
      <Header title="Settings" subtitle="Manage your account and integrations" />
      <div className="flex flex-1 overflow-hidden">
        {/* Tab Sidebar */}
        <nav className="w-56 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl">

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Role</span>
                    <Badge variant="default">
                      {user?.role === "customer" ? "Owner" : user?.role === "customer_agent" ? "Team Member" : user?.role}
                    </Badge>
                  </div>
                </div>
              </section>

              {user?.tenant && typeof user.tenant === "object" && (
                <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Business Name</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{user.tenant.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Phone Number</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.tenant.displayPhoneNumber || "Not connected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <Badge variant={user.tenant.onboardingStatus === "connected" ? "default" : "secondary"}>
                        {user.tenant.onboardingStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Plan</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {user.tenant.plan || "Free"}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Information</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">Webhook URL</span>
                    <code className="mt-1 block rounded-lg bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/webhook
                    </code>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">API Base URL</span>
                    <code className="mt-1 block rounded-lg bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}
                    </code>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Security / 2FA Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Add an extra layer of security with a TOTP authenticator app (e.g. Google Authenticator, Authy).
                </p>

                {twoFAEnabled ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="font-medium">2FA is enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={twoFAToken}
                        onChange={(e) => setTwoFAToken(e.target.value)}
                        placeholder="Enter code to disable..."
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-48"
                        maxLength={6}
                      />
                      <Button
                        variant="destructive"
                        disabled={loading2FA || twoFAToken.length !== 6}
                        onClick={async () => {
                          setLoading2FA(true);
                          setTwoFAError("");
                          try {
                            await authAPI.disable2FA(twoFAToken);
                            setTwoFAEnabled(false);
                            setTwoFAToken("");
                          } catch {
                            setTwoFAError("Invalid code");
                          } finally { setLoading2FA(false); }
                        }}
                      >
                        Disable 2FA
                      </Button>
                    </div>
                    {twoFAError && <p className="text-sm text-red-500">{twoFAError}</p>}
                  </div>
                ) : twoFASecret ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">Scan this QR code with your authenticator app, then enter the code below.</p>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Manual entry key:</p>
                      <code className="text-sm font-mono break-all">{twoFASecret}</code>
                    </div>
                    {twoFAUrl && (
                      <div className="p-4 bg-white border rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">Otpauth URL (paste in authenticator if QR not available):</p>
                        <code className="text-xs font-mono break-all text-gray-600">{twoFAUrl}</code>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={twoFAToken}
                        onChange={(e) => setTwoFAToken(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-48"
                        maxLength={6}
                      />
                      <Button
                        disabled={loading2FA || twoFAToken.length !== 6}
                        onClick={async () => {
                          setLoading2FA(true);
                          setTwoFAError("");
                          try {
                            await authAPI.verify2FA(twoFAToken);
                            setTwoFAEnabled(true);
                            setTwoFASecret(null);
                            setTwoFAUrl(null);
                            setTwoFAToken("");
                          } catch {
                            setTwoFAError("Invalid code. Try again.");
                          } finally { setLoading2FA(false); }
                        }}
                      >
                        Verify &amp; Enable
                      </Button>
                    </div>
                    {twoFAError && <p className="text-sm text-red-500">{twoFAError}</p>}
                  </div>
                ) : (
                  <Button
                    disabled={loading2FA}
                    onClick={async () => {
                      setLoading2FA(true);
                      try {
                        const res = await authAPI.enable2FA();
                        const data = res.data.data;
                        setTwoFASecret(data.secret);
                        setTwoFAUrl(data.otpauthUrl);
                      } catch {
                        setTwoFAError("Failed to enable 2FA");
                      } finally { setLoading2FA(false); }
                    }}
                  >
                    {loading2FA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Enable Two-Factor Authentication
                  </Button>
                )}
              </section>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "api-keys" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h2>
                  <p className="text-sm text-gray-500">Create keys for programmatic API access</p>
                </div>
                <Button onClick={() => setShowCreateKey(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Key
                </Button>
              </div>

              {createdKey && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
                  <p className="mb-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    API key created! Copy it now — it won&apos;t be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-xs dark:bg-gray-800">
                      {createdKey}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdKey); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCreatedKey(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {loadingKeys ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : apiKeys.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No API keys yet</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key._id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{key.name}</p>
                        <p className="text-xs text-gray-500">
                          {key.keyPrefix}... · Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleRevokeKey(key._id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Key Modal */}
              {showCreateKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Create API Key</h3>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Key name (e.g., Production)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateKey(false)}>Cancel</Button>
                      <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || creatingKey}>
                        {creatingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Create
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Canned Responses Tab */}
          {activeTab === "canned" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Canned Responses</h2>
                  <p className="text-sm text-gray-500">Quick reply templates with shortcodes (e.g., /greeting)</p>
                </div>
                <Button onClick={() => setShowCreateCanned(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Response
                </Button>
              </div>

              {loadingCanned ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : cannedResponses.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No canned responses yet</p>
              ) : (
                <div className="space-y-2">
                  {cannedResponses.map((cr) => (
                    <div key={cr._id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{cr.title}</p>
                          <p className="text-xs text-emerald-600 font-mono">/{cr.shortcode}</p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{cr.body}</p>
                        </div>
                        <button onClick={() => handleDeleteCanned(cr._id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Canned Response Modal */}
              {showCreateCanned && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Canned Response</h3>
                      <button onClick={() => setShowCreateCanned(false)}><X className="h-5 w-5 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleCreateCanned} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
                        <input required type="text" value={cannedTitle} onChange={(e) => setCannedTitle(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shortcode * (no slash)</label>
                        <input required type="text" value={cannedShortcode} onChange={(e) => setCannedShortcode(e.target.value)} placeholder="greeting"
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Body *</label>
                        <textarea required rows={3} value={cannedBody} onChange={(e) => setCannedBody(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateCanned(false)}>Cancel</Button>
                        <Button type="submit">Create</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auto Reply Tab */}
          {activeTab === "auto-reply" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Auto-Reply Rules</h2>
                  <p className="text-sm text-gray-500">Automatically respond to incoming messages</p>
                </div>
                <Button onClick={() => setShowCreateAutoReply(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              </div>

              {loadingAutoReplies ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : autoReplies.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No auto-reply rules yet</p>
              ) : (
                <div className="space-y-2">
                  {autoReplies.map((rule) => (
                    <div key={rule._id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              rule.isActive ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"
                            }`}>
                              {rule.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Trigger: <span className="font-medium capitalize">{rule.trigger.type}</span>
                            {rule.trigger.value && ` — "${rule.trigger.value}"`}
                          </p>
                          {rule.action.message && (
                            <p className="text-sm text-gray-600 mt-1 dark:text-gray-400">Reply: {rule.action.message}</p>
                          )}
                        </div>
                        <button onClick={() => handleDeleteAutoReply(rule._id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Auto Reply Modal */}
              {showCreateAutoReply && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Auto-Reply Rule</h3>
                      <button onClick={() => setShowCreateAutoReply(false)}><X className="h-5 w-5 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleCreateAutoReply} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rule Name *</label>
                        <input required type="text" value={arName} onChange={(e) => setArName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Trigger Type</label>
                        <select value={arTriggerType} onChange={(e) => setArTriggerType(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                          <option value="keyword">Keyword</option>
                          <option value="regex">Regex</option>
                          <option value="first_message">First Message</option>
                          <option value="out_of_hours">Out of Hours</option>
                          <option value="all">All Messages</option>
                        </select>
                      </div>
                      {(arTriggerType === "keyword" || arTriggerType === "regex") && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {arTriggerType === "keyword" ? "Keyword" : "Regex Pattern"} *
                          </label>
                          <input required type="text" value={arTriggerValue} onChange={(e) => setArTriggerValue(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Auto-Reply Message *</label>
                        <textarea required rows={3} value={arMessage} onChange={(e) => setArMessage(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateAutoReply(false)}>Cancel</Button>
                        <Button type="submit">Create</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Credits & Usage</h2>
              {loadingBilling ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : billing ? (
                <>
                  {/* Credit Balance */}
                  <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Credit Balance</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {billing.credits.balance.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Cost per message: <span className="font-medium text-gray-900 dark:text-white">{billing.credits.costPerMessage}</span> credit(s)
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ≈ {Math.floor(billing.credits.balance / (billing.credits.costPerMessage || 1)).toLocaleString()} messages remaining
                        </p>
                      </div>
                    </div>
                    {/* Credit bar */}
                    {billing.credits.totalAllocated > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Used</span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {billing.credits.totalUsed.toLocaleString()} / {billing.credits.totalAllocated.toLocaleString()} total allocated
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              billing.credits.balance < billing.credits.totalAllocated * 0.1
                                ? "bg-red-500"
                                : billing.credits.balance < billing.credits.totalAllocated * 0.3
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(100, Math.round(((billing.credits.totalAllocated - billing.credits.balance) / billing.credits.totalAllocated) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {billing.credits.lastTopUp && (
                      <p className="text-xs text-gray-400 mt-3">
                        Last top-up: {new Date(billing.credits.lastTopUp).toLocaleDateString()}
                      </p>
                    )}
                  </section>

                  {/* Monthly Usage */}
                  <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                      Usage This Month ({billing.period})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{billing.currentUsage.messages.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Messages</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{billing.currentUsage.messagesOutbound.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Outbound</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{billing.currentUsage.messagesInbound.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Inbound</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{billing.currentUsage.campaigns.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Campaigns</p>
                      </div>
                    </div>
                  </section>

                  {billing.credits.balance === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                      <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                        You have no credits remaining. Contact your administrator to get more credits.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Unable to load billing information</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
