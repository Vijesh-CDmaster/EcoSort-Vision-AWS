"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, GovernmentUser } from "@/hooks/use-auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, Shield, ShieldCheck, UserCog } from "lucide-react";

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: "government" | "marketplace";
  subRole?: string;
  department?: string;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  lastLogin?: string;
}

// Mock data for demonstration
const mockUsers: SystemUser[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@ecosort.gov",
    role: "government",
    subRole: "admin",
    department: "Environmental Services",
    status: "active",
    createdAt: "2024-01-15",
    lastLogin: "2024-12-20",
  },
  {
    id: "2",
    name: "Field Officer",
    email: "officer@ecosort.gov",
    role: "government",
    subRole: "worker",
    department: "Waste Collection",
    status: "active",
    createdAt: "2024-02-10",
    lastLogin: "2024-12-19",
  },
  {
    id: "3",
    name: "Eco Seller",
    email: "seller@ecomarket.com",
    role: "marketplace",
    subRole: "seller",
    status: "active",
    createdAt: "2024-03-05",
    lastLogin: "2024-12-18",
  },
  {
    id: "4",
    name: "Green Buyer",
    email: "buyer@ecomarket.com",
    role: "marketplace",
    subRole: "buyer",
    status: "active",
    createdAt: "2024-04-20",
    lastLogin: "2024-12-17",
  },
  {
    id: "5",
    name: "New Applicant",
    email: "pending@ecosort.gov",
    role: "government",
    subRole: "worker",
    department: "Recycling Center",
    status: "pending",
    createdAt: "2024-12-15",
  },
];

export default function UserManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [users, setUsers] = useState<SystemUser[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check access on mount
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShouldRedirect(true);
      return;
    }

    if (user.role !== "government") {
      setShouldRedirect(true);
      return;
    }

    const govUser = user as GovernmentUser;
    if (!govUser.permissions.includes("manage_users")) {
      setShouldRedirect(true);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/");
    }
  }, [shouldRedirect, router]);

  if (shouldRedirect || !user || user.role !== "government") {
    return null;
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string, subRole?: string) => {
    if (role === "government") {
      return subRole === "admin" ? (
        <Badge className="bg-purple-600 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Admin
        </Badge>
      ) : (
        <Badge className="bg-blue-600 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Worker
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        {subRole === "seller" ? "Seller" : subRole === "buyer" ? "Buyer" : "Both"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage government and marketplace users
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account for the EcoSort platform.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Enter full name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter email address" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gov-admin">Government Admin</SelectItem>
                    <SelectItem value="gov-worker">Government Worker</SelectItem>
                    <SelectItem value="mp-seller">Marketplace Seller</SelectItem>
                    <SelectItem value="mp-buyer">Marketplace Buyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Department (Government only)</Label>
                <Input id="department" placeholder="Enter department" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Government Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "government").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Marketplace Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "marketplace").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {users.filter((u) => u.status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            View and manage all registered users on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="marketplace">Marketplace</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.role, u.subRole)}</TableCell>
                    <TableCell>{u.department || "-"}</TableCell>
                    <TableCell>{getStatusBadge(u.status)}</TableCell>
                    <TableCell>{u.lastLogin || "Never"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
