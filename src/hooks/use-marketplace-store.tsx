"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";

export type ProductCategory = 
  | "recycled-plastic" 
  | "upcycled-crafts" 
  | "refurbished-electronics"
  | "organic-compost"
  | "eco-fashion"
  | "pre-owned"
  | "other";

export type ProductCondition = "new" | "like-new" | "good" | "fair";
export type ProductStatus = "available" | "sold" | "reserved";
export type DeliveryOption = "pickup" | "shipping" | "both";

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: ProductCategory;
  condition: ProductCondition;
  status: ProductStatus;
  images: string[];
  sellerName: string;
  sellerContact: string;
  sellerLocation: string;
  createdAt: string;
  views: number;
  tags: string[];
  isFeatured?: boolean;
  quantity: number;
  deliveryOption: DeliveryOption;
  shippingCost?: number;
  ecoImpactScore: number;
  reviews: Review[];
  averageRating: number;
  negotiable?: boolean;
}

export interface MarketplaceFilters {
  category: ProductCategory | "all";
  condition: ProductCondition | "all";
  minPrice: number;
  maxPrice: number;
  searchQuery: string;
  sortBy: "newest" | "oldest" | "price-low" | "price-high" | "popular" | "rating" | "eco-score";
  deliveryOption?: DeliveryOption;
  minRating?: number;
  negotiableOnly?: boolean;
}

export const categoryLabels: Record<ProductCategory, string> = {
  "recycled-plastic": "Recycled Plastic",
  "upcycled-crafts": "Upcycled Crafts",
  "refurbished-electronics": "Refurbished Electronics",
  "organic-compost": "Organic Compost",
  "eco-fashion": "Eco Fashion",
  "pre-owned": "Pre-owned Items",
  "other": "Other",
};

export const conditionLabels: Record<ProductCondition, string> = {
  "new": "New",
  "like-new": "Like New",
  "good": "Good",
  "fair": "Fair",
};

export const deliveryLabels: Record<DeliveryOption, string> = {
  "pickup": "Pickup Only",
  "shipping": "Shipping Only",
  "both": "Pickup & Shipping",
};

interface MarketplaceState {
  products: Product[];
  filters: MarketplaceFilters;
  wishlist: string[];
  cart: CartItem[];
  recentlyViewed: string[];
}

interface MarketplaceContextType extends MarketplaceState {
  // Products
  addProduct: (product: Omit<Product, "id" | "createdAt" | "views" | "reviews" | "averageRating">) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  incrementViews: (id: string) => void;
  
  // Filters
  setFilters: (filters: Partial<MarketplaceFilters>) => void;
  resetFilters: () => void;
  filteredProducts: Product[];
  
  // Wishlist
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistProducts: Product[];
  
  // Cart
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  cartProducts: { product: Product; quantity: number }[];
  
  // Reviews
  addReview: (productId: string, review: Omit<Review, "id" | "productId" | "createdAt" | "helpful">) => void;
  markReviewHelpful: (productId: string, reviewId: string) => void;
  
  // Recently Viewed
  recentlyViewedProducts: Product[];

  // Backend status
  isLoading: boolean;
  backendError?: string;
  refreshProducts: () => Promise<void>;
}

const defaultFilters: MarketplaceFilters = {
  category: "all",
  condition: "all",
  minPrice: 0,
  maxPrice: 10000,
  searchQuery: "",
  sortBy: "newest",
};

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

const STORAGE_KEY = "ecosort-marketplace";

