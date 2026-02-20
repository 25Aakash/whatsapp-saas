"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { tenantAPI } from "@/lib/api";
import type { Tenant } from "@/store";
import {
  Building2,
  Phone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Link as LinkIcon,
  Wifi,
  WifiOff,
  Shield,
  Activity,
} from "lucide-react";

export default function TenantsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadMyAccount = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await tenantAPI.getMyAccount();
      setTenant(res.data.data?.tenant || res.data.data || null);
    } catch {
      // Tenant may not exist yet — that's fine
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyAccount();
  }, [loadMyAccount]);

  const handleConnectWhatsApp = () => {
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

    if (!configId) {
      setError(
        "Meta Config ID is required. Please configure NEXT_PUBLIC_META_CONFIG_ID in your environment variables."
      );
      return;
    }

    // Wait for FB SDK to load (up to 10 seconds)
    setError("");
    setIsConnecting(true);

    const waitForFB = (): Promise<void> =>
      new Promise((resolve, reject) => {
        if (window.FB) return resolve();
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 200;
          if (window.FB) { clearInterval(interval); resolve(); }
          else if (elapsed >= 10000) { clearInterval(interval); reject(new Error("timeout")); }
        }, 200);
      });

    waitForFB()
      .then(() => {
        window.FB.login(
          (response) => {
            if (response.authResponse?.code) {
              tenantAPI
                .embeddedSignup(response.authResponse.code)
                .then(() => {
                  loadMyAccount();
                  setError("");
                })
                .catch((err) => {
                  const msg =
                    err?.response?.data?.message ||
                    "Failed to connect WhatsApp Business Account. Please try again.";
                  setError(msg);
                })
                .finally(() => setIsConnecting(false));
            } else {
              setError("WhatsApp signup was cancelled or failed. Please try again.");
              setIsConnecting(false);
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
      })
      .catch(() => {
        setError(
          "Facebook SDK failed to load. Check that NEXT_PUBLIC_META_APP_ID is configured and that connect.facebook.net is not blocked by your browser or ad-blocker."
        );
        setIsConnecting(false);
      });
  };

  const handleCheckHealth = async () => {
    try {
      setHealthStatus(null);
      const res = await tenantAPI.checkMyStatus();
      const health = res.data.data?.health || res.data.data;
      setHealthStatus(
        `Status: ${health?.status || "unknown"}\n${health?.phoneNumber || health?.message || ""}`
      );
    } catch {
      setHealthStatus("Health check failed — the API may be unreachable.");
    }
  };

  const isConnected = tenant?.onboardingStatus === "connected";

  return (
    <>
      <Header
        title="WhatsApp Connection"
        subtitle="Connect and manage your WhatsApp Business Account"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {isLoading ? (
            <Spinner className="py-12" />
          ) : !tenant || !isConnected ? (
            /* ── Not connected ── */
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-900">
              <WifiOff className="mx-auto h-14 w-14 text-gray-300 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                WhatsApp Not Connected
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Connect your WhatsApp Business Account to start sending and
                receiving messages. You&apos;ll be redirected to Meta&apos;s
                Embedded Signup flow.
              </p>
              <Button
                onClick={handleConnectWhatsApp}
                disabled={isConnecting}
                className="mt-6 gap-2"
                size="lg"
              >
                <LinkIcon className="h-4 w-4" />
                {isConnecting ? "Connecting..." : "Connect WhatsApp"}
              </Button>
            </div>
          ) : (
            /* ── Connected ── */
            <>
              {/* Account card */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                      <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tenant.name}
                      </h3>
                      <Badge variant="default" className="mt-1 gap-1">
                        <Wifi className="h-3 w-3" />
                        Connected
                      </Badge>
                    </div>
                  </div>
                  {tenant.isActive ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-400" />
                  )}
                </div>

                {/* Details */}
                <div className="mt-6 space-y-3">
                  {tenant.displayPhoneNumber && (
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="h-4 w-4 text-gray-400" />
                        Phone Number
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {tenant.displayPhoneNumber}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Shield className="h-4 w-4 text-gray-400" />
                      Plan
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {tenant.plan}
                    </Badge>
                  </div>

                  {tenant.qualityRating && tenant.qualityRating !== "UNKNOWN" && (
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Activity className="h-4 w-4 text-gray-400" />
                        Quality Rating
                      </div>
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
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCheckHealth}
                    className="gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    Check Health
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={loadMyAccount}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleConnectWhatsApp}
                    disabled={isConnecting}
                    className="gap-2 ml-auto"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {isConnecting ? "Reconnecting..." : "Reconnect"}
                  </Button>
                </div>

                {/* Health status */}
                {healthStatus && (
                  <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 whitespace-pre-line dark:bg-blue-900/20 dark:text-blue-300">
                    {healthStatus}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
