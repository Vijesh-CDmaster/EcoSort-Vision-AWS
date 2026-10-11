"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  useMarketplaceStore,
  categoryLabels,
  conditionLabels,
  deliveryLabels,
  type Product,
  type ProductCategory,
  type ProductCondition,
  type DeliveryOption,
} from "@/hooks/use-marketplace-store";
import { ImagePlus, Loader2, X, Leaf, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  mode: "add" | "edit";
}

export function ProductForm({ open, onOpenChange, product, mode }: ProductFormProps) {
  const { addProduct, updateProduct } = useMarketplaceStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: product?.title || "",
    description: product?.description || "",
    price: product?.price || 0,
    originalPrice: product?.originalPrice || 0,
    category: product?.category || ("recycled-plastic" as ProductCategory),
    condition: product?.condition || ("good" as ProductCondition),
    images: product?.images || [] as string[],
    sellerName: product?.sellerName || "",
    sellerContact: product?.sellerContact || "",
    sellerLocation: product?.sellerLocation || "",
    tags: product?.tags.join(", ") || "",
    isFeatured: product?.isFeatured || false,
    quantity: product?.quantity || 1,
    deliveryOption: product?.deliveryOption || ("both" as DeliveryOption),
    shippingCost: product?.shippingCost || 0,
    ecoImpactScore: product?.ecoImpactScore || 50,
    negotiable: product?.negotiable || false,
  });

  const [imageUrl, setImageUrl] = useState("");

  const categories = Object.entries(categoryLabels) as [ProductCategory, string][];
  const conditions = Object.entries(conditionLabels) as [ProductCondition, string][];
  const deliveryOptions = Object.entries(deliveryLabels) as [DeliveryOption, string][];

  const handleAddImage = () => {
    if (imageUrl && formData.images.length < 5) {
      setFormData({ ...formData, images: [...formData.images, imageUrl] });
      setImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        originalPrice: formData.originalPrice > formData.price ? formData.originalPrice : undefined,
        category: formData.category,
        condition: formData.condition,
        status: "available" as const,
        images: formData.images,
        sellerName: formData.sellerName,
        sellerContact: formData.sellerContact,
        sellerLocation: formData.sellerLocation,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isFeatured: formData.isFeatured,
        quantity: formData.quantity,
        deliveryOption: formData.deliveryOption,
        shippingCost: formData.shippingCost,
        ecoImpactScore: formData.ecoImpactScore,
        negotiable: formData.negotiable,
      };

      if (mode === "add") {
        addProduct(productData);
        toast({
          title: "Product Listed!",
          description: "Your product has been successfully listed on the marketplace.",
        });
      } else if (product) {
        updateProduct(product.id, productData);
        toast({
          title: "Product Updated!",
          description: "Your product listing has been updated.",
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "List a New Product" : "Edit Product"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Add your recycled, upcycled, or reusable product to the marketplace."
              : "Update your product listing details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Recycled Plastic Planter"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your product in detail..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as ProductCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condition *</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value as ProductCondition })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity and Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price (₹)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min="0"
                  placeholder="Optional"
                  value={formData.originalPrice || ""}
                  onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">For showing discount</p>
              </div>

              <div className="space-y-2 flex flex-col justify-center pt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.negotiable}
                    onCheckedChange={(checked) => setFormData({ ...formData, negotiable: checked })}
                  />
                  <Label>Negotiable</Label>
                </div>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery Option *
                </Label>
                <Select
                  value={formData.deliveryOption}
                  onValueChange={(value) => setFormData({ ...formData, deliveryOption: value as DeliveryOption })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryOptions.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.deliveryOption !== "pickup" && (
                <div className="space-y-2">
                  <Label htmlFor="shippingCost">Shipping Cost (₹)</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    min="0"
                    placeholder="0 for free shipping"
                    value={formData.shippingCost || ""}
                    onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>

            {/* Eco Impact Score */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-green-600" />
                Eco Impact Score: {formData.ecoImpactScore}
              </Label>
              <Slider
                value={[formData.ecoImpactScore]}
                onValueChange={([value]) => setFormData({ ...formData, ecoImpactScore: value })}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Rate the environmental benefit of this product (1-100). Higher scores for items that significantly reduce waste.
              </p>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <Label>Product Images (max 5)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste image URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddImage}
                disabled={!imageUrl || formData.images.length >= 5}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            </div>
            {formData.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Product ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seller Info */}
          <div className="space-y-4">
            <h4 className="font-medium">Seller Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sellerName">Your Name / Business *</Label>
                <Input
                  id="sellerName"
                  placeholder="e.g., Green Crafts"
                  value={formData.sellerName}
                  onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellerContact">Contact (Email/Phone) *</Label>
                <Input
                  id="sellerContact"
                  placeholder="e.g., email@example.com"
                  value={formData.sellerContact}
                  onChange={(e) => setFormData({ ...formData, sellerContact: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellerLocation">Location *</Label>
              <Input
                id="sellerLocation"
                placeholder="e.g., Chennai, TN"
                value={formData.sellerLocation}
                onChange={(e) => setFormData({ ...formData, sellerLocation: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., eco-friendly, handmade, sustainable"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Feature this listing</Label>
              <p className="text-sm text-muted-foreground">
                Featured products appear at the top of the marketplace
              </p>
            </div>
            <Switch
              checked={formData.isFeatured}
              onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "add" ? "List Product" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
