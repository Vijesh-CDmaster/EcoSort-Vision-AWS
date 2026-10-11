"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  useMessagingStore, 
  type Conversation,
  type Message 
} from "@/hooks/use-messaging-store";
import { 
  ArrowLeft, 
  ImagePlus, 
  Package, 
  Send, 
  MoreVertical,
  Phone,
  Video,
  Info
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatWindowProps {
  conversation: Conversation;
  onBack?: () => void;
  onViewProduct?: (productId: string) => void;
}

export function ChatWindow({ conversation, onBack, onViewProduct }: ChatWindowProps) {
  const { 
    getMessages, 
    sendMessage, 
    markAsRead, 
    currentUserId,
    deleteConversation 
  } = useMessagingStore();
  
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = getMessages(conversation.id);
  const otherParticipant = conversation.participants.find((p) => p.id !== currentUserId);

  // Mark as read when opening conversation
  useEffect(() => {
    if (conversation.unreadCount > 0) {
      markAsRead(conversation.id);
    }
  }, [conversation.id, conversation.unreadCount, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation.id]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    
    sendMessage(conversation.id, messageInput.trim());
    setMessageInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateSeparator = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return messageDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  messages.forEach((message) => {
    const messageDate = formatDateSeparator(message.timestamp);
    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groupedMessages.push({ date: messageDate, messages: [message] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-3 flex-1">
          {conversation.productImage ? (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
              <Image
                src={conversation.productImage}
                alt={conversation.productTitle || "Product"}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">
                {otherParticipant?.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{otherParticipant?.name}</h3>
            {conversation.productTitle && (
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => conversation.productId && onViewProduct?.(conversation.productId)}
              >
                <Package className="h-3 w-3" />
                <span className="truncate">{conversation.productTitle}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Video className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {conversation.productId && (
                <DropdownMenuItem onClick={() => onViewProduct?.(conversation.productId!)}>
                  <Package className="h-4 w-4 mr-2" />
                  View Product
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Info className="h-4 w-4 mr-2" />
                Contact Info
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => {
                  deleteConversation(conversation.id);
                  onBack?.();
                }}
              >
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {/* Product Context Card */}
        {conversation.productTitle && conversation.productImage && (
          <div 
            className="mb-4 p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
            onClick={() => conversation.productId && onViewProduct?.(conversation.productId)}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md overflow-hidden bg-muted">
                <Image
                  src={conversation.productImage}
                  alt={conversation.productTitle}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium text-sm">{conversation.productTitle}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  View Product Details
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                  {group.date}
                </div>
              </div>

              {/* Messages in group */}
              <div className="space-y-2">
                {group.messages.map((message) => {
                  const isOwn = message.senderId === currentUserId;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!messageInput.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
