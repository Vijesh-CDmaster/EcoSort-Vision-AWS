import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster"
import { AppProviders } from "@/components/providers/app-providers";
import { MainLayout } from "@/components/layout/main-layout";
import { isClerkConfigured } from "@/lib/auth-mode";

export const metadata: Metadata = {
  title: 'EcoSort Vision',
  description: 'AI-powered waste detection and segregation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased', 'min-h-screen bg-background font-sans')}>
        {isClerkConfigured() ? (
          <ClerkProvider>
            <AppProviders>
              <MainLayout>{children}</MainLayout>
            </AppProviders>
          </ClerkProvider>
        ) : (
          <AppProviders>
            <MainLayout>{children}</MainLayout>
          </AppProviders>
        )}
        <Toaster />
      </body>
    </html>
  );
}
