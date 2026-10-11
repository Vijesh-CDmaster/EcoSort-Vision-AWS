"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarketplaceStore,
  categoryLabels,
  type Product,
} from "@/hooks/use-marketplace-store";
import { ProductForm } from "./product-form";
import { Edit, Eye, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function MyListings() {
  const { products, updateProduct, deleteProduct } = useMarketplaceStore();
  const { toast } = useToast();
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // For demo purposes, show all products as "my listings"
  // In a real app, this would filter by current user ID
  const myListings = products;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleStatusChange = (product: Product, status: "available" | "sold" | "reserved") => {
    updateProduct(product.id, { status });
    toast({
      title: "Status Updated",
      description: `Product marked as ${status}`,
    });
  };

  const handleDelete = (product: Product) => {
    deleteProduct(product.id);
    toast({
      title: "Product Deleted",
      description: "Your listing has been removed.",
    });
  };

  const availableListings = myListings.filter((p: Product) => p.status === "available");
  const soldListings = myListings.filter((p: Product) => p.status === "sold");
  const reservedListings = myListings.filter((p: Product) => p.status === "reserved");

  const ListingCard = ({ product }: { product: Product }) => (
    <Card key={product.id}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium line-clamp-1">{product.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {categoryLabels[product.category]}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditProduct(product)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {product.status !== "available" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(product, "available")}>
                      Mark as Available
                    </DropdownMenuItem>
                  )}
                  {product.status !== "reserved" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(product, "reserved")}>
                      Mark as Reserved
                    </DropdownMenuItem>
                  )}
                  {product.status !== "sold" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(product, "sold")}>
                      Mark as Sold
                    </DropdownMenuItem>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          product listing.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="font-semibold text-primary">
                {formatPrice(product.price)}
              </span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                {product.views}
              </div>
            </div>

            <Badge
              variant={
                product.status === "available"
                  ? "default"
                  : product.status === "sold"
                  ? "secondary"
                  : "outline"
              }
              className="mt-2"
            >
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Listings</CardTitle>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Listing
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="available">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available">
              Available ({availableListings.length})
            </TabsTrigger>
            <TabsTrigger value="reserved">
              Reserved ({reservedListings.length})
            </TabsTrigger>
            <TabsTrigger value="sold">
              Sold ({soldListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4 mt-4">
            {availableListings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No available listings. Add your first product!
              </p>
            ) : (
              availableListings.map((product) => (
                <ListingCard key={product.id} product={product} />
              ))
            )}
          </TabsContent>

          <TabsContent value="reserved" className="space-y-4 mt-4">
            {reservedListings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No reserved listings.
              </p>
            ) : (
              reservedListings.map((product) => (
                <ListingCard key={product.id} product={product} />
              ))
            )}
          </TabsContent>

          <TabsContent value="sold" className="space-y-4 mt-4">
            {soldListings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No sold listings yet.
              </p>
            ) : (
              soldListings.map((product) => (
                <ListingCard key={product.id} product={product} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <ProductForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        mode="add"
      />

      {editProduct && (
        <ProductForm
          open={!!editProduct}
          onOpenChange={(open) => !open && setEditProduct(null)}
          product={editProduct}
          mode="edit"
        />
      )}
    </Card>
  );
}
