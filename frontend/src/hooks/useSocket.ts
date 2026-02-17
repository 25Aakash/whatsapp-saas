"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useChatStore, type Message, type Conversation } from "@/store";

export function useSocket() {
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);
  const updateConversation = useChatStore((s) => s.updateConversation);
  const loadConversations = useChatStore((s) => s.loadConversations);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data: { message: Message; conversation?: Conversation }) => {
      addMessage(data.message);
      if (data.conversation) {
        updateConversation(data.conversation);
      }
      // Refresh conversation list for new conversations
      loadConversations();
    };

    const handleStatusUpdate = (data: { waMessageId: string; status: string }) => {
      updateMessageStatus(data.waMessageId, data.status);
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-status-update", handleStatusUpdate);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("message-status-update", handleStatusUpdate);
    };
  }, [addMessage, updateMessageStatus, updateConversation, loadConversations]);
}
