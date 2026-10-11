"use client";

import React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMarketplaceStore, categoryLabels, type ProductCategory, type Product } from "@/hooks/use-marketplace-store";
import { Leaf, Package, Recycle, Sparkles, ShoppingBag, TrendingUp, Users, Eye, Laptop, Shirt } from "lucide-react";

interface FeaturedProductsProps {
  onViewProduct: (id: string) => void;
}

export function FeaturedProducts({ onViewProduct }: FeaturedProductsProps) {
  const { products } = useMarketplaceStore();
  const featuredProducts = products.filter((p: Product) => p.isFeatured);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (featuredProducts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Featured Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredProducts.map((product: Product) => (
            <Card 
              key={product.id} 
              className="group overflow-hidden cursor-pointer hover:shadow-md transition-all border-muted"
              onClick={() => onViewProduct(product.id)}
            >
              <div className="relative aspect-square bg-muted">
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                  {product.title}
                </h3>
                <p className="text-lg font-bold text-primary">
                  {formatPrice(product.price)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryCardsProps {
  onSelectCategory: (category: ProductCategory | "all") => void;
}

export function CategoryCards({ onSelectCategory }: CategoryCardsProps) {
  const categoryData: { category: ProductCategory; icon: React.ReactNode; color: string }[] = [
    { category: "recycled-plastic", icon: <Recycle className="h-6 w-6" />, color: "bg-blue-500/10 text-blue-600" },
    { category: "upcycled-crafts", icon: <Sparkles className="h-6 w-6" />, color: "bg-purple-500/10 text-purple-600" },
    { category: "refurbished-electronics", icon: <Laptop className="h-6 w-6" />, color: "bg-orange-500/10 text-orange-600" },
    { category: "eco-fashion", icon: <Shirt className="h-6 w-6" />, color: "bg-green-500/10 text-green-600" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Shop by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categoryData.map(({ category, icon, color }) => (
            <Card
              key={category}
              className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group border-muted"
              onClick={() => onSelectCategory(category)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-full ${color} group-hover:scale-110 transition-transform`}>
                  {icon}
                </div>
                <span className="font-medium text-sm">
                  {categoryLabels[category]}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketplaceStats() {
  const { products } = useMarketplaceStore();

  const stats = [
    {
      label: "Products Listed",
      value: products.length,
      icon: <Package className="h-5 w-5" />,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Items Sold",
      value: products.filter((p) => p.status === "sold").length,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "bg-green-500/10 text-green-600",
    },
    {
      label: "Active Sellers",
      value: new Set(products.map((p) => p.sellerName)).size,
      icon: <Users className="h-5 w-5" />,
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      label: "Total Views",
      value: products.reduce((acc, p) => acc + p.views, 0),
      icon: <Eye className="h-5 w-5" />,
      color: "bg-orange-500/10 text-orange-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Removed MarketplaceHero as it's not needed with the consistent page header style
