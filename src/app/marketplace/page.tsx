"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/marketplace/product-card";
import { ProductDetail } from "@/components/marketplace/product-detail";
import { ProductForm } from "@/components/marketplace/product-form";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { MyListings } from "@/components/marketplace/my-listings";
import { CartSheet } from "@/components/marketplace/cart";
import { WishlistSheet } from "@/components/marketplace/wishlist";
import {
  MarketplaceStats,
  FeaturedProducts,
  CategoryCards,
} from "@/components/marketplace/marketplace-sections";
import {
  useMarketplaceStore,
  type Product,
  type ProductCategory,
} from "@/hooks/use-marketplace-store";
import { Plus, ShoppingBag, Store, User, ShoppingCart, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useMessagingStore } from "@/hooks/use-messaging-store";

export default function MarketplacePage() {
  const router = useRouter();
  const { filteredProducts, getProduct, setFilters, getCartItemCount, wishlist } = useMarketplaceStore();
  const { getOrCreateConversation } = useMessagingStore();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");

  const cartItemCount = getCartItemCount();
  const wishlistCount = wishlist.length;

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleViewProductById = (id: string) => {
    const product = getProduct(id);
    if (product) {
      setSelectedProduct(product);
      setShowProductDetail(true);
    }
  };

  const handleContactSeller = async (product: Product) => {
    const sellerId = `seller-${product.id}`;
    try {
      const conversationId = await getOrCreateConversation(
        sellerId,
        product.sellerName,
        product.id,
        product.title,
        product.images[0]
      );
      router.push(`/messages?conversation=${conversationId}`);
      toast({
        title: "Chat Started",
        description: `Opening conversation with ${product.sellerName}`,
      });
    } catch (err) {
      toast({
        title: "Could not start chat",
        description: (err as Error).message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectCategory = (category: ProductCategory | "all") => {
    setFilters({ category });
    setActiveTab("browse");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Marketplace
          </h1>
          <p className="text-muted-foreground">
            Buy and sell recycled products, upcycled crafts, and pre-owned eco-friendly items.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setShowWishlist(true)} className="relative">
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {wishlistCount}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowCart(true)} className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {cartItemCount}
              </Badge>
            )}
          </Button>
          <Button onClick={() => setShowAddProduct(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Sell Product
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="home" className="gap-2">
            <Store className="h-4 w-4" />
            Home
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="my-listings" className="gap-2">
            <User className="h-4 w-4" />
            My Listings
          </TabsTrigger>
        </TabsList>

        {/* Home Tab */}
        <TabsContent value="home" className="space-y-6 mt-6">
          <MarketplaceStats />
          <FeaturedProducts onViewProduct={handleViewProductById} />
          <CategoryCards onSelectCategory={handleSelectCategory} />
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-6 mt-6">
          <MarketplaceFilters />

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or search query
              </p>
              <Button variant="outline" onClick={() => setFilters({ 
                category: "all",
                condition: "all",
                searchQuery: "",
                minPrice: 0,
                maxPrice: 10000,
              })}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={handleViewProduct}
                  onContact={handleContactSeller}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Listings Tab */}
        <TabsContent value="my-listings" className="mt-6">
          <MyListings />
        </TabsContent>
      </Tabs>

      {/* Product Detail Modal */}
      <ProductDetail
        product={selectedProduct}
        open={showProductDetail}
        onOpenChange={setShowProductDetail}
      />

      {/* Add Product Form */}
      <ProductForm
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        mode="add"
      />

      {/* Cart Sheet */}
      <CartSheet
        open={showCart}
        onOpenChange={setShowCart}
        onViewProduct={handleViewProductById}
      />

      {/* Wishlist Sheet */}
      <WishlistSheet
        open={showWishlist}
        onOpenChange={setShowWishlist}
        onViewProduct={handleViewProductById}
      />
    </div>
  );
}
