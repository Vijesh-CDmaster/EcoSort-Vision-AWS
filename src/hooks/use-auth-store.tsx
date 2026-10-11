"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth-mode";

// User Types
export type UserRole = "government" | "marketplace";

export interface GovernmentUser {
  id: string;
  email: string;
  name: string;
  role: "government";
  department: string;
  employeeId: string;
  permissions: string[];
  avatar?: string;
  createdAt: Date;
}

export interface MarketplaceUser {
  id: string;
  email: string;
  name: string;
  role: "marketplace";
  accountType: "buyer" | "seller" | "both";
  phone?: string;
  address?: string;
  avatar?: string;
  verified: boolean;
  ecoScore: number;
  createdAt: Date;
}

export type User = GovernmentUser | MarketplaceUser;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

interface GovernmentSignupData {
  email: string;
  password: string;
  name: string;
  department: string;
  employeeId: string;
}

interface MarketplaceSignupData {
  email: string;
  password: string;
  name: string;
  accountType: "buyer" | "seller" | "both";
  phone?: string;
  address?: string;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  signupGovernment: (data: GovernmentSignupData) => Promise<{ success: boolean; error?: string }>;
  signupMarketplace: (data: MarketplaceSignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  getRedirectPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Clerk session bridge
//
// The Clerk hooks (useUser/useClerk) may only be called inside <ClerkProvider />,
// which the app renders only when Clerk is configured. This bridge mounts the
// hooks in a separate component so AuthProviderCore can read the session
// unconditionally (null in demo mode).
// ---------------------------------------------------------------------------
interface ClerkSession {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: any;
  signOut: () => void;
}

const ClerkSessionContext = createContext<ClerkSession | null>(null);

function ClerkSessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const value = useMemo<ClerkSession>(
    () => ({ isLoaded: !!isLoaded, isSignedIn: !!isSignedIn, user, signOut: () => clerk.signOut() }),
    [isLoaded, isSignedIn, user, clerk]
  );
  return <ClerkSessionContext.Provider value={value}>{children}</ClerkSessionContext.Provider>;
}

// Demo users for testing (used only when Clerk is not configured)
const DEMO_USERS: { [email: string]: { password: string; user: User } } = {
  "admin@ecosort.gov": {
    password: "admin123",
    user: {
      id: "gov-1",
      email: "admin@ecosort.gov",
      name: "John Administrator",
      role: "government",
      department: "Waste Management",
      employeeId: "GOV-2024-001",
      permissions: ["view_all", "manage_bins", "manage_alerts", "view_analytics", "manage_users"],
      avatar: undefined,
      createdAt: new Date("2024-01-15"),
    },
  },
  "officer@ecosort.gov": {
    password: "officer123",
    user: {
      id: "gov-2",
      email: "officer@ecosort.gov",
      name: "Sarah Officer",
      role: "government",
      department: "Environmental Services",
      employeeId: "GOV-2024-002",
      permissions: ["view_all", "manage_bins", "view_analytics"],
      avatar: undefined,
      createdAt: new Date("2024-03-10"),
    },
  },
  "seller@ecomarket.com": {
    password: "seller123",
    user: {
      id: "mp-1",
      email: "seller@ecomarket.com",
      name: "Green Goods Store",
      role: "marketplace",
      accountType: "seller",
      phone: "+1 234 567 8900",
      address: "123 Eco Street, Green City",
      verified: true,
      ecoScore: 92,
      createdAt: new Date("2024-02-20"),
    },
  },
  "buyer@ecomarket.com": {
    password: "buyer123",
    user: {
      id: "mp-2",
      email: "buyer@ecomarket.com",
      name: "Emma Green",
      role: "marketplace",
      accountType: "buyer",
      phone: "+1 234 567 8901",
      verified: true,
      ecoScore: 78,
      createdAt: new Date("2024-04-05"),
    },
  },
};

const AUTH_STORAGE_KEY = "ecosort-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isClerkConfigured()) {
    return (
      <ClerkSessionProvider>
        <AuthProviderCore>{children}</AuthProviderCore>
      </ClerkSessionProvider>
    );
  }
  return <AuthProviderCore>{children}</AuthProviderCore>;
}

