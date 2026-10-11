"use client";

import React from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Product, 
  conditionLabels,
  useMarketplaceStore,
} from "@/hooks/use-marketplace-store";
import { Eye, Heart, Leaf, MessageCircle, ShoppingCart, Star, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
  onContact: (product: Product) => void;
}

export function ProductCard({ product, onView, onContact }: ProductCardProps) {
  const { toast } = useToast();
  const { isInWishlist, addToWishlist, removeFromWishlist, addToCart } = useMarketplaceStore();
  
  const inWishlist = isInWishlist(product.id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const conditionColor: Record<string, string> = {
    "new": "bg-green-500/10 text-green-600 border-green-500/20",
    "like-new": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "good": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    "fair": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast({ title: "Removed from wishlist" });
    } else {
      addToWishlist(product.id);
      toast({ title: "Added to wishlist" });
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product.id);
    toast({ title: "Added to cart", description: product.title });
  };

  const discountPercent = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
      onClick={() => onView(product)}
    >
      <CardHeader className="p-0 relative">
        <div className="aspect-square relative overflow-hidden bg-muted">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isFeatured && (
            <Badge className="bg-primary text-primary-foreground text-xs">Featured</Badge>
          )}
          {discountPercent > 0 && (
            <Badge className="bg-red-500 text-white text-xs">{discountPercent}% OFF</Badge>
          )}
          {product.negotiable && (
            <Badge variant="outline" className="bg-background/90 text-xs">Negotiable</Badge>
          )}
        </div>

        {/* Eco Score */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-full text-xs">
          <Leaf className="h-3 w-3" />
          {product.ecoImpactScore}
        </div>

        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`absolute bottom-2 right-2 h-8 w-8 rounded-full bg-background/80 hover:bg-background ${
            inWishlist ? "text-red-500" : ""
          }`}
          onClick={handleWishlistToggle}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={conditionColor[product.condition]} variant="outline">
            {conditionLabels[product.condition]}
          </Badge>
          {product.shippingCost === 0 && product.deliveryOption !== "pickup" && (
            <Badge variant="secondary" className="text-xs">
              <Truck className="h-3 w-3 mr-1" />
              Free
            </Badge>
          )}
        </div>

        <h3 className="font-semibold line-clamp-2 leading-tight">
          {product.title}
        </h3>

        {/* Rating */}
        {product.averageRating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= product.averageRating
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              ({product.reviews.length})
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" />
          <span>{product.views} views</span>
          <span>•</span>
          <span>{product.sellerLocation}</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onContact(product);
          }}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Chat
        </Button>
        <Button 
          size="sm" 
          className="flex-1"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
