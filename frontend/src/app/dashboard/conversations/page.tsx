"use client";

import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function ConversationsPage() {
  return (
    <div className="flex h-full">
      <ConversationList />
      <ChatWindow />
    </div>
  );
}
