"use client";

import { cn } from "@/lib/utils";
import { StatusIndicator } from "./StatusIndicator";
import type { Message } from "@/store";
import { AlertCircle, FileText, Image as ImageIcon, Mic, Video } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex w-full mb-1",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm",
          isOutbound
            ? "bg-emerald-600 text-white rounded-br-md"
            : "bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 rounded-bl-md"
        )}
      >
        {/* Media indicator */}
        {message.type !== "text" && message.type !== "template" && (
          <MediaIndicator type={message.type} isOutbound={isOutbound} />
        )}

        {/* Template indicator */}
        {message.type === "template" && (
          <div
            className={cn(
              "mb-1 flex items-center gap-1 text-xs font-medium",
              isOutbound ? "text-emerald-200" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            Template: {message.templateName}
          </div>
        )}

        {/* Message body */}
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>

        {/* Error info */}
        {message.status === "failed" && message.errorInfo && (
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              isOutbound ? "text-red-200" : "text-red-500"
            )}
          >
            <AlertCircle className="h-3 w-3" />
            {message.errorInfo.title || "Failed to send"}
          </div>
        )}

        {/* Time + Status */}
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1",
            isOutbound ? "text-emerald-200" : "text-gray-400"
          )}
        >
          <span className="text-[10px]">{time}</span>
          {isOutbound && <StatusIndicator status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function MediaIndicator({ type, isOutbound }: { type: string; isOutbound: boolean }) {
  const iconClass = cn("h-4 w-4 mr-1", isOutbound ? "text-emerald-200" : "text-gray-400");

  switch (type) {
    case "image":
      return (
        <div className="mb-1 flex items-center text-xs">
          <ImageIcon className={iconClass} />
          Photo
        </div>
      );
    case "video":
      return (
        <div className="mb-1 flex items-center text-xs">
          <Video className={iconClass} />
          Video
        </div>
      );
    case "audio":
      return (
        <div className="mb-1 flex items-center text-xs">
          <Mic className={iconClass} />
          Audio
        </div>
      );
    case "document":
      return (
        <div className="mb-1 flex items-center text-xs">
          <FileText className={iconClass} />
          Document
        </div>
      );
    default:
      return null;
  }
}
