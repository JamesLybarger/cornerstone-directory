import type { Express } from "express";
import Stripe from "stripe";
import { storage } from "./storage";

const REFERRAL_CREDIT = 4.99;
const FOUNDING_PRICE = 59.99;
const ANNUAL_PRICE = 59.99;
const FOUNDING_LIMIT = 500;

export function registerStripeRoutes(app: Express) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-05-28.basil" as any,
  });

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
  const APP_URL = process.env.APP_URL || "http://localhost:5000";

  // ── CREATE CHECKOUT SESSION ───────────────────────────────────────────────
  app.post("/api/stripe/create-checkout", async (req, res) => {
    try {
      const { userId, referralCode } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });

      const user = storage.getUser(parseInt(userId));
      if (!user) return res.status(404).json({ error: "User not found" });

      const paidCount = storage.getPaidMemberCount();
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
        cancel_url: `${APP_URL}/#/join?payment=cancelled`,
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
      console.error("Stripe checkout error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── WEBHOOK ───────────────────────────────────────────────────────────────
  // Must use raw body — register BEFORE express.json()
  app.post(
    "/api/stripe/webhook",
    (req, res, next) => {
      let raw = "";
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => { raw += chunk; });
      req.on("end", () => {
        (req as any).rawBody = raw;
        next();
      });
    },
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      let event: Stripe.Event;

      try {
        if (WEBHOOK_SECRET && sig) {
          event = stripe.webhooks.constructEvent((req as any).rawBody, sig, WEBHOOK_SECRET);
        } else {
          event = JSON.parse((req as any).rawBody) as Stripe.Event;
        }
      } catch (e: any) {
        console.error("Webhook sig error:", e.message);
        return res.status(400).json({ error: e.message });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, tier, referralCode } = session.metadata || {};
        if (userId && tier) {
          const uid = parseInt(userId);
          storage.updateUser(uid, {
            membershipTier: tier as "founding" | "annual",
            membershipPrice: tier === "founding" ? FOUNDING_PRICE : ANNUAL_PRICE,
            isActive: true,
          });
          if (referralCode) {
            const referrer = storage.getUserByReferralCode(referralCode);
            if (referrer) {
              storage.addReferralCredit(referrer.id, REFERRAL_CREDIT);
              storage.createReferral({
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
