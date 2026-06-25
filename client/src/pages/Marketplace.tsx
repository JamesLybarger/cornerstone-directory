import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Search, Store, Plus, Star, Download, BookOpen, FileText, Hammer, Palette, Lightbulb, Package } from "lucide-react";

const CATEGORIES = [
  "All",
  "Digital Books",
  "Business Templates",
  "Construction & Project Plans",
  "Faith Resources",
  "Craft Patterns",
  "Bible Study",
  "Other",
];

const CATEGORY_ICONS: Record<string, any> = {
  "Digital Books": BookOpen,
  "Business Templates": FileText,
  "Construction & Project Plans": Hammer,
  "Faith Resources": Star,
  "Craft Patterns": Palette,
  "Bible Study": BookOpen,
  "Other": Package,
};

export default function Marketplace() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["/api/marketplace/listings", category],
    queryFn: async () => {
      const url = category !== "All"
        ? `/api/marketplace/listings?category=${encodeURIComponent(category)}`
        : "/api/marketplace/listings";
      const res = await fetch(url);
      return res.json();
    },
  });

  const filtered = listings.filter((l: any) =>
    search === "" ||
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    l.sellerName?.toLowerCase().includes(search.toLowerCase())
  );

  const isPaid = user && user.membershipTier !== "free";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 crimson-gradient rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-[hsl(38,20%,96%)]" />
            </div>
            <h1 className="text-2xl font-black">Member Marketplace</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg">
            Digital products created by Christian entrepreneurs — books, templates, project plans, faith resources, and more.
            <span className="text-primary font-semibold"> Sellers keep 94%.</span>
          </p>
        </div>
        <div className="flex gap-2">
          {isPaid && (
            <Link href="/seller/dashboard">
              <Button variant="outline" size="sm" data-testid="btn-seller-dashboard">
                My Store
              </Button>
            </Link>
          )}
          {isPaid && (
            <Link href="/seller/new-listing">
              <Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn" data-testid="btn-new-listing">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Sell a Product
              </Button>
            </Link>
          )}
          {!user && (
            <Link href="/register">
              <Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold">
                Join to Sell
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products, sellers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-56" data-testid="select-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Listings grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-black text-lg mb-2">No products yet</p>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            {isPaid ? "Be the first to list a product in the Cornerstone Marketplace." : "Join as a paid member to start selling your digital products."}
          </p>
          {isPaid && (
            <Link href="/seller/new-listing">
              <Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">
                <Plus className="w-4 h-4 mr-2" /> List Your First Product
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((listing: any) => {
            const Icon = CATEGORY_ICONS[listing.category] || Package;
            return (
              <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                <Card className="card-hover cursor-pointer h-full" data-testid={`listing-card-${listing.id}`}>
                  <CardContent className="p-0">
                    {/* Image or placeholder */}
                    {listing.imageUrl ? (
                      <div className="h-40 rounded-t-xl overflow-hidden">
                        <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-40 rounded-t-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Icon className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-black text-sm leading-snug line-clamp-2">{listing.title}</h3>
                        <span className="font-black text-primary text-base shrink-0">${listing.price.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs capitalize">{listing.category}</Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Download className="w-3 h-3" />
                          {listing.salesCount} sold
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">by {listing.sellerBusiness || listing.sellerName}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Seller CTA banner */}
      {!isPaid && (
        <div className="mt-16 p-8 rounded-2xl border border-primary/20 bg-card text-center">
          <Lightbulb className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-black text-lg mb-2">Start selling your knowledge</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
            Founding and Annual members can sell digital products here and keep <strong className="text-foreground">94% of every sale</strong> — the lowest platform fee in the market.
          </p>
          <Link href="/register">
            <Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">Become a Member</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
