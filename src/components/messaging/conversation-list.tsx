"use client";

import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useMessagingStore, 
  type Conversation 
} from "@/hooks/use-messaging-store";
import { MessageCircle, Package, Trash2, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { conversations, deleteConversation, currentUserId } = useMessagingStore();

  const formatTime = (date?: Date) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit",
        hour12: true 
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      });
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.id !== currentUserId);
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No Conversations</h3>
        <p className="text-muted-foreground text-sm">
          Start a conversation by contacting a seller from the marketplace.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {conversations.map((conversation) => {
          const otherParticipant = getOtherParticipant(conversation);
          const isSelected = selectedId === conversation.id;

          return (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              }`}
              onClick={() => onSelect(conversation)}
            >
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {/* Avatar or Product Image */}
                  <div className="relative shrink-0">
                    {conversation.productImage ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                        <Image
                          src={conversation.productImage}
                          alt={conversation.productTitle || "Product"}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    {conversation.unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-sm truncate">
                        {otherParticipant?.name || "Unknown"}
                      </h4>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTime(conversation.lastMessageTime || conversation.createdAt)}
                      </span>
                    </div>

                    {conversation.productTitle && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Package className="h-3 w-3" />
                        <span className="truncate">{conversation.productTitle}</span>
                      </div>
                    )}

                    <p className={`text-sm mt-1 truncate ${
                      conversation.unreadCount > 0 
                        ? "font-medium text-foreground" 
                        : "text-muted-foreground"
                    }`}>
                      {conversation.lastMessage || "No messages yet"}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this conversation? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteConversation(conversation.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
