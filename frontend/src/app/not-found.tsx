import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <span className="text-3xl font-bold text-gray-400">404</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-3 text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
