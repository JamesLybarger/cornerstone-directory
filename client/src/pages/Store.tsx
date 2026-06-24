import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { ShoppingBag, Download, Calendar, BookOpen, FileText, Star, Clock } from "lucide-react";
import { Link } from "wouter";

const CATEGORY_ICONS: Record<string, any> = {
  digital: Download,
  coaching: Calendar,
  course: BookOpen,
  resource: FileText,
};

const CATEGORIES = ["all", "digital", "coaching", "course", "resource"];

export default function Store() {
  const [activeCategory, setActiveCategory] = useState("all");
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("GET", "/api/products").then(r => r.json()),
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const purchase = useMutation({
    mutationFn: async (product: any) => {
      if (!user) throw new Error("Please sign in to purchase.");
      const res = await apiRequest("POST", "/api/orders", { userId: user.id, productId: product.id, amount: product.price, status: "completed" });
      if (!res.ok) throw new Error("Order failed");
      return res.json();
    },
    onSuccess: (_, product: any) => {
      toast({ title: "Purchase successful!", description: `"${product.title}" has been added to your library.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = activeCategory === "all" ? products : products.filter((p: any) => p.category === activeCategory);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-black mb-3" data-testid="heading-store">Cornerstone Resource Store</h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Digital tools and faith-aligned resources to grow your Christian business.
        </p>
        {/* Coming Soon Banner */}
        <div className="mt-6 p-5 rounded-xl border border-primary/40 bg-primary/5 flex items-start gap-4">
          <div className="w-10 h-10 crimson-gradient rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[hsl(38,20%,96%)]" />
          </div>
          <div>
            <p className="font-black text-foreground text-base mb-1">Store Coming Soon</p>
            <p className="text-sm text-muted-foreground">We're curating faith-aligned digital resources, templates, and tools for Christian business owners. Check back soon — great things are on the way.</p>
          </div>
        </div>
        <p className="verse-block mt-4 text-sm max-w-sm">
          "Wealth gained hastily will dwindle, but whoever gathers little by little will increase it." — Proverbs 13:11
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap mb-8" data-testid="category-filter">
        {CATEGORIES.map(cat => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            className={`capitalize ${activeCategory === cat ? "crimson-gradient text-[hsl(38,20%,96%)] font-bold" : ""}`}
            onClick={() => setActiveCategory(cat)}
            data-testid={`filter-${cat}`}
          >
            {cat === "all" ? "All Items" : cat}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product: any) => {
            const Icon = CATEGORY_ICONS[product.category] || ShoppingBag;
            return (
              <Card key={product.id} className="card-hover flex flex-col" data-testid={`card-product-${product.id}`}>
                {product.imageUrl && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                  </div>
                )}
                {!product.imageUrl && (
                  <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                    <Icon className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs capitalize">{product.category}</Badge>
                    {product.featured && <Star className="w-3.5 h-3.5 text-primary fill-primary" />}
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-1.5 leading-snug">{product.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">{product.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-xl font-black text-primary">${product.price.toFixed(2)}</span>
                    {user ? (
                      <Button
                        size="sm"
                        className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn"
                        onClick={() => purchase.mutate(product)}
                        disabled={purchase.isPending}
                        data-testid={`btn-buy-${product.id}`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                        {purchase.isPending ? "Processing..." : "Purchase"}
                      </Button>
                    ) : (
                      <Link href="/login">
                        <Button size="sm" variant="outline" data-testid={`btn-buy-guest-${product.id}`}>
                          Sign in to buy
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-20 text-muted-foreground">No products in this category yet.</div>
      )}
    </div>
  );
}