function AuthProviderCore({ children }: { children: ReactNode }) {
  const clerkConfigured = isClerkConfigured();
  const clerkSession = useContext(ClerkSessionContext);
  const clerkLoaded = clerkSession?.isLoaded ?? true;
  const isSignedIn = clerkSession?.isSignedIn ?? false;
  const clerkUser = clerkSession?.user ?? null;
  const clerk = clerkSession;

  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load demo auth state from localStorage (demo mode only)
  useEffect(() => {
    if (clerkConfigured) return;
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({
          user: parsed.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [clerkConfigured]);

  // Save demo auth state to localStorage
  const saveAuth = useCallback((user: User) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }));
  }, []);

  // ------------------------------------------------------------------
  // Clerk mode: derive the app user from the Clerk session
  // ------------------------------------------------------------------
  const clerkUserRecord = useMemo<User | null>(() => {
    if (!clerkConfigured || !clerkLoaded || !isSignedIn || !clerkUser) return null;
    const meta = (clerkUser.publicMetadata ?? {}) as Record<string, unknown>;
    const role: UserRole =
      meta.role === "government" ? "government" : "marketplace";
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
    const name =
      clerkUser.fullName ?? clerkUser.username ?? email.split("@")[0] ?? "User";

    if (role === "government") {
      const gov: GovernmentUser = {
        id: clerkUser.id,
        email,
        name,
        role: "government",
        department: String(meta.department ?? "Waste Management"),
        employeeId: String(meta.employeeId ?? ""),
        permissions: ["view_all", "manage_bins", "manage_alerts", "view_analytics", "manage_users"],
        avatar: clerkUser.imageUrl || undefined,
        createdAt: new Date(clerkUser.createdAt ?? Date.now()),
      };
      return gov;
    }

    const accountType =
      meta.accountType === "seller" || meta.accountType === "both"
        ? (meta.accountType as "seller" | "both")
        : "buyer";
    const mp: MarketplaceUser = {
      id: clerkUser.id,
      email,
      name,
      role: "marketplace",
      accountType,
      phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? undefined,
      verified: true,
      ecoScore: 50,
      avatar: clerkUser.imageUrl || undefined,
      createdAt: new Date(clerkUser.createdAt ?? Date.now()),
    };
    return mp;
  }, [clerkConfigured, clerkLoaded, isSignedIn, clerkUser]);

  // ------------------------------------------------------------------
  // Demo-mode auth actions (unchanged behaviour)
  // ------------------------------------------------------------------
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      if (clerkConfigured) {
        window.location.href = "/sign-in";
        return { success: false, error: "Redirecting to Clerk sign-in..." };
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const demoUser = DEMO_USERS[credentials.email.toLowerCase()];

      if (!demoUser) {
        return { success: false, error: "User not found. Please check your email." };
      }

      if (demoUser.password !== credentials.password) {
        return { success: false, error: "Invalid password. Please try again." };
      }

      if (demoUser.user.role !== credentials.role) {
        return {
          success: false,
          error: `This account is registered as a ${demoUser.user.role} user. Please use the correct login tab.`,
        };
      }

      setState({
        user: demoUser.user,
        isAuthenticated: true,
        isLoading: false,
      });
      saveAuth(demoUser.user);

      return { success: true };
    },
    [clerkConfigured, saveAuth]
  );

  const signupGovernment = useCallback(
    async (data: GovernmentSignupData): Promise<{ success: boolean; error?: string }> => {
      if (clerkConfigured) {
        window.location.href = "/sign-up";
        return { success: false, error: "Redirecting to Clerk sign-up..." };
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (DEMO_USERS[data.email.toLowerCase()]) {
        return { success: false, error: "An account with this email already exists." };
      }

      if (!data.email.toLowerCase().endsWith(".gov")) {
        return { success: false, error: "Government accounts require a .gov email address." };
      }

      const newUser: GovernmentUser = {
        id: `gov-${Date.now()}`,
        email: data.email,
        name: data.name,
        role: "government",
        department: data.department,
        employeeId: data.employeeId,
        permissions: ["view_all", "manage_bins", "view_analytics"],
        createdAt: new Date(),
      };

      DEMO_USERS[data.email.toLowerCase()] = {
        password: data.password,
        user: newUser,
      };

      setState({
        user: newUser,
        isAuthenticated: true,
        isLoading: false,
      });
      saveAuth(newUser);

      return { success: true };
    },
    [clerkConfigured, saveAuth]
  );

  const signupMarketplace = useCallback(
    async (data: MarketplaceSignupData): Promise<{ success: boolean; error?: string }> => {
      if (clerkConfigured) {
        window.location.href = "/sign-up";
        return { success: false, error: "Redirecting to Clerk sign-up..." };
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (DEMO_USERS[data.email.toLowerCase()]) {
        return { success: false, error: "An account with this email already exists." };
      }

      const newUser: MarketplaceUser = {
        id: `mp-${Date.now()}`,
        email: data.email,
        name: data.name,
        role: "marketplace",
        accountType: data.accountType,
        phone: data.phone,
        address: data.address,
        verified: false,
        ecoScore: 50,
        createdAt: new Date(),
      };

      DEMO_USERS[data.email.toLowerCase()] = {
        password: data.password,
        user: newUser,
      };

      setState({
        user: newUser,
        isAuthenticated: true,
        isLoading: false,
      });
      saveAuth(newUser);

      return { success: true };
    },
    [clerkConfigured, saveAuth]
  );

  const logout = useCallback(() => {
    if (clerkConfigured && clerk) {
      clerk.signOut();
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, [clerkConfigured, clerk]);

  const updateProfile = useCallback(
    (updates: Partial<User>) => {
      if (clerkConfigured) {
        // Best-effort sync to the Clerk profile (name only is supported here).
        const name = updates.name;
        if (name && clerkUser) {
          const [firstName, ...rest] = name.split(" ");
          clerkUser.update({ firstName, lastName: rest.join(" ") }).catch(() => {});
        }
        return;
      }
      if (!state.user) return;

      const updatedUser = { ...state.user, ...updates } as User;
      setState((prev) => ({
        ...prev,
        user: updatedUser,
      }));
      saveAuth(updatedUser);
    },
    [clerkConfigured, clerkUser, state.user, saveAuth]
  );

  const getRedirectPath = useCallback(() => {
    const u = clerkConfigured ? clerkUserRecord : state.user;
    if (!u) return "/auth/login";
    if (u.role === "government") {
      return "/";
    }
    return "/marketplace";
  }, [clerkConfigured, clerkUserRecord, state.user]);

  const effectiveUser = clerkConfigured ? clerkUserRecord : state.user;
  const effectiveAuthenticated = clerkConfigured
    ? !!clerkUserRecord
    : state.isAuthenticated;
  const effectiveLoading = clerkConfigured ? !clerkLoaded : state.isLoading;

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        isAuthenticated: effectiveAuthenticated,
        isLoading: effectiveLoading,
        login,
        signupGovernment,
        signupMarketplace,
        logout,
        updateProfile,
        getRedirectPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper hook to check if user has permission (for government users)
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  if (!user || user.role !== "government") return false;
  return user.permissions.includes(permission);
}

// Helper to check if user is government
export function useIsGovernment(): boolean {
  const { user } = useAuth();
  return user?.role === "government";
}

// Helper to check if user is marketplace
export function useIsMarketplace(): boolean {
  const { user } = useAuth();
  return user?.role === "marketplace";
}
