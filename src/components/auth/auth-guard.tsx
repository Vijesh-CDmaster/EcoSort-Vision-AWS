"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, UserRole } from "@/hooks/use-auth-store";
import { isClerkConfigured } from "@/lib/auth-mode";
import { Loader2, Recycle } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export function AuthGuard({
  children,
  allowedRoles,
  requireAuth = true,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Public routes that don't require authentication
    const publicRoutes = ["/auth/login", "/auth/signup", "/auth/forgot-password"];
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

    if (!isAuthenticated && requireAuth && !isPublicRoute) {
      // Redirect to login (Clerk sign-in when configured, demo login otherwise)
      router.push(isClerkConfigured() ? "/sign-in" : "/auth/login");
      return;
    }

    if (isAuthenticated && user) {
      // Check role-based access
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate section based on user role
        if (user.role === "government") {
          router.push("/");
        } else {
          router.push("/marketplace");
        }
        return;
      }

      // Redirect from auth pages if already logged in
      if (isPublicRoute) {
        if (user.role === "government") {
          router.push("/");
        } else {
          router.push("/marketplace");
        }
      }
    }
  }, [isAuthenticated, isLoading, user, pathname, router, allowedRoles, requireAuth]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 animate-pulse">
            <Recycle className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Don't render children if not authorized
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Don't render children if role not allowed
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

// HOC for wrapping pages that require government access
export function withGovernmentAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function GovernmentProtectedComponent(props: P) {
    return (
      <AuthGuard allowedRoles={["government"]}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// HOC for wrapping pages that require marketplace access
export function withMarketplaceAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function MarketplaceProtectedComponent(props: P) {
    return (
      <AuthGuard allowedRoles={["marketplace"]}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// HOC for wrapping pages that require any authentication
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthProtectedComponent(props: P) {
    return (
      <AuthGuard>
        <Component {...props} />
      </AuthGuard>
    );
  };
}