// Client-side state that is genuinely per-user ephemeral UX state (kept in
// localStorage). Products/reviews/orders now live in the PostgreSQL backend.
function loadClientState(): Pick<MarketplaceState, "filters" | "wishlist" | "cart" | "recentlyViewed"> {
  const empty = {
    filters: defaultFilters,
    wishlist: [] as string[],
    cart: [] as CartItem[],
    recentlyViewed: [] as string[],
  };
  if (typeof window === "undefined") return empty;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return empty;
    const parsed = JSON.parse(stored);
    return {
      filters: { ...defaultFilters, ...(parsed.filters ?? {}) },
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      recentlyViewed: Array.isArray(parsed.recentlyViewed) ? parsed.recentlyViewed : [],
    };
  } catch {
    return empty;
  }
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFiltersState] = useState<MarketplaceFilters>(defaultFilters);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | undefined>(undefined);

  // Load client-side UX state from localStorage
  useEffect(() => {
    const client = loadClientState();
    setFiltersState(client.filters);
    setWishlist(client.wishlist);
    setCart(client.cart);
    setRecentlyViewed(client.recentlyViewed);
  }, []);

  // Persist client-side UX state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ filters, wishlist, cart, recentlyViewed })
      );
    } catch {
      // ignore
    }
  }, [filters, wishlist, cart, recentlyViewed]);

  const refreshProducts = useCallback(async () => {
    const res = await api.get<{ products: Product[] }>("/db/products");
    if (res.ok && res.data) {
      setProducts(res.data.products);
      setBackendError(undefined);
    } else {
      setBackendError(res.error);
    }
    setIsLoading(false);
  }, []);

  // Load products from the backend
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const applyProduct = useCallback((product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists ? prev.map((p) => (p.id === product.id ? product : p)) : [product, ...prev];
    });
  }, []);

  // Product operations (optimistic + backend sync)
  const addProduct: MarketplaceContextType["addProduct"] = useCallback((product) => {
    const id = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...product,
      id,
      createdAt: new Date().toISOString(),
      views: 0,
      reviews: [],
      averageRating: 0,
    };
    setProducts((prev) => [newProduct, ...prev]);
    api.post<Product>("/db/products", newProduct).then((res) => {
      if (res.ok && res.data) applyProduct(res.data);
    });
  }, [applyProduct]);

  const updateProduct: MarketplaceContextType["updateProduct"] = useCallback((id, updates) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    api.put<Product>(`/db/products/${id}`, updates).then((res) => {
      if (res.ok && res.data) applyProduct(res.data);
    });
  }, [applyProduct]);

  const deleteProduct: MarketplaceContextType["deleteProduct"] = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    api.del(`/db/products/${id}`);
  }, []);

  const getProduct: MarketplaceContextType["getProduct"] = useCallback(
    (id) => products.find((p) => p.id === id),
    [products]
  );

  const incrementViews: MarketplaceContextType["incrementViews"] = useCallback((id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, views: p.views + 1 } : p))
    );
    setRecentlyViewed((prev) => [id, ...prev.filter((vid) => vid !== id)].slice(0, 10));
    api.post<Product>(`/db/products/${id}/view`).then((res) => {
      if (res.ok && res.data) applyProduct(res.data);
    });
  }, [applyProduct]);

  // Filter operations
  const setFilters: MarketplaceContextType["setFilters"] = useCallback((newFilters) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters: MarketplaceContextType["resetFilters"] = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  // Compute filtered products
  const filteredProducts = React.useMemo(() => {
    let result = [...products];

    if (filters.category !== "all") {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters.condition !== "all") {
      result = result.filter((p) => p.condition === filters.condition);
    }
    if (filters.deliveryOption) {
      result = result.filter((p) => p.deliveryOption === filters.deliveryOption || p.deliveryOption === "both");
    }
    if (filters.minRating && filters.minRating > 0) {
      result = result.filter((p) => p.averageRating >= (filters.minRating || 0));
    }
    if (filters.negotiableOnly) {
      result = result.filter((p) => p.negotiable);
    }
    result = result.filter((p) => p.price >= filters.minPrice && p.price <= filters.maxPrice);
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    switch (filters.sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "popular":
        result.sort((a, b) => b.views - a.views);
        break;
      case "rating":
        result.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case "eco-score":
        result.sort((a, b) => b.ecoImpactScore - a.ecoImpactScore);
        break;
    }

    return result;
  }, [products, filters]);

  // Wishlist operations
  const addToWishlist: MarketplaceContextType["addToWishlist"] = useCallback((productId) => {
    setWishlist((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
  }, []);

  const removeFromWishlist: MarketplaceContextType["removeFromWishlist"] = useCallback((productId) => {
    setWishlist((prev) => prev.filter((id) => id !== productId));
  }, []);

  const isInWishlist: MarketplaceContextType["isInWishlist"] = useCallback(
    (productId) => wishlist.includes(productId),
    [wishlist]
  );

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  // Cart operations
  const addToCart: MarketplaceContextType["addToCart"] = useCallback((productId, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { productId, quantity, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFromCart: MarketplaceContextType["removeFromCart"] = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateCartQuantity: MarketplaceContextType["updateCartQuantity"] = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }, [removeFromCart]);

  const clearCart: MarketplaceContextType["clearCart"] = useCallback(() => {
    setCart([]);
  }, []);

  const getCartTotal: MarketplaceContextType["getCartTotal"] = useCallback(() => {
    return cart.reduce((total, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        return total + product.price * item.quantity + (product.shippingCost || 0);
      }
      return total;
    }, 0);
  }, [cart, products]);

  const getCartItemCount: MarketplaceContextType["getCartItemCount"] = useCallback(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  const cartProducts = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { product, quantity: item.quantity } : null;
    })
    .filter((item): item is { product: Product; quantity: number } => item !== null);

  // Review operations
  const addReview: MarketplaceContextType["addReview"] = useCallback((productId, review) => {
    api.post<Product>(`/db/products/${productId}/reviews`, {
      userId: review.userId,
      userName: review.userName,
      rating: review.rating,
      comment: review.comment,
    }).then((res) => {
      if (res.ok && res.data) applyProduct(res.data);
    });
  }, [applyProduct]);

  const markReviewHelpful: MarketplaceContextType["markReviewHelpful"] = useCallback((_productId, reviewId) => {
    api.post<Product>(`/db/reviews/${reviewId}/helpful`).then((res) => {
      if (res.ok && res.data) applyProduct(res.data);
    });
  }, [applyProduct]);

  const recentlyViewedProducts = recentlyViewed
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);

  const contextValue = React.useMemo(
    () => ({
      products,
      filters,
      wishlist,
      cart,
      recentlyViewed,
      addProduct,
      updateProduct,
      deleteProduct,
      getProduct,
      incrementViews,
      setFilters,
      resetFilters,
      filteredProducts,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      wishlistProducts,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      getCartTotal,
      getCartItemCount,
      cartProducts,
      addReview,
      markReviewHelpful,
      recentlyViewedProducts,
      isLoading,
      backendError,
      refreshProducts,
    }),
    [
      products, filters, wishlist, cart, recentlyViewed,
      addProduct, updateProduct, deleteProduct, getProduct, incrementViews,
      setFilters, resetFilters, filteredProducts,
      addToWishlist, removeFromWishlist, isInWishlist, wishlistProducts,
      addToCart, removeFromCart, updateCartQuantity, clearCart,
      getCartTotal, getCartItemCount, cartProducts,
      addReview, markReviewHelpful, recentlyViewedProducts,
      isLoading, backendError, refreshProducts,
    ]
  );

  return (
    <MarketplaceContext.Provider value={contextValue}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplaceStore() {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error("useMarketplaceStore must be used within a MarketplaceProvider");
  }
  return context;
}
