"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function DeletionStatusPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [statusData, setStatusData] = useState<{
    confirmation_code: string;
    status: string;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) {
      setError("No confirmation code provided.");
      setLoading(false);
      return;
    }

    api
      .get(`/data-deletion/status?code=${encodeURIComponent(code)}`)
      .then((res) => {
        setStatusData(res.data);
      })
      .catch(() => {
        setError("Unable to retrieve deletion status. Please contact support.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              W
            </div>
            <span className="text-xl font-bold text-gray-900">WA SaaS</span>
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
        <h1 className="text-3xl font-bold text-gray-900">Data Deletion Status</h1>

        {loading ? (
          <div className="mt-8 flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-red-700">
            {error}
          </div>
        ) : statusData ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              {statusData.status === "completed" ? (
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              )}
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

        <div className="mt-10 rounded-lg bg-gray-50 p-6">
          <h3 className="font-medium text-gray-900">Need help?</h3>
          <p className="mt-2 text-sm text-gray-600">
            If you have questions about your data deletion request, contact us at{" "}
            <a href="mailto:privacy@whatsapp-saas.com" className="text-emerald-600 hover:underline">
              privacy@whatsapp-saas.com
            </a>
            {code && (
              <> and include your confirmation code: <strong>{code}</strong></>
            )}
          </p>
        </div>
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
          <p className="mt-3">&copy; {new Date().getFullYear()} WA SaaS Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
