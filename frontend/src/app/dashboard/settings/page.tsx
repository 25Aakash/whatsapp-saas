"use client";

import { useAuthStore } from "@/store";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { User, Key, Building2 } from "lucide-react";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <Header title="Settings" subtitle="View your account details" />
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        {/* Profile */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profile
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Name</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Role</span>
              <Badge variant="default">
                {user?.role === "customer" ? "Owner" : user?.role === "customer_agent" ? "Team Member" : user?.role}
              </Badge>
            </div>
          </div>
        </section>

        {/* Business Info */}
        {user?.tenant && typeof user.tenant === "object" && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Business
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Business Name</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.tenant.name}
                </span>
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

        {/* API Info */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              API Information
            </h2>
          </div>
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
    </>
  );
}
