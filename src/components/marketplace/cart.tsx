"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMarketplaceStore } from "@/hooks/use-marketplace-store";
import { useAuth } from "@/hooks/use-auth-store";
import { api } from "@/lib/api";
import { Minus, Package, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CartSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onViewProduct?: (id: string) => void;
}

export function CartSheet({ open, onOpenChange, onViewProduct }: CartSheetProps) {
  const { cartProducts, updateCartQuantity, removeFromCart, clearCart, getCartTotal, getCartItemCount } = useMarketplaceStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleCheckout = async () => {
    if (cartProducts.length === 0) return;

    const items = cartProducts.map(({ product, quantity }) => ({
      id: product.id,
      name: product.title,
      image: product.images[0] ?? "",
      quantity,
      price: product.price,
      seller: product.sellerName,
    }));

    const res = await api.post("/db/orders", {
      buyerId: user?.id ?? "mp-2",
      buyerName: user?.name ?? "Buyer",
      items,
      total: getCartTotal(),
      status: "processing",
      paymentStatus: "paid",
    });

    if (res.ok) {
      clearCart();
      onOpenChange?.(false);
      toast({
        title: "Order placed!",
        description: "Your order has been created. Track it from the Orders page.",
      });
    } else {
      toast({
        title: "Checkout failed",
        description: res.error || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const itemCount = getCartItemCount();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
          </SheetTitle>
          <SheetDescription>
            {itemCount === 0
              ? "Your cart is empty"
              : `${itemCount} item${itemCount > 1 ? "s" : ""} in your cart`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-4">
          {cartProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No items in cart</p>
              <p className="text-sm text-muted-foreground">
                Start shopping to add items
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartProducts.map(({ product, quantity }) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div 
                        className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0 cursor-pointer"
                        onClick={() => {
                          onViewProduct?.(product.id);
                          onOpenChange?.(false);
                        }}
                      >
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.title}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 
                          className="font-medium text-sm line-clamp-1 cursor-pointer hover:underline"
                          onClick={() => {
                            onViewProduct?.(product.id);
                            onOpenChange?.(false);
                          }}
                        >
                          {product.title}
                        </h4>
                        <p className="text-primary font-semibold">
                          {formatPrice(product.price)}
                        </p>
                        {product.shippingCost ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            +{formatPrice(product.shippingCost)} shipping
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <Truck className="h-3 w-3" />
                            Free shipping
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFromCart(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateCartQuantity(product.id, quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateCartQuantity(product.id, quantity + 1)}
                            disabled={quantity >= product.quantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {cartProducts.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {formatPrice(
                    cartProducts.reduce(
                      (sum, { product, quantity }) => sum + product.price * quantity,
                      0
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {formatPrice(
                    cartProducts.reduce(
                      (sum, { product }) => sum + (product.shippingCost || 0),
                      0
                    )
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(getCartTotal())}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={clearCart}>
                Clear Cart
              </Button>
              <Button className="flex-1" onClick={handleCheckout}>
                Checkout
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
