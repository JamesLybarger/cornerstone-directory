import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Download, Loader2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function MarketplaceSuccess() {
  // Capture params immediately on mount — before any URL cleanup
  const [sessionId] = useState(() => new URLSearchParams(window.location.search).get("session_id"));
  const [listingId] = useState(() => new URLSearchParams(window.location.search).get("listing_id"));
  const { user } = useAuth();
  const verifiedRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState("");

  useEffect(() => {
    // Only run once — guard against re-runs from user loading
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    if (!sessionId || !listingId) {
      setStatus("error");
      setErrorMsg("Missing session or listing information.");
      return;
    }

    // Clean URL immediately so reload doesn't re-trigger
    window.history.replaceState({}, "", "/#/marketplace/success");

    const verify = async () => {
      try {
        const res = await apiRequest("POST", "/api/marketplace/verify-purchase", { sessionId, listingId, buyerId: user?.id });
        const data = await res.json();
        if (data.token) {
          setDownloadToken(data.token);
          // Fetch listing title
          try {
            const lr = await apiRequest("GET", `/api/marketplace/listings/${listingId}`);
            const listing = await lr.json();
            setListingTitle(listing.title || "your product");
          } catch {
            setListingTitle("your product");
          }
          setStatus("ready");
        } else {
          setErrorMsg(data.error || "Purchase verification failed.");
          setStatus("error");
        }
      } catch (e: any) {
        setErrorMsg(e?.message || "Could not confirm purchase.");
        setStatus("error");
      }
    };

    verify();
  }, []);

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
            <p className="text-sm text-muted-foreground mb-4">
              We couldn't confirm your purchase. If you were charged, please contact us at{" "}
              <a href="mailto:contact@cornerstonedirectory.com" className="underline">contact@cornerstonedirectory.com</a>{" "}
              with your order details.
            </p>
            {errorMsg && (
              <p className="text-xs text-destructive/80 bg-destructive/10 rounded p-3 mb-6 font-mono">{errorMsg}</p>
            )}
            <Link href="/marketplace">
              <Button variant="outline">Back to Marketplace</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
