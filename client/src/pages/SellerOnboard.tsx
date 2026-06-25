import { useEffect, useState } from "react";
import { useSearch, Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, Lock, CreditCard, ArrowRight, AlertCircle, ExternalLink } from "lucide-react";

export default function SellerOnboard() {
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const success = params.get("success");
  const refresh = params.get("refresh");
  const { toast } = useToast();

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch("/api/marketplace/seller/status", {
      headers: { "x-user-id": String(user.id) },
    })
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user?.id, success]);

  const startOnboarding = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/marketplace/seller/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": String(user!.id) },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast({ title: "Error", description: data.error, variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setStarting(false);
  };

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
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Upgrade to a Founding or Annual membership to start selling in the marketplace.</p>
        <Link href="/register"><Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">Become a Member</Button></Link>
      </div>
    </div>
  );

  const isComplete = status?.profile?.onboardingComplete && status?.profile?.payoutsEnabled;

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="w-14 h-14 crimson-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-[hsl(38,20%,96%)]" />
        </div>
        <h1 className="text-2xl font-black mb-2">Seller Setup</h1>
        <p className="text-sm text-muted-foreground">Connect your Stripe account to receive payments. You keep <strong className="text-foreground">94%</strong> of every sale.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : isComplete ? (
        <Card className="border-green-500/30">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-black text-lg mb-2">You're all set!</h3>
            <p className="text-sm text-muted-foreground mb-6">Your Stripe account is connected and payouts are enabled. Start listing your products.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/seller/new-listing">
                <Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">
                  List a Product <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/seller/dashboard">
                <Button variant="outline">My Store</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-black text-base">Connect Stripe to Get Paid</CardTitle>
            <CardDescription className="text-xs">
              Cornerstone uses Stripe Connect to send your earnings directly to your bank account. Setup takes about 2 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { step: "1", text: "Click Connect below — you'll be taken to Stripe's secure onboarding" },
                { step: "2", text: "Enter your personal and banking details (SSN last 4, bank account)" },
                { step: "3", text: "Return here and start listing products immediately" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-6 h-6 crimson-gradient rounded-full flex items-center justify-center text-xs font-black text-[hsl(38,20%,96%)] shrink-0">{step}</div>
                  <p className="text-sm text-muted-foreground pt-0.5">{text}</p>
                </div>
              ))}
            </div>

            {status?.profile?.stripeAccountId && !isComplete && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">Your Stripe setup is incomplete. Click below to finish it.</p>
              </div>
            )}

            <Button
              className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn"
              onClick={startOnboarding}
              disabled={starting}
              data-testid="btn-connect-stripe"
            >
              {starting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
              ) : (
                <><ExternalLink className="w-4 h-4 mr-2" /> Connect with Stripe</>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your banking details go directly to Stripe — Cornerstone never sees them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
