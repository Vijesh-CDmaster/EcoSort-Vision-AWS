"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, MarketplaceUser } from "@/hooks/use-auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Package,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  status: "active" | "pending" | "sold" | "inactive";
  views: number;
  favorites: number;
  createdAt: string;
  imageUrl: string;
}

// Mock data for demonstration
const mockListings: Listing[] = [
  {
    id: "1",
    title: "Recycled Glass Vase",
    description: "Beautiful vase made from 100% recycled glass bottles",
    price: 29.99,
    category: "Home Decor",
    condition: "New",
    status: "active",
    views: 245,
    favorites: 18,
    createdAt: "2024-12-01",
    imageUrl: "https://placehold.co/200x200/10B981/FFFFFF?text=Vase",
  },
  {
    id: "2",
    title: "Upcycled Denim Bag",
    description: "Stylish tote bag made from repurposed denim jeans",
    price: 45.00,
    category: "Fashion",
    condition: "New",
    status: "active",
    views: 189,
    favorites: 32,
    createdAt: "2024-11-28",
    imageUrl: "https://placehold.co/200x200/3B82F6/FFFFFF?text=Bag",
  },
  {
    id: "3",
    title: "Bamboo Cutlery Set",
    description: "Eco-friendly bamboo cutlery set with carrying case",
    price: 15.00,
    category: "Kitchen",
    condition: "New",
    status: "sold",
    views: 412,
    favorites: 56,
    createdAt: "2024-11-15",
    imageUrl: "https://placehold.co/200x200/F59E0B/FFFFFF?text=Cutlery",
  },
  {
    id: "4",
    title: "Recycled Paper Notebook",
    description: "A5 notebook made from 100% recycled paper",
    price: 9.99,
    category: "Stationery",
    condition: "New",
    status: "active",
    views: 98,
    favorites: 8,
    createdAt: "2024-12-10",
    imageUrl: "https://placehold.co/200x200/8B5CF6/FFFFFF?text=Notebook",
  },
  {
    id: "5",
    title: "Upcycled Metal Planter",
    description: "Garden planter made from repurposed metal containers",
    price: 35.00,
    category: "Garden",
    condition: "New",
    status: "pending",
    views: 0,
    favorites: 0,
    createdAt: "2024-12-20",
    imageUrl: "https://placehold.co/200x200/EF4444/FFFFFF?text=Planter",
  },
];

export default function MyListingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [listings] = useState<Listing[]>(mockListings);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Check access on mount - seller or both only
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShouldRedirect(true);
      return;
    }

    if (user.role !== "marketplace") {
      setShouldRedirect(true);
      return;
    }

    const mpUser = user as MarketplaceUser;
    if (mpUser.accountType === "buyer") {
      setShouldRedirect(true);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/marketplace");
    }
  }, [shouldRedirect, router]);

  if (shouldRedirect || !user || user.role !== "marketplace") {
    return null;
  }

  // Filter listings
  const filteredListings = listings.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || l.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case "sold":
        return (
          <Badge className="bg-blue-500 flex items-center gap-1">
            <Package className="h-3 w-3" />
            Sold
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculate stats
  const activeListings = listings.filter((l) => l.status === "active").length;
  const totalViews = listings.reduce((sum, l) => sum + l.views, 0);
  const totalFavorites = listings.reduce((sum, l) => sum + l.favorites, 0);
  const totalRevenue = listings
    .filter((l) => l.status === "sold")
    .reduce((sum, l) => sum + l.price, 0);

  // Get unique categories
  const categories = [...new Set(listings.map((l) => l.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            My Listings
          </h1>
          <p className="text-muted-foreground">
            Manage your product listings
          </p>
        </div>
        <Link href="/marketplace/add-product">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Product
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeListings}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-500">
              {totalFavorites}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Product Listings</CardTitle>
          <CardDescription>
            View and manage all your marketplace listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Listings Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(listing.status)}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {listing.description}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Listing
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold">${listing.price.toFixed(2)}</span>
                    <Badge variant="outline">{listing.category}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {listing.views}
                    </span>
                    <span className="flex items-center gap-1">
                      ♥ {listing.favorites}
                    </span>
                    <span className="ml-auto">{listing.createdAt}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredListings.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No listings found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Start by adding your first product"}
              </p>
              {!searchQuery && statusFilter === "all" && categoryFilter === "all" && (
                <Link href="/marketplace/add-product">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Product
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
