"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-3 text-gray-600">
          An unexpected error occurred. Please try again or contact support if the
          problem persists.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go to login
          </Button>
        </div>
      </div>
    </div>
  );
}
