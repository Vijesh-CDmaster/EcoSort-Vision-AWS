"use client";

import { useMarketplaceStore } from "@/hooks/use-marketplace-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Leaf,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function CartPage() {
  const { cartProducts, updateCartQuantity, removeFromCart, clearCart, getCartTotal } =
    useMarketplaceStore();

  const subtotal = getCartTotal();
  const shipping = subtotal > 5000 ? 0 : 99;
  const ecoDiscount = subtotal * 0.05; // 5% eco discount
  const total = subtotal + shipping - ecoDiscount;

  if (cartProducts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground mt-1">
            Your cart is empty
          </p>
        </div>

        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Your cart is empty</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Looks like you haven&apos;t added any items to your cart yet. Start
              shopping for sustainable products!
            </p>
            <Link href="/marketplace">
              <Button className="mt-4">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground mt-1">
            {cartProducts.length} item{cartProducts.length !== 1 ? "s" : ""} in your cart
          </p>
        </div>
        <Button variant="outline" onClick={clearCart}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Cart
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartProducts.map((item) => (
            <Card key={item.product.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={item.product.images[0] || "/placeholder.jpg"}
                      alt={item.product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium truncate">{item.product.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          by {item.product.sellerName}
                        </p>
                        {item.product.ecoImpactScore && (
                          <Badge variant="outline" className="mt-1 gap-1">
                            <Leaf className="w-3 h-3" />
                            Eco Score: {item.product.ecoImpactScore}
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-lg">
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartQuantity(
                              item.product.id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-16 h-8 text-center"
                          min={1}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    `₹${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Leaf className="w-4 h-4" />
                  Eco Discount (5%)
                </span>
                <span>-₹{ecoDiscount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              {subtotal < 5000 && (
                <p className="text-xs text-muted-foreground">
                  Add ₹{(5000 - subtotal).toFixed(2)} more for free shipping!
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" size="lg">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link href="/marketplace" className="w-full">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
