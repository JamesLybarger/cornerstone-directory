import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, ShoppingBag, Package, CheckCircle, Clock, Trash2, Edit, TrendingUp, Lock, ExternalLink, AlertCircle } from "lucide-react";

export default function SellerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/marketplace/seller/stats", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/marketplace/seller/stats", { headers: { "x-user-id": String(user!.id) } });
      return res.json();
    },
    enabled: !!user && user.membershipTier !== "free",
  });

  const { data: myListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/marketplace/my-listings", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/marketplace/my-listings", { headers: { "x-user-id": String(user!.id) } });
      return res.json();
    },
    enabled: !!user && user.membershipTier !== "free",
  });

  const { data: sellerStatus } = useQuery({
    queryKey: ["/api/marketplace/seller/status", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/marketplace/seller/status", { headers: { "x-user-id": String(user!.id) } });
      return res.json();
    },
    enabled: !!user && user.membershipTier !== "free",
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/marketplace/listings/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": String(user!.id) },
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/seller/stats"] });
      toast({ title: "Listing deleted" });
    },
  });

  // Admin: approve listing
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/marketplace/listings/${id}/approve`, {
        method: "PATCH",
        headers: { "x-user-id": String(user!.id) },
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/listings/all"] });
      toast({ title: "Listing approved and live!" });
    },
  });

  const { data: allListings = [], isLoading: allLoading } = useQuery({
    queryKey: ["/api/marketplace/listings/all", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/marketplace/listings/all", { headers: { "x-user-id": String(user!.id) } });
      return res.json();
    },
    enabled: !!user && user.role === "admin",
  });

  if (!user) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 text-center">
      <div>
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-black mb-2">Sign in required</h2>
        <Link href="/login"><Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold">Sign In</Button></Link>
      </div>
    </div>
  );

  if (user.membershipTier === "free") return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 text-center">
      <div>
        <Lock className="w-10 h-10 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-black mb-2">Paid membership required</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Upgrade to start selling digital products in the marketplace.</p>
        <Link href="/register"><Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">Become a Member</Button></Link>
      </div>
    </div>
  );

  const stripeConnected = sellerStatus?.profile?.payoutsEnabled;
  const pendingApprovalAll = user.role === "admin" ? allListings.filter((l: any) => !l.approved) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-black mb-1" data-testid="heading-seller-dashboard">
            {user.role === "admin" ? "Marketplace Admin" : "My Store"}
          </h1>
          <p className="text-xs text-muted-foreground">Manage your listings and track sales</p>
        </div>
        <div className="flex gap-2">
          {!stripeConnected && user.role !== "admin" && (
            <Link href="/seller/onboard">
              <Button size="sm" variant="outline" className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Connect Stripe
              </Button>
            </Link>
          )}
          <Link href="/marketplace">
            <Button size="sm" variant="outline">View Marketplace</Button>
          </Link>
          <Link href="/seller/new-listing">
            <Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn" data-testid="btn-new-listing">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stripe warning */}
      {!stripeConnected && user.role !== "admin" && (
        <div className="mb-8 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1">Connect Stripe to receive payments</p>
            <p className="text-xs text-muted-foreground mb-3">You can create listings, but payouts won't process until your Stripe account is connected.</p>
            <Link href="/seller/onboard">
              <Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Set Up Payouts
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statsLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : [
          { label: "Total Sales", value: stats?.totalSales ?? 0, icon: ShoppingBag },
          { label: "Revenue (94%)", value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign },
          { label: "Active Listings", value: stats?.activeListings ?? 0, icon: CheckCircle },
          { label: "Pending Review", value: stats?.pendingApproval ?? 0, icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 crimson-gradient rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[hsl(38,20%,96%)]" />
              </div>
              <div>
                <div className="text-lg font-black">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin: pending approvals */}
      {user.role === "admin" && pendingApprovalAll.length > 0 && (
        <div className="mb-10">
          <h2 className="font-black text-base mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" /> Pending Approval ({pendingApprovalAll.length})
          </h2>
          <div className="space-y-3">
            {pendingApprovalAll.map((l: any) => (
              <Card key={l.id} className="border-yellow-500/20">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{l.title}</p>
                    <p className="text-xs text-muted-foreground">by {l.sellerName} · {l.category} · ${l.price.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/marketplace/${l.id}`}>
                      <Button size="sm" variant="outline" className="text-xs">Preview</Button>
                    </Link>
                    <Button
                      size="sm"
                      className="crimson-gradient text-[hsl(38,20%,96%)] font-bold text-xs"
                      onClick={() => approveMutation.mutate(l.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* My listings */}
      <div>
        <h2 className="font-black text-base mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> {user.role === "admin" ? "All Listings" : "My Products"}
        </h2>
        {listingsLoading || (user.role === "admin" && allLoading) ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : (user.role === "admin" ? allListings : myListings).length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">No listings yet.</p>
            <Link href="/seller/new-listing">
              <Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Your First Listing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(user.role === "admin" ? allListings : myListings).map((l: any) => (
              <Card key={l.id} data-testid={`listing-row-${l.id}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-sm truncate">{l.title}</p>
                      {l.approved
                        ? <Badge variant="outline" className="text-xs text-green-400 border-green-400/40">Live</Badge>
                        : <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/40">Pending</Badge>
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {l.category} · ${l.price.toFixed(2)} · {l.salesCount} sold
                      {user.role === "admin" && l.sellerName && ` · by ${l.sellerName}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/marketplace/${l.id}`}>
                      <Button size="sm" variant="outline" className="text-xs" data-testid={`btn-preview-${l.id}`}>
                        <TrendingUp className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => { if (confirm("Delete this listing?")) deleteMutation.mutate(l.id); }}
                      data-testid={`btn-delete-${l.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
