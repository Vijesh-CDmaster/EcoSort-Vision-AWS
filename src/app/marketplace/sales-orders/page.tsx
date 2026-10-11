"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, MarketplaceUser } from "@/hooks/use-auth-store";
import { api } from "@/lib/api";
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
import {
  Search,
  Package,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Eye,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  product: string;
  quantity: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "paid" | "pending" | "refunded";
  createdAt: string;
  shippingAddress: string;
}

interface BackendOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  customerEmail?: string;
  items: { id: string; name: string; quantity: number; price: number; seller: string }[];
  total: number;
  status: string;
  paymentStatus: string;
  trackingNumber?: string;
  shippingAddress: string;
  createdAt: string;
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  // Load orders for the current seller from the backend.
  useEffect(() => {
    if (!user || user.role !== "marketplace") return;
    api.get<{ orders: BackendOrder[] }>("/db/orders").then((res) => {
      if (!res.ok || !res.data) return;
      const mine = res.data.orders
        .filter((o) => o.items.some((i) => i.seller === user.name))
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.buyerName,
          customerEmail: o.customerEmail || "",
          product: o.items[0]?.name ?? "",
          quantity: o.items.reduce((sum, i) => sum + i.quantity, 0),
          total: o.total,
          status: o.status as Order["status"],
          paymentStatus: o.paymentStatus as Order["paymentStatus"],
          createdAt: o.createdAt.slice(0, 10),
          shippingAddress: o.shippingAddress,
        }));
      setOrders(mine);
    });
  }, [user]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.product.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500 flex items-center gap-1">
            <Package className="h-3 w-3" />
            Processing
          </Badge>
        );
      case "shipped":
        return (
          <Badge className="bg-purple-500 flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Shipped
          </Badge>
        );
      case "delivered":
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Delivered
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600">Paid</Badge>;
      case "pending":
        return <Badge variant="outline">Payment Pending</Badge>;
      case "refunded":
        return <Badge variant="secondary">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculate stats
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-8 w-8" />
          Sales Orders
        </h1>
        <p className="text-muted-foreground">
          Manage orders from your marketplace customers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {pendingOrders}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {completedOrders}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            View and manage all customer orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order #, customer, or product..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.customerEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{order.product}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>${order.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                    <TableCell>{order.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Order Details</DialogTitle>
                            <DialogDescription>
                              {order.orderNumber}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground">
                                Customer
                              </h4>
                              <p>{order.customerName}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.customerEmail}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground">
                                Shipping Address
                              </h4>
                              <p className="text-sm">{order.shippingAddress}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground">
                                Product
                              </h4>
                              <p>
                                {order.product} × {order.quantity}
                              </p>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Total</span>
                              <span className="font-bold">
                                ${order.total.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {getStatusBadge(order.status)}
                              {getPaymentBadge(order.paymentStatus)}
                            </div>
                          </div>
                          <DialogFooter className="flex-col sm:flex-row gap-2">
                            {order.status === "pending" && (
                              <Button className="w-full sm:w-auto">
                                <Package className="h-4 w-4 mr-2" />
                                Start Processing
                              </Button>
                            )}
                            {order.status === "processing" && (
                              <Button className="w-full sm:w-auto">
                                <Truck className="h-4 w-4 mr-2" />
                                Mark as Shipped
                              </Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No orders found matching your criteria
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
