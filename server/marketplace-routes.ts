import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import crypto from "crypto";
import { storage } from "./storage";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const PLATFORM_FEE_PERCENT = 0.06; // 6%
const APP_URL = (process.env.APP_URL || "https://cornerstonedirectory.com").replace(/\/$/, "");

// Cloudflare R2 (S3-compatible) - persistent file storage
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME || "cornerstone-marketplace-files";

function genToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function registerMarketplaceRoutes(app: Express) {

  // ─── SELLER ONBOARDING ────────────────────────────────────────────────────

  // Create / get seller profile
  app.post("/api/marketplace/seller/onboard", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || user.membershipTier === "free") {
        return res.status(403).json({ error: "Paid membership required to become a seller." });
      }

      let profile = await storage.getSellerProfile(userId);

      if (!profile) {
        // Create Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email,
          capabilities: { transfers: { requested: true } },
          business_type: "individual",
          metadata: { userId: String(userId) },
        });
        profile = await storage.createSellerProfile({
          userId,
          stripeAccountId: account.id,
          onboardingComplete: false,
          payoutsEnabled: false,
        });
      }

      // Generate onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: profile.stripeAccountId!,
        refresh_url: `${APP_URL}/#/seller/onboard?refresh=true`,
        return_url: `${APP_URL}/#/seller/onboard?success=true`,
        type: "account_onboarding",
      });

      res.json({ url: accountLink.url, profile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get seller profile status
  app.get("/api/marketplace/seller/status", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const profile = await storage.getSellerProfile(userId);
      if (!profile) return res.json({ hasProfile: false });

      // Refresh status from Stripe
      if (profile.stripeAccountId) {
        const account = await stripe.accounts.retrieve(profile.stripeAccountId);
        const payoutsEnabled = account.payouts_enabled ?? false;
        const onboardingComplete = account.details_submitted ?? false;
        if (payoutsEnabled !== profile.payoutsEnabled || onboardingComplete !== profile.onboardingComplete) {
          await storage.updateSellerProfile(userId, { payoutsEnabled, onboardingComplete });
        }
        return res.json({ hasProfile: true, profile: { ...profile, payoutsEnabled, onboardingComplete } });
      }

      res.json({ hasProfile: true, profile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── LISTINGS ─────────────────────────────────────────────────────────────

  // GET all approved listings (public)
  app.get("/api/marketplace/listings", async (req, res) => {
    try {
      const { category } = req.query;
      let listings = await storage.getApprovedListings();
      if (category && typeof category === "string") {
        listings = listings.filter(l => l.category === category);
      }
      // Attach seller info
      const withSellers = await Promise.all(listings.map(async l => {
        const seller = await storage.getUser(l.sellerId);
        return { ...l, sellerName: seller ? `${seller.firstName} ${seller.lastName}` : "Unknown", sellerBusiness: seller?.businessName || null };
      }));
      res.json(withSellers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET all listings (admin)
  app.get("/api/marketplace/listings/all", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin only" });
      const all = await storage.getAllListings();
      const withSellers = await Promise.all(all.map(async l => {
        const seller = await storage.getUser(l.sellerId);
        return { ...l, sellerName: seller ? `${seller.firstName} ${seller.lastName}` : "Unknown" };
      }));
      res.json(withSellers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET single listing
  app.get("/api/marketplace/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(parseInt(req.params.id));
      if (!listing) return res.status(404).json({ error: "Not found" });
      const seller = await storage.getUser(listing.sellerId);
      res.json({ ...listing, sellerName: seller ? `${seller.firstName} ${seller.lastName}` : "Unknown", sellerBusiness: seller?.businessName || null });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET my listings (seller)
  app.get("/api/marketplace/my-listings", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const listings = await storage.getListingsBySeller(userId);
      res.json(listings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST create listing (multipart form with file)
  app.post("/api/marketplace/listings", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || user.membershipTier === "free") {
        return res.status(403).json({ error: "Paid membership required to sell." });
      }

      const { title, description, price, category, imageUrl, fileName, fileKey, fileSize } = req.body;
      if (!title || !description || !price || !category) {
        return res.status(400).json({ error: "Title, description, price, and category are required." });
      }

      // Admin listings are auto-approved
      const isAdmin = user.role === "admin";

      const listing = await storage.createListing({
        sellerId: userId,
        title,
        description,
        price: parseFloat(price),
        category,
        imageUrl: imageUrl || null,
        fileName: fileName || null,
        fileKey: fileKey || null,
        fileSize: fileSize ? parseInt(fileSize) : null,
        approved: isAdmin,
        active: true,
      });

      res.json(listing);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT update listing
  app.put("/api/marketplace/listings/:id", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? await storage.getUser(userId) : null;
      const listing = await storage.getListing(parseInt(req.params.id));
      if (!listing) return res.status(404).json({ error: "Not found" });
      if (!user || (listing.sellerId !== userId && user.role !== "admin")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const updated = await storage.updateListing(listing.id, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE listing
  app.delete("/api/marketplace/listings/:id", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? await storage.getUser(userId) : null;
      const listing = await storage.getListing(parseInt(req.params.id));
      if (!listing) return res.status(404).json({ error: "Not found" });
      if (!user || (listing.sellerId !== userId && user.role !== "admin")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await storage.deleteListing(listing.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH approve listing (admin only)
  app.patch("/api/marketplace/listings/:id/approve", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin only" });
      const updated = await storage.updateListing(parseInt(req.params.id), { approved: true });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── CHECKOUT ─────────────────────────────────────────────────────────────

  app.post("/api/marketplace/checkout", async (req, res) => {
    try {
      const { listingId, buyerId } = req.body;
      const listing = await storage.getListing(parseInt(listingId));
      if (!listing || !listing.approved || !listing.active) {
        return res.status(404).json({ error: "Listing not available" });
      }

      // Check if already purchased
      if (buyerId) {
        const alreadyBought = await storage.hasBuyerPurchased(parseInt(buyerId), listing.id);
        if (alreadyBought) return res.status(409).json({ error: "You already own this product." });
      }

      const sellerProfile = await storage.getSellerProfile(listing.sellerId);
      const platformFee = Math.round(listing.price * PLATFORM_FEE_PERCENT * 100); // cents

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: listing.title,
              description: listing.description.substring(0, 200),
            },
            unit_amount: Math.round(listing.price * 100),
          },
          quantity: 1,
        }],
        success_url: `${APP_URL}/#/marketplace/success?session_id={CHECKOUT_SESSION_ID}&listing_id=${listing.id}`,
        cancel_url: `${APP_URL}/#/marketplace`,
        metadata: {
          listingId: String(listing.id),
          sellerId: String(listing.sellerId),
          buyerId: buyerId ? String(buyerId) : "",
        },
      };

      // Add Stripe Connect application fee if seller has connected account
      if (sellerProfile?.stripeAccountId && sellerProfile.payoutsEnabled) {
        (sessionParams as any).payment_intent_data = {
          application_fee_amount: platformFee,
          transfer_data: { destination: sellerProfile.stripeAccountId },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      res.json({ url: session.url, sessionId: session.id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── WEBHOOK (marketplace purchases) ────────────────────────────────────

  app.post("/api/marketplace/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (e: any) {
      return res.status(400).json({ error: `Webhook error: ${e.message}` });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};
      const listingId = parseInt(meta.listingId || "0");
      const sellerId = parseInt(meta.sellerId || "0");
      const buyerId = parseInt(meta.buyerId || "0");

      if (listingId && sellerId) {
        const listing = await storage.getListing(listingId);
        if (listing) {
          const amount = (session.amount_total || 0) / 100;
          const platformFee = parseFloat((amount * PLATFORM_FEE_PERCENT).toFixed(2));
          const sellerAmount = parseFloat((amount - platformFee).toFixed(2));
          const token = genToken();

          await storage.createPurchase({
            buyerId: buyerId || 0,
            listingId,
            sellerId,
            amount,
            platformFee,
            sellerAmount,
            stripePaymentIntentId: session.payment_intent as string,
            downloadToken: token,
            status: "completed",
          });

          await storage.incrementListingSales(listingId);
        }
      }
    }

    res.json({ received: true });
  });

  // ─── DOWNLOAD ─────────────────────────────────────────────────────────────

  // Verify purchase and get download token after Stripe success
  app.post("/api/marketplace/verify-purchase", async (req, res) => {
    try {
      const { sessionId, listingId, buyerId } = req.body;

      // Find purchase by stripe session (look up via payment intent)
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paymentIntentId = session.payment_intent as string;

      // Poll purchases for this payment intent (give webhook a moment)
      let purchase = null;
      for (let i = 0; i < 5; i++) {
        const allPurchases = await storage.getPurchasesByBuyer(buyerId || 0);
        purchase = allPurchases.find(p => p.stripePaymentIntentId === paymentIntentId || p.listingId === parseInt(listingId));
        if (purchase) break;

        // If buyer not logged in, check by listing+session
        if (!purchase && listingId) {
          const sellerPurchases = await storage.getPurchasesBySeller(0);
          // fallback — create purchase record now if webhook hasn't fired
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!purchase) {
        // Webhook may not have fired yet — create the purchase record now
        const listing = await storage.getListing(parseInt(listingId));
        if (listing && session.payment_status === "paid") {
          const amount = (session.amount_total || 0) / 100;
          const platformFee = parseFloat((amount * PLATFORM_FEE_PERCENT).toFixed(2));
          const sellerAmount = parseFloat((amount - platformFee).toFixed(2));
          const token = genToken();
          purchase = await storage.createPurchase({
            buyerId: buyerId ? parseInt(buyerId) : 0,
            listingId: parseInt(listingId),
            sellerId: listing.sellerId,
            amount,
            platformFee,
            sellerAmount,
            stripePaymentIntentId: paymentIntentId,
            downloadToken: token,
            status: "completed",
          });
          await storage.incrementListingSales(parseInt(listingId));
        }
      }

      if (!purchase) return res.status(404).json({ error: "Purchase not found" });
      res.json({ token: purchase.downloadToken, listingId: purchase.listingId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Secure file download via token
  app.get("/api/marketplace/download/:token", async (req, res) => {
    try {
      const purchase = await storage.getPurchaseByToken(req.params.token);
      if (!purchase || purchase.status !== "completed") {
        return res.status(403).json({ error: "Invalid or expired download link." });
      }
      const listing = await storage.getListing(purchase.listingId);
      if (!listing || !listing.fileKey) {
        return res.status(404).json({ error: "File not found." });
      }

      // Generate a 1-hour signed URL from R2
      const signedUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: listing.fileKey }),
        { expiresIn: 3600 }
      );
      await storage.incrementDownloadCount(purchase.id);
      res.redirect(signedUrl);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── FILE UPLOAD ──────────────────────────────────────────────────────────

  // Simple base64 file upload endpoint
  app.post("/api/marketplace/upload", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || (user.membershipTier === "free" && user.role !== "admin")) {
        return res.status(403).json({ error: "Paid membership required." });
      }
      const { fileName, fileData, mimeType } = req.body;
      if (!fileName || !fileData) return res.status(400).json({ error: "fileName and fileData required" });

      const buffer = Buffer.from(fileData, "base64");
      if (buffer.length > 50 * 1024 * 1024) {
        return res.status(413).json({ error: "File too large. Max 50MB." });
      }
      const fileKey = `uploads/${Date.now()}-${userId}-${crypto.randomBytes(8).toString("hex")}`;
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        Body: buffer,
        ContentType: mimeType || "application/octet-stream",
        ContentDisposition: `attachment; filename="${fileName}"`,
      }));
      res.json({ fileKey, fileName, fileSize: buffer.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── SELLER STATS ─────────────────────────────────────────────────────────

  app.get("/api/marketplace/seller/stats", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const [myListings, mySales] = await Promise.all([
        storage.getListingsBySeller(userId),
        storage.getPurchasesBySeller(userId),
      ]);

      const completedSales = mySales.filter(p => p.status === "completed");
      const totalRevenue = completedSales.reduce((sum, p) => sum + p.sellerAmount, 0);
      const totalSales = completedSales.length;

      res.json({
        listingCount: myListings.length,
        activeListings: myListings.filter(l => l.active && l.approved).length,
        pendingApproval: myListings.filter(l => !l.approved).length,
        totalSales,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        recentSales: completedSales.slice(0, 10),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── BUYER — MY PURCHASES ─────────────────────────────────────────────────

  app.get("/api/marketplace/my-purchases", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const purchases = await storage.getPurchasesByBuyer(userId);
      const withListings = await Promise.all(purchases.map(async p => {
        const listing = await storage.getListing(p.listingId);
        return { ...p, listingTitle: listing?.title || "Deleted product", listingCategory: listing?.category || "" };
      }));
      res.json(withListings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
