"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  ShoppingBag,
  MessageCircle,
  Star,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth-store";
import { api } from "@/lib/api";

interface OrderItem {
  id: string;
  name: string;
  image: string;
  quantity: number;
  price: number;
  seller: string;
}

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  total: number;
  trackingNumber?: string;
  items: OrderItem[];
}

const statusConfig = {
  processing: {
    label: "Processing",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedTab, setSelectedTab] = useState("all");

  // Load the current user's orders from the backend.
  useEffect(() => {
    const buyerId = user?.id ?? "mp-2";
    api.get<{ orders: Order[] }>(`/db/orders?buyer_id=${encodeURIComponent(buyerId)}`).then((res) => {
      if (res.ok && res.data) setAllOrders(res.data.orders);
    });
  }, [user?.id]);

  const filterOrders = (status: string) => {
    if (status === "all") return allOrders;
    return allOrders.filter((order) => order.status === status);
  };

  const orders = filterOrders(selectedTab);

  if (allOrders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your orders
          </p>
        </div>

        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No orders yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              When you make a purchase, your orders will appear here for easy
              tracking.
            </p>
            <Link href="/marketplace">
              <Button className="mt-4">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Start Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your orders
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6 space-y-4">
          {orders.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">
                  No orders with this status
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const status = statusConfig[order.status as keyof typeof statusConfig];
              const StatusIcon = status.icon;

              return (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.id}</CardTitle>
                        <CardDescription>
                          Ordered on{" "}
                          {new Date(order.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </CardDescription>
                      </div>
                      <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Order Items */}
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              by {item.seller} • Qty: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tracking Info */}
                    {order.status === "shipped" && order.trackingNumber && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              Tracking: {order.trackingNumber}
                            </span>
                          </div>
                          <Button variant="link" size="sm" className="h-auto p-0">
                            Track Package
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Order Footer */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Contact Seller
                        </Button>
                        {order.status === "delivered" && (
                          <Button variant="outline" size="sm">
                            <Star className="w-4 h-4 mr-1" />
                            Leave Review
                          </Button>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-lg font-semibold">
                          ${order.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
