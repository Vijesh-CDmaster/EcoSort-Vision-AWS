
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { AppSidebarClient } from "./app-sidebar-client";
import { UserNav, UserNavCompact } from "@/components/auth/user-nav";


export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div
          className="flex items-center gap-2"
          data-sidebar-expanded-only="true"
        >
          <Icons.Logo className="w-6 h-6" />
          <span className="text-lg font-semibold font-headline">EcoSort Vision</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <AppSidebarClient />
      </SidebarContent>
      <SidebarFooter>
        {isCollapsed ? <UserNavCompact /> : <UserNav />}
      </SidebarFooter>
    </Sidebar>
  );
}
