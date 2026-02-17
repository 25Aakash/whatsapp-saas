"use client";

import { useState, useEffect } from "react";
import { templateAPI } from "@/lib/api";
import { RefreshCw, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
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
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync from Meta"}
        </Button>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
