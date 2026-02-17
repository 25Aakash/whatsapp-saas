"use client";

import { useEffect, useRef } from "react";
import { Phone, MoreVertical, Clock, User as UserIcon } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useChatStore } from "@/store";
import { getInitials } from "@/lib/utils";
import { joinConversation, leaveConversation } from "@/lib/socket";

export function ChatWindow() {
  const selectedConversation = useChatStore((s) => s.selectedConversation);
  const messages = useChatStore((s) => s.messages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConvRef = useRef<string | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join/leave conversation room for real-time updates
  useEffect(() => {
    if (selectedConversation) {
      // Leave previous conversation
      if (prevConvRef.current && prevConvRef.current !== selectedConversation._id) {
        leaveConversation(prevConvRef.current);
      }
      joinConversation(selectedConversation._id);
      prevConvRef.current = selectedConversation._id;
    }
    return () => {
      if (prevConvRef.current) {
        leaveConversation(prevConvRef.current);
      }
    };
  }, [selectedConversation]);

  if (!selectedConversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Phone className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            WhatsApp SaaS Platform
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  const isWindowOpen =
    selectedConversation.windowExpiresAt &&
    new Date(selectedConversation.windowExpiresAt) > new Date();

  return (
    <div className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-800">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {getInitials(selectedConversation.customerName)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedConversation.customerName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedConversation.customerPhone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isWindowOpen ? (
            <Badge variant="default">
              <Clock className="mr-1 h-3 w-3" />
              Window Open
            </Badge>
          ) : (
            <Badge variant="warning">
              <Clock className="mr-1 h-3 w-3" />
              Window Expired
            </Badge>
          )}
          {selectedConversation.assignedAgent && (
            <Badge variant="secondary">
              <UserIcon className="mr-1 h-3 w-3" />
              {selectedConversation.assignedAgent.name}
            </Badge>
          )}
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {isLoadingMessages && messages.length === 0 ? (
          <Spinner className="py-8" />
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No messages yet. Start a conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg) => (
              <MessageBubble key={msg._id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <MessageInput />
    </div>
  );
}
