import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Download, CheckCircle, Package, Loader2, Shield } from "lucide-react";

export default function MarketplaceListing() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["/api/marketplace/listings", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/marketplace/listings/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/marketplace/checkout", {
        listingId: id,
        buyerId: user?.id,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
      else toast({ title: "Checkout failed", description: data.error, variant: "destructive" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Skeleton className="h-64 rounded-2xl mb-6" />
      <Skeleton className="h-8 w-2/3 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );

  if (!listing) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
      <h2 className="text-xl font-black mb-2">Product not found</h2>
      <Link href="/marketplace"><Button variant="outline">Back to Marketplace</Button></Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <Link href="/marketplace">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Marketplace
        </Button>
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left — image / icon */}
        <div>
          {listing.imageUrl ? (
            <img src={listing.imageUrl} alt={listing.title} className="w-full rounded-2xl object-cover aspect-square" />
          ) : (
            <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Package className="w-20 h-20 text-primary/30" />
            </div>
          )}
        </div>

        {/* Right — details */}
        <div className="flex flex-col">
          <Badge variant="outline" className="w-fit mb-3 text-xs">{listing.category}</Badge>
          <h1 className="text-xl font-black mb-2 leading-tight">{listing.title}</h1>
          <p className="text-xs text-muted-foreground mb-4">
            by <strong className="text-foreground">{listing.sellerBusiness || listing.sellerName}</strong>
          </p>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{listing.description}</p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Download className="w-3.5 h-3.5" />
            <span>{listing.salesCount} copies sold</span>
            {listing.fileName && (
              <>
                <span>·</span>
                <span>Digital download — {listing.fileName}</span>
              </>
            )}
          </div>

          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Price</span>
                <span className="text-2xl font-black text-primary">${listing.price.toFixed(2)}</span>
              </div>
              <Button
                className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                data-testid="btn-buy-now"
              >
                {checkoutMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                ) : (
                  <><ShoppingCart className="w-4 h-4 mr-2" /> Buy Now</>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
            <span>Secure checkout via Stripe. Instant digital download after purchase.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
