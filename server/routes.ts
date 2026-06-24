import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-05-28.basil",
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const APP_URL = process.env.APP_URL || "http://localhost:5000";

const REFERRAL_CREDIT = 4.99;
const FOUNDING_PRICE = 59.99;
const ANNUAL_PRICE = 59.99;
const FOUNDING_LIMIT = 500;

export function registerRoutes(httpServer: Server, app: Express) {

  // AUTH — REGISTER
  app.post("/api/auth/register", (req, res) => {
    try {
      const { email, password, firstName, lastName, businessName, state, city, referralCode } = req.body;
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "Required fields missing" });
      }
      if (storage.getUserByEmail(email)) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // Determine tier
      const paidCount = storage.getPaidMemberCount();
      const isFounding = paidCount < FOUNDING_LIMIT;
      const tier = isFounding ? "founding" : "annual";
      const price = isFounding ? FOUNDING_PRICE : ANNUAL_PRICE;

      // Resolve referrer
      let referrerId: number | null = null;
      if (referralCode) {
        const referrer = storage.getUserByReferralCode(referralCode);
        if (referrer && (referrer.membershipTier === "founding" || referrer.membershipTier === "annual")) {
          referrerId = referrer.id;
        }
      }

      // Create account as FREE/inactive — Stripe webhook upgrades to paid after payment
      const user = storage.createUser({
        email, password, firstName, lastName,
        businessName: businessName || null,
        state: state || null,
        city: city || null,
        phone: null, bio: null, avatarUrl: null,
        role: "member",
        membershipTier: "free",  // stays free until Stripe payment confirmed
        membershipPrice: 0,
        referralCode: null,
        referredBy: referrerId,
        referralCredit: 0,
        joinedAt: new Date().toISOString(),
        isActive: false,  // activated by Stripe webhook on payment
      });

      // Store intended tier in user metadata so webhook knows what to upgrade to
      // (referral credit applied after payment confirmed in webhook)

      const { password: _, ...safe } = user;
      res.json({ user: safe, tier, price, foundingSpotsLeft: Math.max(0, FOUNDING_LIMIT - paidCount - 1) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AUTH — LOGIN
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      const user = storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const { password: _, ...safe } = user;
      res.json({ user: safe });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = parseInt(req.headers["x-user-id"] as string);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safe } = user;
    res.json(safe);
  });

  app.put("/api/users/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updated = storage.updateUser(id, req.body);
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  // REFERRALS
  // Support both /api/referrals/my/:userId (with userId) and /api/referrals/my (header-based)
  const handleMyReferrals = (req: Request, res: Response) => {
    const userId = parseInt((req.params.userId || req.headers["x-user-id"]) as string);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const myReferrals = storage.getReferralsByReferrer(userId);
    const user = storage.getUser(userId);
    res.json({
      referrals: myReferrals,
      totalCredit: user?.referralCredit || 0,
      referralCode: user?.referralCode || null,
      count: myReferrals.length,
    });
  };
  app.get("/api/referrals/my/:userId", handleMyReferrals);
  app.get("/api/referrals/my", handleMyReferrals);

  // FOUNDING SPOTS remaining
  app.get("/api/founding-spots", (req, res) => {
    const paidCount = storage.getPaidMemberCount();
    const remaining = Math.max(0, FOUNDING_LIMIT - paidCount);
    res.json({ remaining, total: FOUNDING_LIMIT, isFull: remaining === 0 });
  });

  // STATS
  app.get("/api/stats", (req, res) => {
    const memberCount = storage.getMemberCount();
    const products = storage.getAllProducts();
    const posts = storage.getPublishedPosts();
    const businesses = storage.getAllBusinesses();
    res.json({ memberCount, productCount: products.length, postCount: posts.length, businessCount: businesses.length });
  });

  // BUSINESSES — read is open (free users can browse)
  app.get("/api/businesses", (req, res) => {
    const { state } = req.query;
    if (state && typeof state === "string") {
      return res.json(storage.getBusinessesByState(state));
    }
    res.json(storage.getAllBusinesses());
  });

  app.get("/api/businesses/featured", (req, res) => {
    res.json(storage.getFeaturedBusinesses());
  });

  // BUSINESSES — write requires paid membership
  app.post("/api/businesses", (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? storage.getUser(userId) : null;
      if (!user || user.membershipTier === "free") {
        return res.status(403).json({ error: "A paid membership is required to list your business." });
      }
      const biz = storage.createBusiness({ ...req.body, userId: user.id, createdAt: new Date().toISOString() });
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PRODUCTS — open to all
  app.get("/api/products", (req, res) => res.json(storage.getAllProducts()));
  app.get("/api/products/featured", (req, res) => res.json(storage.getFeaturedProducts()));
  app.get("/api/products/:id", (req, res) => {
    const p = storage.getProduct(parseInt(req.params.id));
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });

  // ORDERS — requires login
  app.post("/api/orders", (req, res) => {
    try {
      const order = storage.createOrder({ ...req.body, createdAt: new Date().toISOString() });
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/orders/user/:userId", (req, res) => {
    res.json(storage.getOrdersByUser(parseInt(req.params.userId)));
  });

  // POSTS — open to all (free users can read)
  app.get("/api/posts", (req, res) => res.json(storage.getPublishedPosts()));
  app.get("/api/posts/featured", (req, res) => res.json(storage.getFeaturedPost() || null));
  app.get("/api/posts/:slug", (req, res) => {
    const post = storage.getPost(req.params.slug);
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json(post);
  });

  // BOOKINGS — requires login
  app.post("/api/bookings", (req, res) => {
    try {
      const booking = storage.createBooking({ ...req.body, createdAt: new Date().toISOString() });
      res.json(booking);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/bookings/user/:userId", (req, res) => {
    res.json(storage.getBookingsByUser(parseInt(req.params.userId)));
  });

  // RESOURCES — free = public only, paid = all
  const handleResources = (req: Request, res: Response) => {
    const userId = req.params.userId || req.headers["x-user-id"];
    if (userId && userId !== "public") {
      const user = storage.getUser(parseInt(userId as string));
      if (user && user.membershipTier !== "free") {
        return res.json(storage.getMemberResources());
      }
    }
    res.json(storage.getPublicResources());
  };
  app.get("/api/resources/:userId", handleResources);
  app.get("/api/resources", handleResources);
}
