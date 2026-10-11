"use client";

import { useAuth } from "@/hooks/use-auth-store";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  ShoppingBag,
  Shield,
  Leaf,
  Calendar,
  Edit2,
  Save,
  X,
  CheckCircle,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: "",
    address: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = () => {
    updateProfile({
      name: formData.name,
    });
    setIsEditing(false);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={user.role === "government" ? "default" : "secondary"}
                  className="gap-1"
                >
                  {user.role === "government" ? (
                    <>
                      <Building2 className="w-3 h-3" />
                      Government
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3 h-3" />
                      Marketplace
                    </>
                  )}
                </Badge>
                {user.role === "marketplace" && user.verified && (
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <Separator className="my-4 w-full" />
              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Joined {formatDate(user.createdAt)}</span>
                </div>
                {user.role === "government" && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span>{user.department}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>ID: {user.employeeId}</span>
                    </div>
                  </>
                )}
                {user.role === "marketplace" && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize">{user.accountType} Account</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Leaf className="w-4 h-4 text-green-600" />
                      <span>Eco Score: {user.ecoScore}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>
                  View and update your account information
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                {user.role === "government" && (
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{user.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                  </div>

                  {user.role === "marketplace" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        {isEditing ? (
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, phone: e.target.value }))
                            }
                            placeholder={user.phone || "Add phone number"}
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{user.phone || "Not provided"}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        {isEditing ? (
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, address: e.target.value }))
                            }
                            placeholder={user.address || "Add address"}
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{user.address || "Not provided"}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {user.role === "government" && (
                    <>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span>{user.department}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Employee ID</Label>
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <span>{user.employeeId}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Change Password</CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                    <Button>Update Password</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {user.role === "government" && (
                <TabsContent value="permissions" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Your Permissions</CardTitle>
                      <CardDescription>
                        Access rights assigned to your account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {user.permissions.map((permission) => (
                          <Badge key={permission} variant="secondary" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {permission.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
