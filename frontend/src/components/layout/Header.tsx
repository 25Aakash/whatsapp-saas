"use client";

import { Bell } from "lucide-react";
import { useAuthStore } from "@/store";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
        </button>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {user?.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user?.tenant && typeof user.tenant === "object" ? user.tenant.name : "Platform"}
          </p>
        </div>
      </div>
    </header>
  );
}
