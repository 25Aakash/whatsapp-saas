"use client";

import { useState, useEffect } from "react";
import { tenantAPI } from "@/lib/api";
import { useAuthStore, Tenant } from "@/store";
import { Users, MessageSquare, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const res = await tenantAPI.list();
      setTenants(res.data.data.tenants || []);
    } catch (err) {
      console.error("Failed to load tenants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const connected = tenants.filter((t) => t.onboardingStatus === "connected").length;
  const pending = tenants.filter((t) => t.onboardingStatus !== "connected").length;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back, {user?.name}. Here&apos;s your platform overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          icon={<Users className="h-6 w-6 text-blue-600" />}
          label="Total Customers"
          value={tenants.length}
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6 text-emerald-600" />}
          label="Connected"
          value={connected}
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatCard
          icon={<Clock className="h-6 w-6 text-amber-600" />}
          label="Pending Setup"
          value={pending}
          bg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          icon={<MessageSquare className="h-6 w-6 text-purple-600" />}
          label="Platform"
          value="Active"
          bg="bg-purple-50 dark:bg-purple-900/20"
          isText
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/admin/customers"
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">View All Customers</p>
                <p className="text-xs text-gray-500">Manage customer accounts and WABA connections</p>
              </div>
            </Link>
            <Link
              href="/admin/conversations"
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">All Conversations</p>
                <p className="text-xs text-gray-500">View conversations across all customers</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Customers
            </h2>
            <button
              onClick={loadTenants}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No customers yet. They&apos;ll appear here when they register.
            </p>
          ) : (
            <div className="space-y-3">
              {tenants.slice(0, 5).map((tenant) => (
                <div key={tenant._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {tenant.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tenant.displayPhoneNumber || "No phone"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={tenant.onboardingStatus} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
  isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
  isText?: boolean;
}) {
  return (
    <div className={`rounded-xl ${bg} p-6`}>
      <div className="flex items-center justify-between">
        {icon}
      </div>
      <p className={`mt-4 ${isText ? "text-xl" : "text-3xl"} font-bold text-gray-900 dark:text-white`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle className="h-3 w-3" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <AlertCircle className="h-3 w-3" />
      Pending
    </span>
  );
}
