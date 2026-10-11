"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuth, MarketplaceUser, GovernmentUser } from "@/hooks/use-auth-store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check if current path is an auth page
  const isAuthPage = pathname.startsWith("/auth");

  // Redirect logic with strict role-based access
  useEffect(() => {
    if (isLoading) return;

    // If on auth page and authenticated, redirect based on role
    if (isAuthPage && isAuthenticated && user) {
      const redirectPath = user.role === "government" ? "/" : "/marketplace";
      router.push(redirectPath);
      return;
    }

    // If not on auth page and not authenticated, redirect to login
    if (!isAuthPage && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    // Role-based access control for specific sections
    if (isAuthenticated && user) {
      // Government-only paths
      const governmentOnlyPaths = [
        "/waste-detection",
        "/waste-segregation",
        "/contamination-alerts",
        "/bin-monitoring",
        "/segregation-performance",
        "/admin",
      ];

      // Admin-only paths (require manage_users permission)
      const adminOnlyPaths = ["/admin"];

      // Seller-only paths
      const sellerOnlyPaths = [
        "/marketplace/my-listings",
        "/marketplace/sales-orders",
      ];

      // Buyer-only paths (not accessible to pure sellers)
      const buyerOnlyPaths = [
        "/marketplace/cart",
        "/marketplace/wishlist",
      ];

      const isAdminPath = adminOnlyPaths.some(p => pathname.startsWith(p));
      const isSellerPath = sellerOnlyPaths.some(p => pathname.startsWith(p));
      const isBuyerPath = buyerOnlyPaths.some(p => pathname.startsWith(p));

      // Government user access rules
      if (user.role === "government") {
        const govUser = user as GovernmentUser;
        
        // Marketplace users can't access government paths
        // Government users CAN access marketplace to browse
        
        // Check admin paths require manage_users permission
        if (isAdminPath && !govUser.permissions.includes("manage_users")) {
          router.push("/");
          return;
        }
      }

      // Marketplace user access rules
      if (user.role === "marketplace") {
        const mpUser = user as MarketplaceUser;

        // Can't access government dashboard or waste management
        if (pathname === "/" || governmentOnlyPaths.some(p => pathname.startsWith(p))) {
          router.push("/marketplace");
          return;
        }

        // Buyer can't access seller pages
        if (mpUser.accountType === "buyer" && isSellerPath) {
          router.push("/marketplace");
          return;
        }

        // Seller can't access buyer pages (cart/wishlist)
        if (mpUser.accountType === "seller" && isBuyerPath) {
          router.push("/marketplace");
          return;
        }
      }
    }
  }, [isLoading, isAuthenticated, user, isAuthPage, pathname, router]);

  // Auth pages get full-page layout without sidebar
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated - show sidebar layout
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger className="-ml-1" />
            <span className="text-sm font-semibold font-headline">EcoSort Vision</span>
          </header>
          <main className="p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
