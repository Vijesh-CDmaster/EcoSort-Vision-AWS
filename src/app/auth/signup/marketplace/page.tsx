"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth-store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ShoppingBag,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Leaf,
  Package,
  ShoppingCart,
  Store,
} from "lucide-react";

export default function MarketplaceSignupPage() {
  const router = useRouter();
  const { signupMarketplace, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    accountType: "buyer" as "buyer" | "seller" | "both",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/marketplace");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Please enter your name or store name.");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setIsLoading(true);

    const result = await signupMarketplace({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      accountType: formData.accountType,
      password: formData.password,
    });

    if (result.success) {
      router.push("/marketplace");
    } else {
      setError(result.error || "Signup failed. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/auth/login"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </Link>

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Marketplace Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Join the eco-conscious community
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" />
              <CardTitle className="text-xl">Create Account</CardTitle>
            </div>
            <CardDescription>
              Start buying or selling sustainable products
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Account Type Selection */}
              <div className="space-y-3">
                <Label>Account Type</Label>
                <RadioGroup
                  value={formData.accountType}
                  onValueChange={(value) => handleChange("accountType", value)}
                  className="grid grid-cols-3 gap-2"
                  disabled={isLoading}
                >
                  <div>
                    <RadioGroupItem
                      value="buyer"
                      id="buyer"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="buyer"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 dark:peer-data-[state=checked]:bg-green-950/30 cursor-pointer transition-colors"
                    >
                      <ShoppingCart className="mb-1 h-5 w-5" />
                      <span className="text-xs font-medium">Buyer</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="seller"
                      id="seller"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="seller"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 dark:peer-data-[state=checked]:bg-green-950/30 cursor-pointer transition-colors"
                    >
                      <Store className="mb-1 h-5 w-5" />
                      <span className="text-xs font-medium">Seller</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="both"
                      id="both"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="both"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 dark:peer-data-[state=checked]:bg-green-950/30 cursor-pointer transition-colors"
                    >
                      <Package className="mb-1 h-5 w-5" />
                      <span className="text-xs font-medium">Both</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  {formData.accountType === "seller" ? "Store Name" : "Full Name"}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={
                    formData.accountType === "seller"
                      ? "Green Goods Store"
                      : "John Doe"
                  }
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {formData.accountType !== "buyer" && (
                  <div className="space-y-2">
                    <Label htmlFor="address">Location (Optional)</Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="City, Country"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300">
                  🌱 Join our mission! Every purchase helps reduce waste and
                  promotes sustainability.
                </p>
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
                    Creating account...
                  </>
                ) : (
                  <>
                    <Leaf className="mr-2 h-4 w-4" />
                    Join Marketplace
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
