import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, UserPlus, Star, Gift, CreditCard, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function Register() {
  const [step, setStep] = useState<"form" | "redirecting">("form");
  const [createdUser, setCreatedUser] = useState<{ id: number; tier: string; referralCode: string } | null>(null);
  const { register: reg, handleSubmit, setValue, watch } = useForm();
  const { register: authRegister, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const prefillCode = params.get("ref") || "";

  const { data: founding } = useQuery({
    queryKey: ["/api/founding-spots"],
    queryFn: () => apiRequest("GET", "/api/founding-spots").then(r => r.json()),
  });

  const spotsLeft = founding?.remaining ?? "…";
  const isFull = founding?.isFull ?? false;

  // Stripe checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async ({ userId, referralCode }: { userId: number; referralCode: string }) => {
      const res = await apiRequest("POST", "/api/stripe/create-checkout", { userId, referralCode });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Checkout
      } else {
        toast({ title: "Checkout error", description: "No checkout URL returned.", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      setStep("form");
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const result = await authRegister(data);
      setCreatedUser({ id: result.user?.id, tier: result.tier, referralCode: data.referralCode || "" });
      setStep("redirecting");
      // Launch Stripe checkout
      checkoutMutation.mutate({ userId: result.user?.id, referralCode: data.referralCode || "" });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
  };

  // Redirecting state — account created, going to Stripe
  if (step === "redirecting") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 crimson-gradient rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-[hsl(38,20%,96%)]" />
          </div>
          <h2 className="text-2xl font-black mb-2">Account Created!</h2>
          <p className="text-muted-foreground mb-6">
            Taking you to secure checkout to complete your{" "}
            <strong className="text-foreground">
              {createdUser?.tier === "founding" ? "Founding Member ($59.99 lifetime)" : "Annual Member ($59.99/year)"}
            </strong>{" "}
            membership.
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to Stripe...
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Powered by Stripe — your payment info is never stored on our servers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 crimson-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-6 h-6 text-[hsl(38,20%,96%)]" />
          </div>
          <h1 className="text-2xl font-black mb-1">Join the Network</h1>
          <p className="text-sm text-muted-foreground">Connect with Christian entrepreneurs across America</p>
        </div>

        {/* Founding urgency */}
        {!isFull ? (
          <div className="mb-5 p-4 rounded-xl border border-primary/40 bg-primary/5 text-center">
            <p className="text-sm">
              <span className="gold-text font-black text-base">{spotsLeft} Founding spots left</span>
              <span className="text-foreground font-semibold"> — $59.99 lifetime access. </span>
              <span className="text-muted-foreground">No renewals, ever.</span>
            </p>
          </div>
        ) : (
          <div className="mb-5 p-4 rounded-xl border border-border bg-card text-center text-sm text-muted-foreground">
            Founding spots are full. Annual membership: <strong className="text-foreground">$59.99/year</strong>
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name *</Label>
                  <Input {...reg("firstName", { required: true })} placeholder="John" data-testid="input-first-name" />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input {...reg("lastName", { required: true })} placeholder="Smith" data-testid="input-last-name" />
                </div>
              </div>
              <div>
                <Label>Email *</Label>
                <Input {...reg("email", { required: true })} type="email" placeholder="you@example.com" data-testid="input-email" />
              </div>
              <div>
                <Label>Password *</Label>
                <Input {...reg("password", { required: true, minLength: 6 })} type="password" placeholder="Min. 6 characters" data-testid="input-password" />
              </div>
              <div>
                <Label>Business Name</Label>
                <Input {...reg("businessName")} placeholder="Your business (optional)" data-testid="input-business-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input {...reg("city")} placeholder="City" data-testid="input-city" />
                </div>
                <div>
                  <Label>State</Label>
                  <Select onValueChange={(v) => setValue("state", v)}>
                    <SelectTrigger data-testid="select-state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Referral Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  {...reg("referralCode")}
                  defaultValue={prefillCode}
                  placeholder="e.g. JOHN42"
                  data-testid="input-referral-code"
                />
                <p className="text-xs text-muted-foreground mt-1">Have a friend's referral code? Enter it here.</p>
              </div>

              {/* Stripe notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border text-xs text-muted-foreground">
                <CreditCard className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                <span>
                  After creating your account, you'll be taken to <strong className="text-foreground">Stripe's secure checkout</strong> to complete payment. We never store your card details.
                </span>
              </div>

              <Button
                type="submit"
                className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-black shine-btn h-11"
                disabled={isLoading || checkoutMutation.isPending}
                data-testid="btn-submit-register"
              >
                {isLoading || checkoutMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                  : `Join for ${isFull ? "$59.99/yr" : "$59.99 Lifetime"} →`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Membership tier assigned based on spot availability at checkout.
              </p>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already a member?{" "}
              <Link href="/login"><span className="text-primary hover:underline cursor-pointer font-semibold">Sign In</span></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
