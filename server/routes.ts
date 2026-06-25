import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";

const FOUNDING_PRICE = 59.99;
const ANNUAL_PRICE = 59.99;
const FOUNDING_LIMIT = 500;

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

      const user = await storage.createUser({
        email, password, firstName, lastName,
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
        joinedAt: new Date().toISOString(),
        isActive: false,
      });

      const { password: _, ...safe } = user;
      res.json({ user: safe, tier, price, foundingSpotsLeft: Math.max(0, FOUNDING_LIMIT - paidCount - 1) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AUTH — LOGIN
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      // Case-insensitive email lookup
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const { password: _, ...safe } = user;
      res.json({ user: safe });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = parseInt(req.headers["x-user-id"] as string);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safe } = user;
    res.json(safe);
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateUser(id, req.body);
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
      const userId = parseInt((req.params.userId || req.headers["x-user-id"]) as string);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
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

  app.post("/api/businesses", async (req, res) => {
    try {
      const userId = parseInt(req.headers["x-user-id"] as string);
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || user.membershipTier === "free") {
        return res.status(403).json({ error: "A paid membership is required to list your business." });
      }
      const biz = await storage.createBusiness({ ...req.body, userId: user.id, createdAt: new Date().toISOString() });
      res.json(biz);
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
  app.post("/api/orders", async (req, res) => {
    try {
      const order = await storage.createOrder({ ...req.body, createdAt: new Date().toISOString() });
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/orders/user/:userId", async (req, res) => {
    res.json(await storage.getOrdersByUser(parseInt(req.params.userId)));
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
  app.post("/api/bookings", async (req, res) => {
    try {
      const booking = await storage.createBooking({ ...req.body, createdAt: new Date().toISOString() });
      res.json(booking);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/bookings/user/:userId", async (req, res) => {
    res.json(await storage.getBookingsByUser(parseInt(req.params.userId)));
  });

  // MEMBERS — admin only
  app.get("/api/members", async (req, res) => {
    const all = await storage.getAllUsers();
    res.json(all.map(({ password: _, ...u }) => u));
  });

  // RESOURCES
  const handleResources = async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId || req.headers["x-user-id"];
      if (userId && userId !== "public") {
        const user = await storage.getUser(parseInt(userId as string));
        if (user && user.membershipTier !== "free") {
          return res.json(await storage.getMemberResources());
        }
      }
      res.json(await storage.getPublicResources());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };
  app.get("/api/resources/:userId", handleResources);
  app.get("/api/resources", handleResources);
}
