"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  LogOut,
  Building2,
  ShoppingBag,
  Shield,
  ChevronDown,
} from "lucide-react";

export function UserNav() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => router.push("/auth/login")}
      >
        <User className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2 hover:bg-accent"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-sm font-medium truncate w-full text-left">
              {user.name}
            </span>
            <span className="text-xs text-muted-foreground truncate w-full text-left">
              {user.email}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <Badge
                variant={user.role === "government" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {user.role === "government" ? (
                  <>
                    <Building2 className="w-2.5 h-2.5 mr-0.5" />
                    Gov
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-2.5 h-2.5 mr-0.5" />
                    Market
                  </>
                )}
              </Badge>
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {user.role === "government" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />
                {user.department}
              </div>
            )}
            {user.role === "marketplace" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="capitalize">{user.accountType}</span>
                {user.verified && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    Verified
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/profile")}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for collapsed sidebar
export function UserNavCompact() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/auth/login")}
      >
        <User className="h-5 w-5" />
      </Button>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
