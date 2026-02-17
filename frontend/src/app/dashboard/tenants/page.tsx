"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { tenantAPI } from "@/lib/api";
import type { Tenant } from "@/store";
import {
  Plus,
  Building2,
  Phone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const res = await tenantAPI.list();
      setTenants(res.data.data.tenants || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await tenantAPI.create(newName.trim());
      setNewName("");
      setShowCreate(false);
      loadTenants();
    } catch {
      // ignore
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectWhatsApp = () => {
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

    if (!configId) {
      alert(
        "Meta Config ID is required. Please configure NEXT_PUBLIC_META_CONFIG_ID in your environment variables."
      );
      return;
    }

    if (typeof window === "undefined" || !window.FB) {
      alert(
        "Facebook SDK not loaded yet. Please ensure NEXT_PUBLIC_META_APP_ID is configured and try again in a moment."
      );
      return;
    }

    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          tenantAPI
            .embeddedSignup(response.authResponse.code)
            .then(() => {
              loadTenants();
              alert("WhatsApp Business Account connected successfully!");
            })
            .catch(() => {
              alert("Failed to connect WhatsApp Business Account. Please try again.");
            });
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const handleCheckHealth = async (tenantId: string) => {
    try {
      const res = await tenantAPI.checkStatus(tenantId);
      const health = res.data.data.health;
      alert(`Status: ${health.status}\n${health.phoneNumber || health.message || ""}`);
    } catch {
      alert("Health check failed");
    }
  };

  return (
    <>
      <Header
        title="Tenants"
        subtitle="Manage WhatsApp Business accounts"
      />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              New Tenant
            </Button>
            <Button variant="outline" onClick={handleConnectWhatsApp}>
              <LinkIcon className="h-4 w-4" />
              Connect WhatsApp
            </Button>
          </div>
          <Button variant="ghost" onClick={loadTenants}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Create New Tenant
            </h3>
            <div className="flex gap-3">
              <Input
                placeholder="Business name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Tenant list */}
        {isLoading ? (
          <Spinner className="py-8" />
        ) : tenants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-900">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No tenants yet
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Create a tenant and connect their WhatsApp Business Account
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <div
                key={tenant._id}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {tenant.name}
                      </h3>
                      <Badge
                        variant={
                          tenant.onboardingStatus === "connected"
                            ? "default"
                            : tenant.onboardingStatus === "error"
                            ? "destructive"
                            : "secondary"
                        }
                        className="mt-1"
                      >
                        {tenant.onboardingStatus}
                      </Badge>
                    </div>
                  </div>
                  {tenant.isActive ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>

                {tenant.displayPhoneNumber && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4" />
                    {tenant.displayPhoneNumber}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Badge variant="outline">{tenant.plan}</Badge>
                  {tenant.qualityRating && tenant.qualityRating !== "UNKNOWN" && (
                    <Badge
                      variant={
                        tenant.qualityRating === "GREEN"
                          ? "default"
                          : tenant.qualityRating === "YELLOW"
                          ? "warning"
                          : "destructive"
                      }
                    >
                      {tenant.qualityRating}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCheckHealth(tenant._id)}
                    className="text-xs"
                  >
                    Check Health
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
