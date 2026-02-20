"use client";

import { useState, useEffect, useCallback } from "react";
import { campaignAPI, templateAPI } from "@/lib/api";
import {
  Plus,
  Play,
  XCircle,
  Loader2,
  Megaphone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Campaign {
  _id: string;
  name: string;
  templateName: string;
  audienceType: string;
  status: string;
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface Template {
  _id: string;
  name: string;
  language: string;
  status: string;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  draft: { color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300", icon: Clock },
  scheduled: { color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Clock },
  processing: { color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Loader2 },
  completed: { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  failed: { color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  cancelled: { color: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400", icon: XCircle },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [audienceType, setAudienceType] = useState("all");
  const [tagsFilter, setTagsFilter] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await campaignAPI.list({ limit: 50 });
      setCampaigns(res.data.data || []);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await templateAPI.list("APPROVED");
      setTemplates(res.data.data?.templates || res.data.data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
    loadTemplates();
  }, [loadCampaigns, loadTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await campaignAPI.create({
        name,
        templateName,
        audienceType,
        audienceFilter: tagsFilter ? { tags: tagsFilter.split(",").map((t) => t.trim()) } : undefined,
        scheduledAt: scheduledAt || undefined,
      });
      setShowCreate(false);
      setName("");
      setTemplateName("");
      setAudienceType("all");
      setTagsFilter("");
      setScheduledAt("");
      loadCampaigns();
    } catch (err) {
      console.error("Failed to create campaign:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm("Launch this campaign? Messages will be sent immediately.")) return;
    try {
      await campaignAPI.launch(id);
      loadCampaigns();
    } catch (err) {
      console.error("Failed to launch campaign:", err);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this campaign?")) return;
    try {
      await campaignAPI.cancel(id);
      loadCampaigns();
    } catch (err) {
      console.error("Failed to cancel campaign:", err);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-sm text-gray-500">Send bulk template messages</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Campaign List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Megaphone className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="text-sm">Create a campaign to send bulk messages</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const cfg = statusConfig[campaign.status] || statusConfig.draft;
              const StatusIcon = cfg.icon;
              const progress = campaign.stats.total > 0
                ? Math.round((campaign.stats.sent / campaign.stats.total) * 100)
                : 0;

              return (
                <div
                  key={campaign._id}
                  className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          {campaign.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className={`h-3 w-3 ${campaign.status === "processing" ? "animate-spin" : ""}`} />
                          {campaign.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Template: <span className="font-medium">{campaign.templateName}</span>
                        {" · "}
                        Audience: <span className="font-medium capitalize">{campaign.audienceType}</span>
                        {campaign.scheduledAt && (
                          <>
                            {" · "}
                            Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {campaign.status === "draft" && (
                        <Button size="sm" onClick={() => handleLaunch(campaign._id)}>
                          <Play className="mr-1 h-3.5 w-3.5" />
                          Launch
                        </Button>
                      )}
                      {(campaign.status === "draft" || campaign.status === "processing") && (
                        <Button size="sm" variant="outline" onClick={() => handleCancel(campaign._id)}>
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  {campaign.stats.total > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{campaign.stats.sent} / {campaign.stats.total} sent</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span>Delivered: {campaign.stats.delivered}</span>
                        <span>Read: {campaign.stats.read}</span>
                        <span className="text-red-500">Failed: {campaign.stats.failed}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template *</label>
                <select
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select template...</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t.name}>
                      {t.name} ({t.language})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Audience</label>
                <select
                  value={audienceType}
                  onChange={(e) => setAudienceType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Contacts</option>
                  <option value="tags">By Tags</option>
                  <option value="groups">By Groups</option>
                </select>
              </div>
              {(audienceType === "tags" || audienceType === "groups") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {audienceType === "tags" ? "Tags" : "Groups"} (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsFilter}
                    onChange={(e) => setTagsFilter(e.target.value)}
                    placeholder="vip, wholesale"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
