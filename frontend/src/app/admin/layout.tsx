"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { Sidebar } from "@/components/layout/Sidebar";
import { Spinner } from "@/components/ui/spinner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth(true, "admin");

  // Initialize socket listeners
  useSocket();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
