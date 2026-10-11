"use client";

import React from "react";
import { ScanProvider } from "@/components/scan/scan-store";
import { SettingsProvider } from "@/hooks/use-settings-store";
import { MarketplaceProvider } from "@/hooks/use-marketplace-store";
import { MessagingProvider } from "@/hooks/use-messaging-store";
import { AuthProvider } from "@/hooks/use-auth-store";
import { ThemeProvider } from "@/hooks/use-theme";
import { ReportsProvider } from "@/hooks/use-reports-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <MarketplaceProvider>
            <MessagingProvider>
              <ScanProvider>
                <ReportsProvider>{children}</ReportsProvider>
              </ScanProvider>
            </MessagingProvider>
          </MarketplaceProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
