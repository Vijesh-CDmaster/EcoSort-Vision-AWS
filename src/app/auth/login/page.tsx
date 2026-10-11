"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, UserRole } from "@/hooks/use-auth-store";
import { isClerkConfigured } from "@/lib/auth-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Leaf,
  Building2,
  ShoppingBag,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Recycle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<UserRole>("government");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // With Clerk configured, the real sign-in lives at /sign-in.
  useEffect(() => {
    if (isClerkConfigured()) {
      router.replace("/sign-in");
    }
  }, [router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === "government" ? "/" : "/marketplace";
      router.push(redirectPath);
    }
  }, [isAuthenticated, user, router]);

  if (isClerkConfigured()) {
    return null;
  }

  // Don't render form if already authenticated
  if (isAuthenticated && user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login({ email, password, role: activeTab });

    if (result.success) {
      const redirectPath = activeTab === "government" ? "/" : "/marketplace";
      router.push(redirectPath);
    } else {
      setError(result.error || "Login failed. Please try again.");
    }

    setIsLoading(false);
  };

  const fillDemoCredentials = (role: UserRole) => {
    if (role === "government") {
      setEmail("admin@ecosort.gov");
      setPassword("admin123");
    } else {
      setEmail("seller@ecomarket.com");
      setPassword("seller123");
    }
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
            <Recycle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            EcoSort Vision
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Smart Waste Management & Eco Marketplace
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to access your account
            </CardDescription>
          </CardHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as UserRole);
              setError("");
              setEmail("");
              setPassword("");
            }}
          >
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="government" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Government
                </TabsTrigger>
                <TabsTrigger value="marketplace" className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Marketplace
                </TabsTrigger>
              </TabsList>
            </div>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="government" className="mt-0 space-y-4">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Government Portal:</strong> Access waste management
                      dashboard, bin monitoring, and analytics.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="marketplace" className="mt-0 space-y-4">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>Eco Marketplace:</strong> Buy and sell sustainable
                      products, connect with eco-conscious community.
                    </p>
                  </div>
                </TabsContent>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={
                      activeTab === "government"
                        ? "you@agency.gov"
                        : "you@example.com"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm text-muted-foreground"
                    onClick={() => fillDemoCredentials(activeTab)}
                  >
                    Use demo credentials
                  </Button>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Leaf className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={`/auth/signup/${activeTab}`}
                    className="text-primary font-medium hover:underline"
                  >
                    Create account
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Tabs>
        </Card>

        {/* Demo Accounts Info */}
        <Card className="mt-4 border-dashed">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Demo Accounts:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/50">
                <p className="font-medium">Government</p>
                <p className="text-muted-foreground">admin@ecosort.gov</p>
                <p className="text-muted-foreground">admin123</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="font-medium">Marketplace</p>
                <p className="text-muted-foreground">seller@ecomarket.com</p>
                <p className="text-muted-foreground">seller123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
