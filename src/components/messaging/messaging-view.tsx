"use client";

import React, { useEffect, useState } from "react";
import { ConversationList } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import { useMessagingStore, type Conversation } from "@/hooks/use-messaging-store";
import { MessageCircle } from "lucide-react";

interface MessagingViewProps {
  onViewProduct?: (productId: string) => void;
  initialConversationId?: string;
}

export function MessagingView({ onViewProduct, initialConversationId }: MessagingViewProps) {
  const { getConversation, loadMessages, markAsRead, conversations } = useMessagingStore();
  const [selectedId, setSelectedId] = useState<string | undefined>(initialConversationId);
  const [showChat, setShowChat] = useState(!!initialConversationId);

  const selectedConversation: Conversation | undefined = selectedId
    ? getConversation(selectedId)
    : undefined;

  // When the store finishes loading conversations, auto-select the one from
  // the ?conversation= query param and load its messages.
  useEffect(() => {
    if (selectedId && selectedConversation && showChat) {
      loadMessages(selectedId);
      if (selectedConversation.unreadCount > 0) {
        markAsRead(selectedId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedConversation?.id, selectedConversation?.unreadCount, conversations.length]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setShowChat(true);
    loadMessages(conversation.id);
    if (conversation.unreadCount > 0) {
      markAsRead(conversation.id);
    }
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedId(undefined);
  };

  return (
    <div className="h-[calc(100vh-12rem)] border rounded-lg overflow-hidden bg-background">
      <div className="grid md:grid-cols-[350px_1fr] h-full">
        {/* Conversation List - Hidden on mobile when chat is open */}
        <div className={`border-r ${showChat ? "hidden md:block" : "block"}`}>
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </h2>
          </div>
          <div className="h-[calc(100%-60px)]">
            <ConversationList
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
            />
          </div>
        </div>

        {/* Chat Window */}
        <div className={`${showChat ? "block" : "hidden md:block"}`}>
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              onBack={handleBack}
              onViewProduct={onViewProduct}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
              <p className="text-muted-foreground max-w-sm">
                Select a conversation to start chatting with sellers and buyers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
