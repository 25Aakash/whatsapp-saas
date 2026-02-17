"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Settings,
  LayoutDashboard,
  LogOut,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

const customerNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/conversations", icon: MessageSquare, label: "Conversations" },
  { href: "/dashboard/team", icon: Users, label: "Team" },
  { href: "/dashboard/templates", icon: FileText, label: "Templates" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const adminNavItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/conversations", icon: MessageSquare, label: "All Conversations" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? adminNavItems : customerNavItems;
  const baseHref = isAdmin ? "/admin" : "/dashboard";

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6 dark:border-gray-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
          W
        </div>
        <div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            WA SaaS
          </span>
          {isAdmin && (
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium dark:bg-purple-900/30 dark:text-purple-400">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== baseHref && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Tenant info for customers */}
      {!isAdmin && user?.tenant && (
        <div className="mx-3 mb-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Business</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {user.tenant.name}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={cn(
              "h-2 w-2 rounded-full",
              user.tenant.onboardingStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"
            )} />
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {user.tenant.onboardingStatus}
            </span>
          </div>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
            {user?.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {user?.name}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {user?.role === "admin" ? "Admin" : user?.role === "customer" ? "Owner" : "Team Member"}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
