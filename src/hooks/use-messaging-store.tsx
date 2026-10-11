"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth-store";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
  type: "text" | "image" | "product-link";
  productId?: string;
}

export interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  productId?: string;
  productTitle?: string;
  productImage?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  createdAt: Date;
}

interface MessagingState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  currentUserId: string;
  currentUserName: string;
}

interface MessagingContextType extends MessagingState {
  // Conversations
  getConversation: (id: string) => Conversation | undefined;
  getOrCreateConversation: (
    sellerId: string,
    sellerName: string,
    productId?: string,
    productTitle?: string,
    productImage?: string
  ) => Promise<string>;
  deleteConversation: (id: string) => void;
  
  // Messages
  getMessages: (conversationId: string) => Message[];
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: Message["type"], productId?: string) => void;
  markAsRead: (conversationId: string) => void;
  
  // Stats
  getTotalUnreadCount: () => number;
  
  // User
  setCurrentUser: (id: string, name: string) => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

function normalizeMessage(m: any): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.senderName,
    content: m.content,
    timestamp: new Date(m.timestamp),
    read: !!m.read,
    type: m.type ?? "text",
    productId: m.productId ?? undefined,
  };
}

function normalizeConversation(c: any): Conversation {
  return {
    id: c.id,
    participants: Array.isArray(c.participants) ? c.participants : [],
    productId: c.productId ?? undefined,
    productTitle: c.productTitle ?? undefined,
    productImage: c.productImage ?? undefined,
    lastMessage: c.lastMessage ?? undefined,
    lastMessageTime: c.lastMessageTime ? new Date(c.lastMessageTime) : undefined,
    unreadCount: c.unreadCount ?? 0,
    createdAt: new Date(c.createdAt),
  };
}

const sortByActivity = (list: Conversation[]) =>
  [...list].sort((a, b) => {
    const timeA = a.lastMessageTime?.getTime() || a.createdAt.getTime();
    const timeB = b.lastMessageTime?.getTime() || b.createdAt.getTime();
    return timeB - timeA;
  });

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<MessagingState>({
    conversations: [],
    messages: {},
    currentUserId: "user-1",
    currentUserName: "You",
  });

  // Keep the current user in a ref so callbacks keep stable identities
  // (avoids the "maximum update depth" render loop).
  const userRef = useRef({ id: state.currentUserId, name: state.currentUserName });
  userRef.current = { id: state.currentUserId, name: state.currentUserName };

  // Sync the messaging identity from the auth store (demo or Clerk user).
  useEffect(() => {
    if (user) {
      setState((prev) => ({
        ...prev,
        currentUserId: user.id,
        currentUserName: user.name,
      }));
    }
  }, [user]);

  const loadConversations = useCallback(async () => {
    const uid = userRef.current.id;
    const res = await api.get<{ conversations: any[] }>(
      `/db/conversations?user_id=${encodeURIComponent(uid)}`
    );
    if (res.ok && res.data) {
      const conversations = sortByActivity(
        res.data.conversations.map(normalizeConversation)
      );
      setState((prev) => ({ ...prev, conversations }));
    }
  }, []);

  // Load conversations whenever the user changes.
  useEffect(() => {
    loadConversations();
  }, [loadConversations, state.currentUserId]);

  const getConversation = useCallback(
    (id: string) => state.conversations.find((c) => c.id === id),
    [state.conversations]
  );

  const getOrCreateConversation: MessagingContextType["getOrCreateConversation"] = useCallback(
    async (sellerId, sellerName, productId?, productTitle?, productImage?) => {
      const res = await api.post<{ id: string }>("/db/conversations", {
        buyerId: userRef.current.id,
        buyerName: userRef.current.name,
        sellerId,
        sellerName,
        productId,
        productTitle,
        productImage,
      });
      if (!res.ok || !res.data) {
        throw new Error(res.error || "Failed to create conversation");
      }
      await loadConversations();
      return res.data.id;
    },
    [loadConversations]
  );

  const deleteConversation = useCallback((id: string) => {
    setState((prev) => {
      const { [id]: removed, ...restMessages } = prev.messages;
      return {
        ...prev,
        conversations: prev.conversations.filter((c) => c.id !== id),
        messages: restMessages,
      };
    });
    api.del(`/db/conversations/${id}`);
  }, []);

  const getMessages = useCallback(
    (conversationId: string) => state.messages[conversationId] || [],
    [state.messages]
  );

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await api.get<{ messages: any[] }>(
      `/db/conversations/${conversationId}/messages`
    );
    if (res.ok && res.data) {
      const msgs = res.data.messages.map(normalizeMessage);
      setState((prev) => ({
        ...prev,
        messages: { ...prev.messages, [conversationId]: msgs },
      }));
    }
  }, []);

  const sendMessage: MessagingContextType["sendMessage"] = useCallback(
    (conversationId, content, type = "text", productId?) => {
      const { id: senderId, name: senderName } = userRef.current;
      api
        .post<any>(`/db/conversations/${conversationId}/messages`, {
          senderId,
          senderName,
          content,
          type,
          productId,
        })
        .then((res) => {
          if (res.ok && res.data) {
            const msg = normalizeMessage(res.data);
            setState((prev) => ({
              ...prev,
              conversations: sortByActivity(
                prev.conversations.map((c) =>
                  c.id === conversationId
                    ? { ...c, lastMessage: content, lastMessageTime: msg.timestamp }
                    : c
                )
              ),
              messages: {
                ...prev.messages,
                [conversationId]: [...(prev.messages[conversationId] || []), msg],
              },
            }));
          }
        });
    },
    []
  );

  const markAsRead = useCallback((conversationId: string) => {
    const uid = userRef.current.id;
    // Optimistically clear the badge immediately so effects don't re-fire
    // (this also prevents the historical "maximum update depth" crash).
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
      messages: {
        ...prev.messages,
        [conversationId]: (prev.messages[conversationId] || []).map((m) => ({
          ...m,
          read: true,
        })),
      },
    }));
    api
      .post<{ unreadCount: number }>(`/db/conversations/${conversationId}/read`, {
        userId: uid,
      })
      .then((res) => {
        if (res.ok && res.data) {
          setState((prev) => ({
            ...prev,
            conversations: prev.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, unreadCount: res.data!.unreadCount }
                : c
            ),
          }));
        }
      });
  }, []);

  const getTotalUnreadCount = useCallback(
    () => state.conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [state.conversations]
  );

  const setCurrentUser: MessagingContextType["setCurrentUser"] = useCallback((id, name) => {
    setState((prev) => ({ ...prev, currentUserId: id, currentUserName: name }));
  }, []);

  const contextValue = useMemo(
    () => ({
      ...state,
      getConversation,
      getOrCreateConversation,
      deleteConversation,
      getMessages,
      loadMessages,
      sendMessage,
      markAsRead,
      getTotalUnreadCount,
      setCurrentUser,
    }),
    [
      state,
      getConversation,
      getOrCreateConversation,
      deleteConversation,
      getMessages,
      loadMessages,
      sendMessage,
      markAsRead,
      getTotalUnreadCount,
      setCurrentUser,
    ]
  );

  return (
    <MessagingContext.Provider value={contextValue}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessagingStore() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessagingStore must be used within a MessagingProvider");
  }
  return context;
}
