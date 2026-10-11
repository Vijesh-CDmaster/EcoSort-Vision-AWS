"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Product, 
  categoryLabels, 
  conditionLabels,
  deliveryLabels,
  useMarketplaceStore,
} from "@/hooks/use-marketplace-store";
import { useMessagingStore } from "@/hooks/use-messaging-store";
import { 
  Calendar, 
  Eye, 
  Heart, 
  Leaf,
  Mail, 
  MapPin, 
  MessageCircle, 
  Minus,
  Package,
  Phone, 
  Plus,
  Share2, 
  ShoppingCart,
  Star,
  Tag,
  ThumbsUp,
  Truck,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductDetailProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetail({ product, open, onOpenChange }: ProductDetailProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { incrementViews, isInWishlist, addToWishlist, removeFromWishlist, addToCart, addReview, markReviewHelpful } = useMarketplaceStore();
  const { getOrCreateConversation } = useMessagingStore();
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewName, setReviewName] = useState("");

  const inWishlist = product ? isInWishlist(product.id) : false;

  React.useEffect(() => {
    if (product && open) {
      incrementViews(product.id);
      setQuantity(1);
    }
  }, [product?.id, open]);

  if (!product) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const conditionColor = {
    "new": "bg-green-500/10 text-green-600 border-green-500/20",
    "like-new": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "good": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    "fair": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.title,
        text: product.description,
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Product link copied to clipboard.",
      });
    }
  };

  const handleContactSeller = async () => {
    // Create or get existing conversation and navigate to messages
    const sellerId = `seller-${product.id}`;
    try {
      const conversationId = await getOrCreateConversation(
        sellerId,
        product.sellerName,
        product.id,
        product.title,
        product.images[0]
      );
      onOpenChange(false);
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

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast({ title: "Removed from Wishlist" });
    } else {
      addToWishlist(product.id);
      toast({ title: "Added to Wishlist" });
    }
  };

  const handleAddToCart = () => {
    addToCart(product.id, quantity);
    toast({ 
      title: "Added to Cart",
      description: `${quantity} x ${product.title} added to your cart.`
    });
  };

  const handleSubmitReview = () => {
    if (!reviewComment.trim() || !reviewName.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    addReview(product.id, {
      userId: crypto.randomUUID(),
      userName: reviewName,
      rating: reviewRating,
      comment: reviewComment,
    });
    toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
    setReviewComment("");
    setReviewName("");
    setReviewRating(5);
  };

  const discountPercent = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Gallery */}
          <div className="relative bg-muted">
            <div className="aspect-square relative">
              {product.images[currentImageIndex] ? (
                <Image
                  src={product.images[currentImageIndex]}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                      index === currentImageIndex 
                        ? "border-primary scale-110" 
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.isFeatured && (
                <Badge className="bg-primary text-primary-foreground">Featured</Badge>
              )}
              {discountPercent > 0 && (
                <Badge className="bg-red-500 text-white">{discountPercent}% OFF</Badge>
              )}
              {product.negotiable && (
                <Badge variant="outline" className="bg-background/90">Negotiable</Badge>
              )}
            </div>

            {/* Eco Score */}
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-full text-sm">
              <Leaf className="h-4 w-4" />
              {product.ecoImpactScore}
            </div>
          </div>

          {/* Product Details */}
          <div className="p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="text-left">
              <div className="flex items-start justify-between gap-4">
                <DialogTitle className="text-2xl">{product.title}</DialogTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={handleShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleWishlistToggle}
                    className={inWishlist ? "text-red-500" : ""}
                  >
                    <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Rating */}
            {product.averageRating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= product.averageRating
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.averageRating.toFixed(1)} ({product.reviews.length} reviews)
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={conditionColor[product.condition]}>
                {conditionLabels[product.condition]}
              </Badge>
              <Badge variant="outline">
                {categoryLabels[product.category]}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                {product.views} views
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Delivery & Stock */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span>{deliveryLabels[product.deliveryOption]}</span>
                {product.shippingCost === 0 ? (
                  <Badge variant="secondary" className="text-xs">Free Shipping</Badge>
                ) : product.shippingCost ? (
                  <span className="text-muted-foreground">+{formatPrice(product.shippingCost)}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>{product.quantity} available</span>
              </div>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                  disabled={quantity >= product.quantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button className="flex-1" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>

            <Separator />

            {/* Tabs for Description, Seller, Reviews */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="description">Details</TabsTrigger>
                <TabsTrigger value="seller">Seller</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({product.reviews.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="space-y-4 mt-4">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {product.description}
                </p>

                {/* Eco Impact */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-600" />
                    Eco Impact Score
                  </h4>
                  <div className="flex items-center gap-3">
                    <Progress value={product.ecoImpactScore} className="flex-1" />
                    <span className="font-bold text-green-600">{product.ecoImpactScore}/100</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This score represents the environmental benefit of buying this product.
                  </p>
                </div>

                {product.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {product.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="seller" className="space-y-4 mt-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{product.sellerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{product.sellerLocation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.sellerContact.includes("@") ? (
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{product.sellerContact}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Listed on {formatDate(product.createdAt)}</span>
                  </div>
                </div>
                <Button className="w-full" onClick={handleContactSeller}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Seller
                </Button>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4 mt-4">
                {/* Review List */}
                {product.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {product.reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{review.userName}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= review.rating
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => markReviewHelpful(product.id, review.id)}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Helpful ({review.helpful})
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No reviews yet. Be the first to review!
                  </p>
                )}

                {/* Add Review Form */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold">Write a Review</h4>
                  <Input
                    placeholder="Your name"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= reviewRating
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Write your review..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleSubmitReview} className="w-full">
                    Submit Review
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
