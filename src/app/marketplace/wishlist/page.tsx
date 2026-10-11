"use client";

import { useMarketplaceStore, Product } from "@/hooks/use-marketplace-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ShoppingBag,
  Leaf,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function WishlistPage() {
  const { wishlistProducts, removeFromWishlist, addToCart, cart } =
    useMarketplaceStore();

  const isInCart = (productId: string) => cart.some(item => item.productId === productId);

  if (wishlistProducts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <p className="text-muted-foreground mt-1">
            Your wishlist is empty
          </p>
        </div>

        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Your wishlist is empty</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Save items you love by clicking the heart icon on any product.
              They&apos;ll appear here for easy access later!
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
      <div>
        <h1 className="text-3xl font-bold">Wishlist</h1>
        <p className="text-muted-foreground mt-1">
          {wishlistProducts.length} item{wishlistProducts.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {wishlistProducts.map((product) => {
          const inCart = isInCart(product.id);

          return (
            <Card key={product.id} className="overflow-hidden group">
              <div className="relative aspect-square bg-muted">
                <Image
                  src={product.images[0] || "/placeholder.jpg"}
                  alt={product.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => removeFromWishlist(product.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {product.ecoImpactScore && product.ecoImpactScore >= 80 && (
                  <Badge className="absolute top-2 left-2 gap-1 bg-green-600">
                    <Leaf className="w-3 h-3" />
                    Eco+
                  </Badge>
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-medium line-clamp-1">{product.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    by {product.sellerName}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    ₹{product.price.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{product.averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      ({product.reviews.length})
                    </span>
                  </div>
                </div>

                {product.ecoImpactScore && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Leaf className="w-3 h-3 text-green-600" />
                      Eco Score: {product.ecoImpactScore}
                    </Badge>
                  </div>
                )}

                <Button
                  className="w-full"
                  variant={inCart ? "outline" : "default"}
                  onClick={() => {
                    if (!inCart) {
                      addToCart(product.id);
                    }
                  }}
                  disabled={inCart}
                >
                  {inCart ? (
                    <>Already in Cart</>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
