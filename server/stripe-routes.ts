import type { Express } from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { currentUser } from "./auth";

const REFERRAL_CREDIT = 4.99;
const FOUNDING_PRICE = 59.99;
const ANNUAL_PRICE = 59.99;
const FOUNDING_LIMIT = 500;

export function registerStripeRoutes(app: Express) {
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  // Startup key check — visible in Railway deploy logs
  if (!secretKey) {
    console.error("[Stripe] ⚠️  STRIPE_SECRET_KEY is not set!");
  } else if (!secretKey.startsWith("sk_live_") && !secretKey.startsWith("sk_test_")) {
    console.error("[Stripe] ⚠️  STRIPE_SECRET_KEY has an unexpected format");
  } else {
    console.log(`[Stripe] Payment service initialized in ${secretKey.startsWith("sk_live_") ? "live" : "test"} mode.`);
  }
  const stripe = new Stripe(secretKey);

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
  const APP_URL = (process.env.APP_URL || "https://cornerstonedirectory.com").replace(/\/$/, "");

  // ── CREATE CHECKOUT SESSION ───────────────────────────────────────────────
  app.post("/api/stripe/create-checkout", async (req, res) => {
    try {
      const { referralCode } = req.body;
      const user = await currentUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const paidCount = await storage.getPaidMemberCount();
      const isFounding = paidCount < FOUNDING_LIMIT;
      const tier = isFounding ? "founding" : "annual";
      const unitAmount = Math.round((isFounding ? FOUNDING_PRICE : ANNUAL_PRICE) * 100);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        customer_email: user.email,
        metadata: {
          userId: String(user.id),
          tier,
          referralCode: referralCode || "",
        },
        success_url: `${APP_URL}/#/dashboard?payment=success`,
        cancel_url: `${APP_URL}/#/`,
        line_items: [
          {
            price_data:
              tier === "founding"
                ? {
                    currency: "usd",
                    product_data: {
                      name: "Cornerstone Directory — Founding Member",
                      description: "Lifetime membership. One-time payment. Never renews.",
                    },
                    unit_amount: unitAmount,
                  }
                : {
                    currency: "usd",
                    product_data: {
                      name: "Cornerstone Directory — Annual Membership",
                      description: "Full access, billed annually.",
                    },
                    unit_amount: unitAmount,
                    recurring: { interval: "year" },
                  },
            quantity: 1,
          },
        ],
        mode: tier === "founding" ? "payment" : "subscription",
      };

      const session = await stripe.checkout.sessions.create(sessionParams);
      res.json({ url: session.url, sessionId: session.id });
    } catch (e: any) {
      console.error("Stripe checkout error:", e.message, e.type, e.code);
      // Provide human-friendly message for common Stripe errors
      let friendlyMessage = e.message;
      if (e.code === "account_invalid" || e.type === "StripeInvalidRequestError") {
        friendlyMessage = "Payment processing is being set up. Please contact us at contact@cornerstonedirectory.com to complete your membership.";
      } else if (e.type === "StripeAuthenticationError") {
        friendlyMessage = "Payment system configuration error. Please contact contact@cornerstonedirectory.com.";
      }
      res.status(500).json({ error: friendlyMessage, type: e.type, code: e.code });
    }
  });

  // ── WEBHOOK ───────────────────────────────────────────────────────────────
  // rawBody is captured by express.json() verify callback in server/index.ts
  app.post("/api/stripe/webhook", async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      const rawBody = (req as any).rawBody; // Buffer captured by express.json verify
      let event: Stripe.Event;

      try {
        if (!WEBHOOK_SECRET) {
          console.error("Webhook: STRIPE_WEBHOOK_SECRET not set");
          return res.status(503).json({ error: "Webhook secret not configured" });
        }
        if (!sig) {
          console.error("Webhook: missing stripe-signature header");
          return res.status(400).json({ error: "Missing signature" });
        }
        if (!rawBody) {
          console.error("Webhook: rawBody is empty, type:", typeof rawBody);
          return res.status(400).json({ error: "Missing raw body" });
        }
        console.log("Webhook: attempting verification, rawBody type:", typeof rawBody, "length:", (rawBody as any)?.length);
        event = stripe.webhooks.constructEvent(rawBody as Buffer, sig, WEBHOOK_SECRET);
      } catch (e: any) {
        console.error("Webhook sig error:", e.message);
        return res.status(400).json({ error: e.message });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, tier, referralCode } = session.metadata || {};
        if (userId && tier) {
          const uid = parseInt(userId);
          await storage.updateUser(uid, {
            membershipTier: tier as "founding" | "annual",
            membershipPrice: tier === "founding" ? FOUNDING_PRICE : ANNUAL_PRICE,
          });
          if (referralCode) {
            const referrer = await storage.getUserByReferralCode(referralCode);
            if (referrer) {
              await storage.addReferralCredit(referrer.id, REFERRAL_CREDIT);
              await storage.createReferral({
                referrerId: referrer.id,
                referredId: uid,
                creditAmount: REFERRAL_CREDIT,
                appliedToRenewal: false,
              });
            }
          }
          console.log(`✅ Payment confirmed: user ${uid} upgraded to ${tier}`);
        }
      }

      if (event.type === "invoice.payment_succeeded") {
        const inv = event.data.object as Stripe.Invoice;
        console.log(`✅ Renewal: ${inv.customer_email}`);
      }

      if (event.type === "invoice.payment_failed") {
        const inv = event.data.object as Stripe.Invoice;
        console.warn(`⚠️ Payment failed: ${inv.customer_email}`);
      }

      res.json({ received: true });
    }
  );

  // ── PUBLIC KEY (safe to expose to frontend) ───────────────────────────────
  app.get("/api/stripe/config", (_req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "" });
  });
}
