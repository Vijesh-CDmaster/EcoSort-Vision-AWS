"use client";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Camera,
  AlertTriangle,
  Trash2,
  PieChart,
  Boxes,
  Cog,
  ShoppingBag,
  MessageCircle,
  Heart,
  ShoppingCart,
  Store,
  ListOrdered,
  Users,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMounted } from "@/hooks/use-mounted";
import { useMessagingStore } from "@/hooks/use-messaging-store";
import { useAuth, GovernmentUser, MarketplaceUser } from "@/hooks/use-auth-store";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  showBadge?: boolean;
  permission?: string;
}

// Government Admin menu items - Full access
const governmentAdminItems: MenuItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/waste-detection", label: "Waste Detection", icon: Camera },
  { href: "/waste-segregation", label: "Waste Segregation", icon: Boxes },
  { href: "/contamination-alerts", label: "Contamination Alerts", icon: AlertTriangle },
  { href: "/bin-monitoring", label: "Bin Monitoring", icon: Trash2 },
  { href: "/segregation-performance", label: "Analytics", icon: PieChart },
];

const governmentAdminOnlyItems: MenuItem[] = [
  { href: "/admin/users", label: "User Management", icon: Users, permission: "manage_users" },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, permission: "manage_users" },
];

// Government Worker menu items - Field operations
const governmentWorkerItems: MenuItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/waste-detection", label: "Waste Detection", icon: Camera },
  { href: "/bin-monitoring", label: "Bin Monitoring", icon: Trash2 },
  { href: "/contamination-alerts", label: "Alerts", icon: AlertTriangle },
];

// Marketplace Seller menu items
const sellerMenuItems: MenuItem[] = [
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/marketplace/my-listings", label: "My Listings", icon: Store },
  { href: "/marketplace/sales-orders", label: "Sales Orders", icon: ListOrdered },
];

// Marketplace Buyer menu items
const buyerMenuItems: MenuItem[] = [
  { href: "/marketplace", label: "Browse Products", icon: ShoppingBag },
  { href: "/marketplace/cart", label: "Cart", icon: ShoppingCart },
  { href: "/marketplace/wishlist", label: "Wishlist", icon: Heart },
  { href: "/marketplace/orders", label: "My Orders", icon: ClipboardList },
];

// Both buyer and seller menu items
const bothMenuItems: MenuItem[] = [
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/marketplace/my-listings", label: "My Listings", icon: Store },
  { href: "/marketplace/sales-orders", label: "Sales Orders", icon: ListOrdered },
  { href: "/marketplace/cart", label: "Cart", icon: ShoppingCart },
  { href: "/marketplace/wishlist", label: "Wishlist", icon: Heart },
  { href: "/marketplace/orders", label: "My Orders", icon: ClipboardList },
];

// Common menu items for all users
const commonItems: MenuItem[] = [
  { href: "/messages", label: "Messages", icon: MessageCircle, showBadge: true },
  { href: "/settings", label: "Settings", icon: Cog },
];

export function AppSidebarClient() {
  const pathname = usePathname();
  const mounted = useMounted();
  const { user, isAuthenticated } = useAuth();
  const messagingStore = useMessagingStore();

  // Get unread count for messages badge
  const unreadCount = mounted && messagingStore ? messagingStore.getTotalUnreadCount() : 0;

  // Determine which menu items to show based on user role
  const getMenuItems = (): { main: MenuItem[]; admin?: MenuItem[] } => {
    if (!isAuthenticated || !user) {
      return { main: [] };
    }

    if (user.role === "government") {
      const govUser = user as GovernmentUser;
      const hasAdminPermission = govUser.permissions.includes("manage_users");

      if (hasAdminPermission) {
        // Admin: Full waste management + admin features
        return {
          main: governmentAdminItems,
          admin: governmentAdminOnlyItems,
        };
      } else {
        // Worker: Limited field operations
        return { main: governmentWorkerItems };
      }
    }

    if (user.role === "marketplace") {
      const mpUser = user as MarketplaceUser;

      switch (mpUser.accountType) {
        case "seller":
          return { main: sellerMenuItems };
        case "buyer":
          return { main: buyerMenuItems };
        case "both":
          return { main: bothMenuItems };
        default:
          return { main: buyerMenuItems };
      }
    }

    return { main: [] };
  };

  const { main: mainMenuItems, admin: adminMenuItems } = getMenuItems();

  // Get role label for group
  const getRoleLabel = (): string => {
    if (!user) return "Menu";

    if (user.role === "government") {
      const govUser = user as GovernmentUser;
      return govUser.permissions.includes("manage_users")
        ? "Government Admin"
        : "Field Operations";
    }

    if (user.role === "marketplace") {
      const mpUser = user as MarketplaceUser;
      switch (mpUser.accountType) {
        case "seller":
          return "Seller Dashboard";
        case "buyer":
          return "Shopping";
        case "both":
          return "Marketplace";
        default:
          return "Marketplace";
      }
    }

    return "Menu";
  };

  if (!mounted || !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Main menu based on role */}
      <SidebarGroup>
        <SidebarGroupLabel>{getRoleLabel()}</SidebarGroupLabel>
        <SidebarMenu>
          {mainMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      {/* Admin menu (if applicable) */}
      {adminMenuItems && adminMenuItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarMenu>
            {adminMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      )}

      {/* Common items for all users */}
      <SidebarGroup>
        <SidebarGroupLabel>General</SidebarGroupLabel>
        <SidebarMenu>
          {commonItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href} className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </span>
                  {item.showBadge && unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
