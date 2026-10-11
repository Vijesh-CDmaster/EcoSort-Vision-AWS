"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  useMarketplaceStore, 
  categoryLabels, 
  conditionLabels,
  deliveryLabels,
  type ProductCategory,
  type ProductCondition,
  type DeliveryOption,
} from "@/hooks/use-marketplace-store";
import { Filter, RotateCcw, Search, SlidersHorizontal, Star, Leaf, Truck, BadgePercent } from "lucide-react";

export function MarketplaceFilters() {
  const { filters, setFilters, resetFilters, filteredProducts } = useMarketplaceStore();

  const categories = Object.entries(categoryLabels) as [ProductCategory, string][];
  const conditions = Object.entries(conditionLabels) as [ProductCondition, string][];
  const deliveryOptions = Object.entries(deliveryLabels) as [DeliveryOption, string][];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ searchQuery: e.target.value })}
          className="pl-10"
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:flex flex-wrap gap-4 items-center">
        <Select
          value={filters.category}
          onValueChange={(value) => setFilters({ category: value as ProductCategory | "all" })}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.condition}
          onValueChange={(value) => setFilters({ condition: value as ProductCondition | "all" })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {conditions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.deliveryOption || "all"}
          onValueChange={(value) => setFilters({ deliveryOption: value === "all" ? undefined : value as DeliveryOption })}
        >
          <SelectTrigger className="w-[150px]">
            <Truck className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Delivery" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Delivery</SelectItem>
            {deliveryOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sortBy}
          onValueChange={(value) => setFilters({ sortBy: value as typeof filters.sortBy })}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="eco-score">Eco Score</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Price:</Label>
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice || ""}
            onChange={(e) => setFilters({ minPrice: Number(e.target.value) || 0 })}
            className="w-20"
          />
          <span>-</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice === 10000 ? "" : filters.maxPrice}
            onChange={(e) => setFilters({ maxPrice: Number(e.target.value) || 10000 })}
            className="w-20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          <Label className="text-sm whitespace-nowrap">{filters.minRating || 0}+</Label>
          <Slider
            value={[filters.minRating || 0]}
            onValueChange={([value]) => setFilters({ minRating: value })}
            min={0}
            max={5}
            step={1}
            className="w-20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={filters.negotiableOnly || false}
            onCheckedChange={(checked) => setFilters({ negotiableOnly: checked })}
          />
          <Label className="text-sm flex items-center gap-1">
            <BadgePercent className="h-4 w-4" />
            Negotiable
          </Label>
        </div>

        <Button variant="outline" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>

        <div className="ml-auto text-sm text-muted-foreground">
          {filteredProducts.length} products found
        </div>
      </div>

      {/* Mobile Filters */}
      <div className="flex md:hidden items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Products</SheetTitle>
              <SheetDescription>
                Refine your search results
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ category: value as ProductCategory | "all" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select
                  value={filters.condition}
                  onValueChange={(value) => setFilters({ condition: value as ProductCondition | "all" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    {conditions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => setFilters({ sortBy: value as typeof filters.sortBy })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="eco-score">Eco Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Delivery Option</Label>
                <Select
                  value={filters.deliveryOption || "all"}
                  onValueChange={(value) => setFilters({ deliveryOption: value === "all" ? undefined : value as DeliveryOption })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Delivery" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Delivery</SelectItem>
                    {deliveryOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Price Range: ₹{filters.minPrice} - ₹{filters.maxPrice}</Label>
                <Slider
                  value={[filters.minPrice, filters.maxPrice]}
                  onValueChange={([min, max]) => setFilters({ minPrice: min, maxPrice: max })}
                  max={50000}
                  step={100}
                />
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Minimum Rating: {filters.minRating || 0}+
                </Label>
                <Slider
                  value={[filters.minRating || 0]}
                  onValueChange={([value]) => setFilters({ minRating: value })}
                  min={0}
                  max={5}
                  step={1}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <BadgePercent className="h-4 w-4" />
                  Negotiable Only
                </Label>
                <Switch
                  checked={filters.negotiableOnly || false}
                  onCheckedChange={(checked) => setFilters({ negotiableOnly: checked })}
                />
              </div>

              <Button variant="outline" className="w-full" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <Select
          value={filters.sortBy}
          onValueChange={(value) => setFilters({ sortBy: value as typeof filters.sortBy })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-low">Price ↑</SelectItem>
            <SelectItem value="price-high">Price ↓</SelectItem>
            <SelectItem value="popular">Popular</SelectItem>
            <SelectItem value="rating">Rated</SelectItem>
            <SelectItem value="eco-score">Eco</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
