"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMarketplaceStore, conditionLabels } from "@/hooks/use-marketplace-store";
import { Heart, Package, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WishlistSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onViewProduct?: (id: string) => void;
}

export function WishlistSheet({ open, onOpenChange, onViewProduct }: WishlistSheetProps) {
  const { wishlistProducts, removeFromWishlist, addToCart, wishlist } = useMarketplaceStore();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = (productId: string) => {
    addToCart(productId);
    toast({
      title: "Added to Cart",
      description: "Item has been added to your cart.",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Wishlist
          </SheetTitle>
          <SheetDescription>
            {wishlistProducts.length === 0
              ? "Your wishlist is empty"
              : `${wishlistProducts.length} item${wishlistProducts.length > 1 ? "s" : ""} saved`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-4">
          {wishlistProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Heart className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No saved items</p>
              <p className="text-sm text-muted-foreground">
                Click the heart icon on products to save them
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {wishlistProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    onViewProduct?.(product.id);
                    onOpenChange?.(false);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.title}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium line-clamp-1">{product.title}</h4>
                        <Badge variant="outline" className="text-xs mt-1">
                          {conditionLabels[product.condition]}
                        </Badge>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-primary font-bold">
                            {formatPrice(product.price)}
                          </span>
                          {product.originalPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromWishlist(product.id);
                            toast({
                              title: "Removed from Wishlist",
                              description: "Item has been removed.",
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product.id);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
