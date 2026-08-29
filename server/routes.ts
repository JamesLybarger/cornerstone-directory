import type { Express, Request, Response } from "express";
import type { Server } from "http";
import crypto from "node:crypto";
import { storage } from "./storage";
import { currentUser, hashPassword, requireAdmin, requireAuth, verifyPassword } from "./auth";

const FOUNDING_PRICE = 59.99;
const ANNUAL_PRICE = 59.99;
const FOUNDING_LIMIT = 500;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, limit = 8, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export async function registerRoutes(httpServer: Server, app: Express) {

  // AUTH — REGISTER
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { password, firstName, lastName, businessName, state, city, referralCode } = req.body;
      const email = req.body.email?.toLowerCase().trim();
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "Required fields missing" });
      }
      if (await storage.getUserByEmail(email)) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const paidCount = await storage.getPaidMemberCount();
      const isFounding = paidCount < FOUNDING_LIMIT;
      const tier = isFounding ? "founding" : "annual";
      const price = isFounding ? FOUNDING_PRICE : ANNUAL_PRICE;

      let referrerId: number | null = null;
      if (referralCode) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer && (referrer.membershipTier === "founding" || referrer.membershipTier === "annual")) {
          referrerId = referrer.id;
        }
      }

      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      const user = await storage.createUser({
        email, password: await hashPassword(password), firstName, lastName,
        businessName: businessName || null,
        state: state || null,
        city: city || null,
        phone: null, bio: null, avatarUrl: null,
        role: "member",
        membershipTier: "free",
        membershipPrice: 0,
        referralCode: null,
        referredBy: referrerId,
        referralCredit: 0,
      });

      const { password: _, ...safe } = user;
      req.session.userId = user.id;
      res.json({ user: safe, tier, price, foundingSpotsLeft: Math.max(0, FOUNDING_LIMIT - paidCount - 1) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AUTH — LOGIN
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (typeof email !== "string" || typeof password !== "string") return res.status(400).json({ error: "Email and password are required" });
      const attemptKey = `login:${req.ip}:${email.toLowerCase().trim()}`;
      if (rateLimited(attemptKey)) return res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes and try again." });
      // Case-insensitive email lookup
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!user.password.startsWith("scrypt$")) await storage.updateUser(user.id, { password: await hashPassword(password) });
      loginAttempts.delete(attemptKey);
      req.session.userId = user.id;
      const { password: _, ...safe } = user;
      res.json({ user: safe });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));

  // One-time administrator recovery. Set ADMIN_RECOVERY_TOKEN temporarily in
  // the hosting environment, complete recovery, then remove the variable.
  app.post("/api/auth/admin-recovery", async (req, res) => {
    try {
      if (rateLimited(`recovery:${req.ip}`, 5)) return res.status(429).json({ error: "Too many recovery attempts. Please wait 15 minutes." });
      const configuredToken = process.env.ADMIN_RECOVERY_TOKEN;
      const { email, recoveryToken, newPassword } = req.body;
      if (!configuredToken || configuredToken.length < 32) {
        return res.status(404).json({ error: "Administrator recovery is not enabled" });
      }
      if (typeof recoveryToken !== "string" || recoveryToken.length !== configuredToken.length ||
          !crypto.timingSafeEqual(Buffer.from(recoveryToken), Buffer.from(configuredToken))) {
        return res.status(403).json({ error: "Invalid recovery credentials" });
      }
      if (typeof email !== "string" || typeof newPassword !== "string" || newPassword.length < 12) {
        return res.status(400).json({ error: "A valid email and a password of at least 12 characters are required" });
      }
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user || user.role !== "admin") return res.status(403).json({ error: "Invalid recovery credentials" });
      await storage.updateUser(user.id, { password: await hashPassword(newPassword) });
      req.session.userId = user.id;
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: "Administrator recovery failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = res.locals.user;
    const { password: _, ...safe } = user;
    res.json(safe);
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const actor = res.locals.user;
      if (actor.id !== id && actor.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const allowed: any = {};
      for (const key of ["firstName", "lastName", "businessName", "state", "city", "phone", "bio", "avatarUrl"]) if (key in req.body) allowed[key] = req.body[key];
      if (req.body.password) allowed.password = await hashPassword(req.body.password);
      const updated = await storage.updateUser(id, allowed);
      if (!updated) return res.status(404).json({ error: "User not found" });
      const { password: _, ...safe } = updated;
      res.json(safe);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REFERRALS
  const handleMyReferrals = async (req: Request, res: Response) => {
    try {
      const actor = await currentUser(req);
      const userId = parseInt((req.params.userId || String(actor?.id || "")) as string);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      if (!actor || (actor.id !== userId && actor.role !== "admin")) return res.status(403).json({ error: "Not authorized" });
      const [myReferrals, user] = await Promise.all([
        storage.getReferralsByReferrer(userId),
        storage.getUser(userId),
      ]);
      res.json({
        referrals: myReferrals,
        totalCredit: user?.referralCredit || 0,
        referralCode: user?.referralCode || null,
        count: myReferrals.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };
  app.get("/api/referrals/my/:userId", handleMyReferrals);
  app.get("/api/referrals/my", handleMyReferrals);

  // FOUNDING SPOTS
  app.get("/api/founding-spots", async (req, res) => {
    const paidCount = await storage.getPaidMemberCount();
    const remaining = Math.max(0, FOUNDING_LIMIT - paidCount);
    res.json({ remaining, total: FOUNDING_LIMIT, isFull: remaining === 0 });
  });

  // STATS
  app.get("/api/stats", async (req, res) => {
    const [memberCount, products, posts, businesses] = await Promise.all([
      storage.getMemberCount(),
      storage.getAllProducts(),
      storage.getPublishedPosts(),
      storage.getAllBusinesses(),
    ]);
    res.json({ memberCount, productCount: products.length, postCount: posts.length, businessCount: businesses.length });
  });

  // BUSINESSES
  app.get("/api/businesses", async (req, res) => {
    const { state } = req.query;
    if (state && typeof state === "string") {
      return res.json(await storage.getBusinessesByState(state));
    }
    res.json(await storage.getAllBusinesses());
  });

  app.get("/api/businesses/featured", async (req, res) => {
    res.json(await storage.getFeaturedBusinesses());
  });

  app.get("/api/businesses/my/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(String(req.params.userId));
      const actor = res.locals.user;
      if (actor.id !== userId && actor.role !== "admin") return res.status(403).json({ error: "Not authorized" });
      const biz = await storage.getBusinessByUserId(userId);
      if (!biz) return res.status(404).json({ error: "No listing found" });
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/businesses", requireAuth, async (req, res) => {
    try {
      const user = res.locals.user;
      const isAdmin = user?.role === "admin";
      if (!user || (user.membershipTier === "free" && !isAdmin)) {
        return res.status(403).json({ error: "A paid membership is required to list your business." });
      }
      const allowed: any = {};
      for (const key of ["businessName", "description", "category", "website", "phone", "email", "city", "state", "isNationwide", "logoUrl"]) {
        if (key in req.body) allowed[key] = req.body[key];
      }
      if (isAdmin && "featured" in req.body) allowed.featured = Boolean(req.body.featured);
      const biz = await storage.createBusiness({ ...allowed, userId: user.id });
      res.json(biz);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/businesses/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const user = res.locals.user;
      const userId = user.id;
      const isAdmin = user?.role === "admin";
      if (!user || (user.membershipTier === "free" && !isAdmin)) {
        return res.status(403).json({ error: "A paid membership is required." });
      }
      // Ensure the listing belongs to this user (unless admin)
      const existing = await storage.getBusinessByUserId(userId);
      if (!existing || (existing.id !== id && user.role !== "admin")) {
        return res.status(403).json({ error: "Not authorized to edit this listing." });
      }
      const allowed: any = {};
      for (const key of ["businessName", "description", "category", "website", "phone", "email", "city", "state", "isNationwide", "logoUrl"]) {
        if (key in req.body) allowed[key] = req.body[key];
      }
      if (isAdmin && "featured" in req.body) allowed.featured = Boolean(req.body.featured);
      const updated = await storage.updateBusiness(id, allowed);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PRODUCTS
  app.get("/api/products", async (req, res) => res.json(await storage.getAllProducts()));
  app.get("/api/products/featured", async (req, res) => res.json(await storage.getFeaturedProducts()));
  app.get("/api/products/:id", async (req, res) => {
    const p = await storage.getProduct(parseInt(req.params.id));
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  });

  // ORDERS
  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(String(req.body.productId)));
      if (!product || product.isActive === false) return res.status(404).json({ error: "Product not available" });
      const order = await storage.createOrder({ productId: product.id, amount: product.price, status: "pending", userId: res.locals.user.id });
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/orders/user/:userId", requireAuth, async (req, res) => {
    if (res.locals.user.id !== parseInt(String(req.params.userId)) && res.locals.user.role !== "admin") return res.status(403).json({ error: "Not authorized" });
    res.json(await storage.getOrdersByUser(parseInt(String(req.params.userId))));
  });

  // POSTS
  app.get("/api/posts", async (req, res) => res.json(await storage.getPublishedPosts()));
  app.get("/api/posts/featured", async (req, res) => res.json(await storage.getFeaturedPost() || null));
  app.get("/api/posts/:slug", async (req, res) => {
    const post = await storage.getPost(req.params.slug);
    if (!post) return res.status(404).json({ error: "Not found" });
    res.json(post);
  });

  // BOOKINGS
  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const booking = await storage.createBooking({
        userId: res.locals.user.id,
        sessionType: req.body.sessionType,
        date: req.body.date,
        time: req.body.time,
        notes: req.body.notes || null,
        status: "pending",
      });
      res.json(booking);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/bookings/user/:userId", requireAuth, async (req, res) => {
    if (res.locals.user.id !== parseInt(String(req.params.userId)) && res.locals.user.role !== "admin") return res.status(403).json({ error: "Not authorized" });
    res.json(await storage.getBookingsByUser(parseInt(String(req.params.userId))));
  });

  // MEMBERS — admin only
  app.get("/api/members", requireAdmin, async (req, res) => {
    const all = await storage.getAllUsers();
    res.json(all.map(({ password: _, ...u }) => u));
  });

  // RESOURCES
  const handleResources = async (req: Request, res: Response) => {
    try {
      const actor = await currentUser(req);
      if (actor && actor.membershipTier !== "free") {
        return res.json(await storage.getMemberResources());
      }
      res.json(await storage.getPublicResources());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };
  app.get("/api/resources/:userId", handleResources);
  app.get("/api/resources", handleResources);

  // TEMP: wipe all test users and purchases (keeps IDs 1 and 2 only)
  app.delete("/api/admin/wipe-test-users", requireAdmin, async (req, res) => {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query("DELETE FROM purchases WHERE buyer_id NOT IN (1, 2)");
      await pool.query("DELETE FROM users WHERE id NOT IN (1, 2)");
      await pool.end();
      res.json({ ok: true, message: "All test users and purchases wiped" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

}
