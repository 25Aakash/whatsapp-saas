"use client";

import { useState, useEffect } from "react";
import { analyticsAPI } from "@/lib/api";
import { useAuthStore } from "@/store";
import { Header } from "@/components/layout/Header";
import {
  MessageSquare,
  MessagesSquare,
  Clock,
  Key,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  BarChart3,
  CreditCard,
} from "lucide-react";

type Range = "7d" | "30d" | "90d";

interface DashboardStats {
  conversations: { total: number; open: number };
  messages: { total: number; inbound: number; outbound: number };
  contacts: number;
}

interface VolumeEntry {
  date: string;
  inbound: number;
  outbound: number;
  total: number;
}

interface UsageData {
  period?: string;
  messages: {
    inbound?: number;
    outbound?: number;
    template?: number;
    total: number;
  };
  apiCalls: {
    total: number;
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function AnalyticsPage() {
  const user = useAuthStore((s) => s.user);

  const [range, setRange] = useState<Range>("7d");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [volume, setVolume] = useState<VolumeEntry[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const startDate = daysAgo(days);
    const endDate = new Date().toISOString().slice(0, 10);
    const params = { startDate, endDate };

    async function fetchData() {
      setLoading(true);
      try {
        const [dashRes, volRes, usageRes] = await Promise.all([
          analyticsAPI.dashboard(params),
          analyticsAPI.messageVolume(params),
          analyticsAPI.usage(),
        ]);
        setStats(dashRes.data.data);
        setVolume(volRes.data.data?.volume || volRes.data.data || []);
        setUsage(usageRes.data.data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [range]);

  const rangeButtons: { label: string; value: Range }[] = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "Last 90 days", value: "90d" },
  ];

  const maxVolume = Math.max(...volume.map((v) => v.total), 1);

  // Determine plan limits (rough defaults)
  const plan = (user?.tenant && typeof user.tenant === "object" ? user.tenant.plan : "free") || "free";
  const planLimits: Record<string, { messages: number; apiCalls: number }> = {
    free: { messages: 1000, apiCalls: 5000 },
    starter: { messages: 5000, apiCalls: 25000 },
    professional: { messages: 25000, apiCalls: 100000 },
    enterprise: { messages: 100000, apiCalls: 500000 },
  };
  const limits = planLimits[plan] || planLimits.free;

  return (
    <>
      <Header title="Analytics" subtitle="Track your messaging performance" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Date range filter */}
        <div className="flex items-center gap-2">
          {rangeButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setRange(btn.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                range === btn.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Messages */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Messages
                  </span>
                  <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/30">
                    <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                  {(stats?.messages?.total ?? 0).toLocaleString()}
                </p>
              </div>

              {/* Active Conversations */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Active Conversations
                  </span>
                  <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
                    <MessagesSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                  {(stats?.conversations?.open ?? 0).toLocaleString()}
                </p>
              </div>

              {/* Avg Response Time */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Contacts
                  </span>
                  <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/30">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                  {(stats?.contacts ?? 0).toLocaleString()}
                </p>
              </div>

              {/* API Calls */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    API Calls
                  </span>
                  <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-900/30">
                    <Key className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
                  {(usage?.apiCalls?.total ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* ── Message Volume ── */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Message Volume
                </h2>
              </div>

              {volume.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No message data for the selected period.
                </p>
              ) : (
                <>
                  {/* Legend */}
                  <div className="mb-4 flex items-center gap-5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                      Inbound
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
                      Outbound
                    </span>
                  </div>

                  <div className="space-y-3">
                    {volume.map((entry) => {
                      const pctInbound = (entry.inbound / maxVolume) * 100;
                      const pctOutbound = (entry.outbound / maxVolume) * 100;
                      return (
                        <div key={entry.date} className="group">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {entry.date}
                            </span>
                            <span className="text-gray-400">
                              {entry.total.toLocaleString()} total
                            </span>
                          </div>
                          <div className="flex gap-1 h-5">
                            <div
                              className="rounded bg-emerald-500 transition-all group-hover:opacity-80"
                              style={{ width: `${pctInbound}%`, minWidth: entry.inbound > 0 ? "4px" : 0 }}
                              title={`Inbound: ${entry.inbound}`}
                            />
                            <div
                              className="rounded bg-blue-500 transition-all group-hover:opacity-80"
                              style={{ width: `${pctOutbound}%`, minWidth: entry.outbound > 0 ? "4px" : 0 }}
                              title={`Outbound: ${entry.outbound}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* ── Usage / Billing ── */}
            {usage && (
              <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Current Period Usage
                  </h2>
                  <span className="ml-auto rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">
                    {plan} plan
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Messages usage */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Messages</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {(usage.messages.total ?? 0).toLocaleString()} / {limits.messages.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(((usage.messages.total ?? 0) / limits.messages) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-400">
                      <span>Inbound: {(usage.messages.inbound ?? 0).toLocaleString()}</span>
                      <span>Outbound: {(usage.messages.outbound ?? 0).toLocaleString()}</span>
                      <span>Template: {(usage.messages.template ?? 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* API Calls usage */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">API Calls</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {usage.apiCalls.total.toLocaleString()} / {limits.apiCalls.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${Math.min((usage.apiCalls.total / limits.apiCalls) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {usage.period && (
                  <p className="mt-4 text-xs text-gray-400">
                    Billing period: {usage.period}
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
