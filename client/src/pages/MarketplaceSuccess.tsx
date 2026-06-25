import { useEffect, useState } from "react";
import { useSearch, Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Loader2, AlertCircle } from "lucide-react";

export default function MarketplaceSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");
  const listingId = params.get("listing_id");
  const { user } = useAuth();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState("");

  useEffect(() => {
    if (!sessionId || !listingId) { setStatus("error"); return; }

    const verify = async () => {
      try {
        const res = await fetch("/api/marketplace/verify-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, listingId, buyerId: user?.id }),
        });
        const data = await res.json();
        if (data.token) {
          setDownloadToken(data.token);
          // Fetch listing title
          const lr = await fetch(`/api/marketplace/listings/${listingId}`);
          const listing = await lr.json();
          setListingTitle(listing.title || "your product");
          setStatus("ready");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [sessionId, listingId, user?.id]);

  const handleDownload = () => {
    if (downloadToken) {
      window.open(`/api/marketplace/download/${downloadToken}`, "_blank");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {status === "loading" && (
          <div>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-black mb-2">Confirming your purchase…</h2>
            <p className="text-sm text-muted-foreground">This takes just a moment.</p>
          </div>
        )}

        {status === "ready" && (
          <div>
            <div className="w-16 h-16 crimson-gradient rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[hsl(38,20%,96%)]" />
            </div>
            <h1 className="text-2xl font-black mb-2">Purchase Complete!</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Thank you for your purchase of <strong className="text-foreground">{listingTitle}</strong>.
            </p>

            <Card className="mb-6">
              <CardContent className="p-6">
                <Button
                  className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn mb-3"
                  onClick={handleDownload}
                  data-testid="btn-download"
                >
                  <Download className="w-4 h-4 mr-2" /> Download Your File
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your download link is ready. Save the file to your device.
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-center">
              <Link href="/marketplace">
                <Button variant="outline" size="sm">Browse More Products</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">My Dashboard</Button>
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div>
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-black mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We couldn't confirm your purchase. If you were charged, please contact us at contact@cornerstonedirectory.com with your order details.
            </p>
            <Link href="/marketplace">
              <Button variant="outline">Back to Marketplace</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
