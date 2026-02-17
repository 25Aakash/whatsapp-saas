"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, MessageSquarePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useChatStore, type Conversation } from "@/store";
import { cn, formatTime, truncate, getInitials } from "@/lib/utils";

export function ConversationList() {
  const {
    conversations,
    selectedConversation,
    isLoadingConversations,
    loadConversations,
    selectConversation,
    setSearchQuery,
  } = useChatStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setSearchQuery(value);
      // Debounced search
      const timer = setTimeout(() => {
        loadConversations(value || undefined);
      }, 300);
      return () => clearTimeout(timer);
    },
    [loadConversations, setSearchQuery]
  );

  return (
    <div className="flex h-full w-80 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Chats
        </h2>
        <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 bg-gray-50 dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations && conversations.length === 0 ? (
          <Spinner className="py-8" />
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              isSelected={selectedConversation?._id === conv._id}
              onSelect={() => selectConversation(conv)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
        isSelected && "bg-emerald-50 dark:bg-emerald-900/20"
      )}
    >
      {/* Avatar */}
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        {getInitials(conversation.customerName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {conversation.customerName}
          </span>
          <span className="ml-2 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
            {formatTime(conversation.lastMessage?.timestamp)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="truncate text-xs text-gray-500 dark:text-gray-400">
            {conversation.lastMessage?.direction === "outbound" && (
              <span className="text-gray-400">You: </span>
            )}
            {truncate(conversation.lastMessage?.body || "", 40)}
          </span>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
