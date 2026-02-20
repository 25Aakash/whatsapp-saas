"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MessageSquare, Shield, Zap } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading, loadUser, user, requires2FA, pendingLoginEmail, pendingLoginPassword, clear2FA } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Role-based redirect
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (requires2FA && pendingLoginEmail && pendingLoginPassword) {
        await login(pendingLoginEmail, pendingLoginPassword, twoFactorToken);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-emerald-600 p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg font-bold">
              W
            </div>
            <span className="text-2xl font-bold">WA SaaS</span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight">
            WhatsApp Business
            <br />
            at Scale
          </h1>
          <p className="mt-4 text-lg text-emerald-100">
            Connect your WhatsApp Business Account and start messaging your
            customers in minutes. Self-serve platform built for growth.
          </p>

          <div className="mt-10 space-y-6">
            <Feature
              icon={<MessageSquare className="h-6 w-6" />}
              title="Self-Serve Onboarding"
              desc="Connect your WhatsApp Business in minutes with Embedded Signup"
            />
            <Feature
              icon={<Zap className="h-6 w-6" />}
              title="Real-Time Messaging"
              desc="Send and receive messages with live delivery status"
            />
            <Feature
              icon={<Shield className="h-6 w-6" />}
              title="Enterprise Security"
              desc="Encrypted credentials, team roles, and access controls"
            />
          </div>
        </div>

        <p className="text-sm text-emerald-200">
          Powered by WhatsApp Cloud API
        </p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex w-full items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white text-lg font-bold">
                W
              </div>
              <span className="text-2xl font-bold text-gray-900">WA SaaS</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {requires2FA && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Two-Factor Code
                </label>
                <Input
                  type="text"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  placeholder="Enter 6-digit code from authenticator"
                  required
                  autoFocus
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the code from your authenticator app.{" "}
                  <button type="button" onClick={clear2FA} className="text-emerald-600 hover:underline">
                    Back to login
                  </button>
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <a href="/register" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              Sign up for free
            </a>
          </p>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
            <a href="/privacy" className="hover:text-gray-600 transition-colors">
              Privacy Policy
            </a>
            <span>|</span>
            <a href="/terms" className="hover:text-gray-600 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-emerald-100">{desc}</p>
      </div>
    </div>
  );
}
