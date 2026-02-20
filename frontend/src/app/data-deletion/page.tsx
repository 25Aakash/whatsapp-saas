"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

function DataDeletionContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Status lookup state (when redirected from Meta's data deletion callback)
  const [statusData, setStatusData] = useState<{
    confirmation_code: string;
    status: string;
    message: string;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  // If a confirmation code is in the URL, look up the deletion status
  useEffect(() => {
    if (codeFromUrl) {
      setStatusLoading(true);
      api
        .get(`/data-deletion/status?code=${encodeURIComponent(codeFromUrl)}`)
        .then((res) => {
          setStatusData(res.data);
        })
        .catch(() => {
          setStatusError("Unable to retrieve deletion status. Please contact support.");
        })
        .finally(() => {
          setStatusLoading(false);
        });
    }
  }, [codeFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError("");

    try {
      const res = await api.post("/data-deletion/by-email", { email });
      setConfirmationCode(res.data.confirmation_code || `DEL-${Date.now().toString(36).toUpperCase()}`);
      setSubmitted(true);
    } catch {
      setError("Failed to process deletion request. Please try again or contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              W
            </div>
            <span className="text-xl font-bold text-gray-900">Karssoft Connect</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-6 py-16">
        {/* Status lookup view (when redirected from Meta's callback) */}
        {codeFromUrl ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900">Data Deletion Status</h1>
            {statusLoading ? (
              <div className="mt-8 flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              </div>
            ) : statusError ? (
              <div className="mt-8 rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-red-700">
                {statusError}
              </div>
            ) : statusData ? (
              <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                  {statusData.status === "completed" ? "Deletion Complete" : "Deletion In Progress"}
                </h2>
                <p className="mt-2 text-sm text-gray-600">{statusData.message}</p>
                <p className="mt-4 text-xs text-gray-500">
                  Confirmation Code: {statusData.confirmation_code}
                </p>
              </div>
            ) : null}

            <div className="mt-8">
              <p className="text-sm text-gray-600">
                Want to submit a new deletion request?{" "}
                <Link href="/data-deletion" className="text-emerald-600 hover:underline">
                  Click here
                </Link>
              </p>
            </div>
          </>
        ) : (
        <>
        <h1 className="text-3xl font-bold text-gray-900">Data Deletion Request</h1>
        <p className="mt-3 text-gray-600">
          In accordance with our{" "}
          <Link href="/privacy" className="text-emerald-600 hover:underline">
            Privacy Policy
          </Link>
          , you can request deletion of all data associated with your account. This includes
          your profile information, conversation history, message data, and any stored WhatsApp
          Business Account credentials.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address associated with your account
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason for deletion (optional)
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                rows={3}
                placeholder="Please let us know why you'd like your data deleted..."
              />
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <p className="font-medium">Please note:</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Data deletion is permanent and cannot be undone</li>
                <li>All conversations and messages will be permanently removed</li>
                <li>WhatsApp Business Account credentials will be securely erased</li>
                <li>Processing may take up to 30 days</li>
              </ul>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Submit Deletion Request"
              )}
            </Button>
          </form>
        ) : (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              Request Submitted
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              We have received your data deletion request for <strong>{email}</strong>.
              Your data has been permanently deleted from our systems.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              Reference ID: {confirmationCode}
            </p>
          </div>
        )}

        <div className="mt-10 rounded-lg bg-gray-50 p-6">
          <h3 className="font-medium text-gray-900">Alternative contact methods</h3>
          <p className="mt-2 text-sm text-gray-600">
            You can also request data deletion by emailing us directly at{" "}
            <a href="mailto:privacy@whatsapp-saas.com" className="text-emerald-600 hover:underline">
              privacy@whatsapp-saas.com
            </a>{" "}
            with the subject line &quot;Data Deletion Request&quot;.
          </p>
        </div>
        </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="mt-3">&copy; {new Date().getFullYear()} Karssoft Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function DataDeletionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>}>
      <DataDeletionContent />
    </Suspense>
  );
}
