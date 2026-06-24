import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, BookOpen, CheckCircle, ArrowRight, Lock, Gift, Copy, DollarSign, PartyPopper } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const paymentStatus = new URLSearchParams(search).get("payment");
  const { toast } = useToast();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders/user", user?.id],
    queryFn: () => apiRequest("GET", `/api/orders/user/${user?.id}`).then(r => r.json()),
    enabled: !!user,
  });

  const { data: referralData } = useQuery({
    queryKey: ["/api/referrals/my", user?.id],
    queryFn: () => apiRequest("GET", `/api/referrals/my/${user?.id}`).then(r => r.json()),
    enabled: !!user && user.membershipTier !== "free",
  });

  if (!user) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 text-center">
      <div>
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-black mb-2">Sign in to view your dashboard</h2>
        <p className="text-muted-foreground mb-6 text-sm">Your personalized faith business hub.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/login"><Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold">Sign In</Button></Link>
          <Link href="/register"><Button variant="outline">Join Now</Button></Link>
        </div>
      </div>
    </div>
  );

  const tierLabels: Record<string, string> = {
    founding: "Founding Member",
    annual: "Annual Member",
    free: "Free Member",
  };
  const tierBadge: Record<string, string> = {
    founding: "badge-founding",
    annual: "badge-annual",
    free: "badge-free",
  };

  const isPaid = user.membershipTier !== "free";

  // Build referral link using current origin
  const referralLink = user.referralCode
    ? `${window.location.origin}${window.location.pathname}#/register?ref=${user.referralCode}`
    : null;

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Referral link copied!", description: "Share it with other Christian entrepreneurs." });
  };

  const totalCredit = referralData?.totalCredit ?? user.referralCredit ?? 0;
  const renewalAfterCredit = Math.max(0, 59.99 - totalCredit).toFixed(2);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      {/* Payment success banner */}
      {paymentStatus === "success" && (
        <div className="mb-8 p-5 rounded-xl border border-primary/40 bg-primary/5 flex items-start gap-4">
          <div className="w-10 h-10 crimson-gradient rounded-full flex items-center justify-center shrink-0">
            <PartyPopper className="w-5 h-5 text-[hsl(38,20%,96%)]" />
          </div>
          <div>
            <p className="font-black text-foreground text-base mb-0.5">Payment confirmed — welcome to Cornerstone Directory!</p>
            <p className="text-sm text-muted-foreground">
              Your <strong className="text-foreground">{user.membershipTier === "founding" ? "Founding Member (Lifetime)" : "Annual Member"}</strong> access is now active.
              Share your referral link below to earn <strong className="text-foreground">$4.99 credit</strong> for every member you bring in.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 crimson-gradient rounded-xl flex items-center justify-center text-base font-black text-[hsl(38,20%,96%)]">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-black leading-none" data-testid="heading-dashboard">
                Welcome, {user.firstName}!
              </h1>
              <span className={`badge-tier ${tierBadge[user.membershipTier] || "badge-free"} mt-1`}>
                {tierLabels[user.membershipTier] || "Member"}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {user.membershipTier === "founding"
              ? "Lifetime access — you never pay again."
              : user.membershipTier === "annual"
              ? `Annual membership — $59.99/yr${totalCredit > 0 ? ` (${totalCredit.toFixed(2)} referral credit applied)` : ""}`
              : "Free access — browse the directory and read content."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { logout(); setLocation("/"); }} data-testid="btn-logout">
          Sign Out
        </Button>
      </div>

      {/* Upgrade prompt for free members */}
      {!isPaid && (
        <div className="mb-8 p-5 rounded-2xl border border-primary/30 bg-card flex items-start gap-4">
          <div className="w-10 h-10 crimson-gradient rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-[hsl(38,20%,96%)]" />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Upgrade to list your business</h3>
            <p className="text-sm text-muted-foreground mb-3">Paid members can list their business, unlock premium resources, and earn referral credits.</p>
            <Link href="/register">
              <Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">Become a Member</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Purchases", value: orders.length, icon: ShoppingBag, href: "/store" },
          { label: "Referrals", value: referralData?.count ?? 0, icon: Gift, href: "#" },
          { label: isPaid ? "Credit" : "Tier", value: isPaid ? `$${totalCredit.toFixed(2)}` : "Free", icon: DollarSign, href: "#" },
          { label: "Resources", value: "Unlocked", icon: BookOpen, href: "/resources" },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="card-hover cursor-pointer" data-testid={`stat-card-${label.toLowerCase()}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 crimson-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[hsl(38,20%,96%)]" />
                </div>
                <div>
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isPaid ? "referrals" : "profile"}>
        <TabsList className="mb-6 flex-wrap">
          {isPaid && <TabsTrigger value="referrals" data-testid="tab-referrals">Referrals & Credits</TabsTrigger>}
          <TabsTrigger value="orders" data-testid="tab-orders">Purchases</TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
        </TabsList>

        {/* REFERRALS TAB */}
        {isPaid && (
          <TabsContent value="referrals">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Referral link card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-black text-sm flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" /> Your Referral Link
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Share this link. Every new annual member who signs up earns you <strong className="text-foreground">$4.99 credit</strong> toward your next renewal.
                  </p>
                  {referralLink && (
                    <div className="flex gap-2">
                      <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground font-mono truncate border border-border">
                        {referralLink}
                      </div>
                      <Button size="sm" variant="outline" onClick={copyReferralLink} data-testid="btn-copy-referral">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Your code: <strong className="text-foreground">{user.referralCode}</strong></p>
                </CardContent>
              </Card>

              {/* Credit summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-black text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Referral Credits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-black text-primary">${totalCredit.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground mb-1">accumulated</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {referralData?.count ?? 0} successful referral{(referralData?.count ?? 0) !== 1 ? "s" : ""} × $4.99 each
                  </p>
                  {user.membershipTier === "annual" && (
                    <div className="p-3 rounded-lg bg-muted border border-border">
                      <p className="text-xs text-muted-foreground">
                        Your next renewal: <strong className="text-foreground">${renewalAfterCredit}</strong>
                        {totalCredit > 0 && <span className="text-primary"> (after ${totalCredit.toFixed(2)} credit)</span>}
                      </p>
                    </div>
                  )}
                  {user.membershipTier === "founding" && (
                    <div className="p-3 rounded-lg bg-muted border border-border">
                      <p className="text-xs text-muted-foreground">
                        As a Founding Member you have lifetime access — credits can be gifted or used for store purchases in a future update.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Referral history */}
            <h3 className="font-black text-sm mb-3">Referral History</h3>
            {!referralData?.referrals?.length ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Gift className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-2">No referrals yet.</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">Copy your referral link and share it with other Christian entrepreneurs. Each one who joins earns you $4.99.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referralData.referrals.map((r: any) => (
                  <Card key={r.id} data-testid={`referral-${r.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="font-bold text-sm">New member referred</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="font-black text-primary">+${r.creditAmount.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ORDERS TAB */}
        <TabsContent value="orders">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">Purchased Resources</h2>
            <Link href="/store">
              <Button size="sm" variant="outline" data-testid="btn-browse-store">Browse Store <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Button>
            </Link>
          </div>
          {ordersLoading ? <Skeleton className="h-32 rounded-xl" /> : orders.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No purchases yet.</p>
              <Link href="/store"><Button size="sm" variant="outline" className="mt-4">Visit the Store</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o: any) => (
                <Card key={o.id} data-testid={`order-${o.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      <div>
                        <p className="font-bold text-sm">Order #{o.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-primary text-sm">${o.amount.toFixed(2)}</span>
                      <Badge variant="outline" className="capitalize text-xs">{o.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="font-black text-base">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "First Name", value: user.firstName },
                  { label: "Last Name", value: user.lastName },
                  { label: "Email", value: user.email },
                  { label: "Business", value: user.businessName || "—" },
                  { label: "Location", value: user.city && user.state ? `${user.city}, ${user.state}` : user.state || "—" },
                  { label: "Membership", value: tierLabels[user.membershipTier] || user.membershipTier },
                  { label: "Referral Code", value: user.referralCode || "—" },
                ].map(({ label, value }) => (
                  <div key={label} data-testid={`profile-${label.toLowerCase().replace(/\s/g, '-')}`}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
