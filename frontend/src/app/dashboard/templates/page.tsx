"use client";

import { useState, useEffect } from "react";
import { templateAPI } from "@/lib/api";
import { RefreshCw, FileText, CheckCircle, Clock, XCircle, Plus, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Template {
  _id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  previewText: string;
  lastSyncedAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState("MARKETING");
  const [tplLanguage, setTplLanguage] = useState("en_US");
  const [tplBody, setTplBody] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await templateAPI.list();
      setTemplates(res.data.data.templates || []);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await templateAPI.sync();
      await loadTemplates();
    } catch (err) {
      console.error("Failed to sync templates:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await templateAPI.create({
        name: tplName,
        category: tplCategory,
        language: tplLanguage,
        components: [{ type: "BODY", text: tplBody }],
      });
      setShowCreate(false);
      setTplName(""); setTplBody("");
      loadTemplates();
    } catch (err) {
      console.error("Failed to create template:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This will also delete it from Meta.")) return;
    try {
      await templateAPI.delete(id);
      loadTemplates();
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  const statusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Message Templates
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your WhatsApp message templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync from Meta"}
          </Button>
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mb-3 text-gray-200" />
          <p className="text-lg font-medium">No templates yet</p>
          <p className="text-sm mt-1">
            Click &quot;Sync from Meta&quot; to import your templates
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div
              key={tpl._id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {tpl.name}
                </h3>
                <div className="flex items-center gap-1.5">
                  {statusIcon(tpl.status)}
                  <span className="text-xs text-gray-500 capitalize">{tpl.status?.toLowerCase()}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-3">
                {tpl.previewText || "No preview available"}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{tpl.language}</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{tpl.category}</span>
                <button onClick={() => handleDelete(tpl._id)} className="ml-auto text-gray-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Template</h2>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Name *</label>
                <input required type="text" value={tplName} onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g. order_confirmation"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <select value={tplCategory} onChange={(e) => setTplCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                  <select value={tplLanguage} onChange={(e) => setTplLanguage(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                    <option value="en_US">English (US)</option>
                    <option value="en_GB">English (UK)</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="pt_BR">Portuguese (BR)</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Body Text *</label>
                <textarea required rows={4} value={tplBody} onChange={(e) => setTplBody(e.target.value)}
                  placeholder="Hello {{1}}, your order {{2}} is confirmed."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                <p className="mt-1 text-xs text-gray-400">Use {"{{1}}"}, {"{{2}}"} etc. for variables</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit to Meta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
