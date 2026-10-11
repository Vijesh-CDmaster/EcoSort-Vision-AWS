"use client";

import React, { Suspense } from "react";
import { MessagingView } from "@/components/messaging/messaging-view";
import { useRouter, useSearchParams } from "next/navigation";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversation") ?? undefined;

  const handleViewProduct = (productId: string) => {
    router.push(`/marketplace?product=${productId}`);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Messages
        </h1>
        <p className="text-muted-foreground">
          Chat with buyers and sellers in the marketplace.
        </p>
      </div>

      <MessagingView onViewProduct={handleViewProduct} initialConversationId={initialConversationId} />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}
