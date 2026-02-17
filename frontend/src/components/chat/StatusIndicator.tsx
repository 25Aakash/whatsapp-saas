"use client";

import { Check, CheckCheck, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: string;
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  switch (status) {
    case "pending":
      return <Clock className={cn("h-3.5 w-3.5 text-gray-400", className)} />;
    case "sent":
      return <Check className={cn("h-3.5 w-3.5 text-gray-400", className)} />;
    case "delivered":
      return <CheckCheck className={cn("h-3.5 w-3.5 text-gray-400", className)} />;
    case "read":
      return <CheckCheck className={cn("h-3.5 w-3.5 text-blue-500", className)} />;
    case "failed":
      return <X className={cn("h-3.5 w-3.5 text-red-500", className)} />;
    default:
      return null;
  }
}
