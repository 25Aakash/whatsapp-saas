"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";

export function useAuth(requireAuth = true, requiredRole?: "admin" | "customer" | "customer_agent") {
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      router.push("/");
      return;
    }

    if (isAuthenticated && user && requiredRole) {
      // Role-based redirect
      if (requiredRole === "admin" && user.role !== "admin") {
        router.push("/dashboard");
      } else if (requiredRole === "customer" && user.role === "admin") {
        router.push("/admin");
      }
    }
  }, [isLoading, requireAuth, isAuthenticated, user, requiredRole, router]);

  return { user, isAuthenticated, isLoading };
}
