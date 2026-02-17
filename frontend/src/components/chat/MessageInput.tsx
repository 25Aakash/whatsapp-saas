"use client";

import { useState, useRef, useEffect } from "react";
import { Send, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messageAPI } from "@/lib/api";
import { useChatStore } from "@/store";
import { cn } from "@/lib/utils";

export function MessageInput() {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedConversation = useChatStore((s) => s.selectedConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const loadConversations = useChatStore((s) => s.loadConversations);

  // Check if 24h window is open
  const isWindowOpen =
    selectedConversation?.windowExpiresAt &&
    new Date(selectedConversation.windowExpiresAt) > new Date();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [text]);

  const handleSend = async () => {
    if (!text.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const res = await messageAPI.send(selectedConversation._id, text.trim());
      addMessage(res.data.data.message);
      setText("");
      loadConversations();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error("Send message error:", error.response?.data?.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!selectedConversation) return null;

  return (
    <div className="border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      {/* Window expired warning */}
      {!isWindowOpen && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            24-hour conversation window has expired. Send a template message to re-initiate.
          </span>
          <Button size="sm" variant="outline" className="ml-auto flex-shrink-0 h-7 text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Templates
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isWindowOpen ? "Type a message..." : "Send a template to start..."}
            disabled={!isWindowOpen || isSending}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white",
              (!isWindowOpen || isSending) && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={!text.trim() || !isWindowOpen || isSending}
          size="icon"
          className="h-10 w-10 rounded-xl flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
