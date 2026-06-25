import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, and } from "drizzle-orm";
import {
  users, businesses, products, orders, posts, bookings, resources, referrals,
  type User, type InsertUser,
  type Business, type InsertBusiness,
  type Product, type InsertProduct,
  type Order, type InsertOrder,
  type Post, type InsertPost,
  type Booking, type InsertBooking,
  type Resource, type InsertResource,
  type Referral, type InsertReferral,
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const db = drizzle(pool);
console.log("[DB] Connected to PostgreSQL");

// Create tables if they don't exist
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      business_name TEXT,
      state TEXT,
      city TEXT,
      phone TEXT,
      bio TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      membership_tier TEXT NOT NULL DEFAULT 'free',
      membership_price REAL,
      referral_code TEXT UNIQUE,
      referred_by INTEGER,
      referral_credit REAL NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT NOW()::TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      credit_amount REAL NOT NULL DEFAULT 4.99,
      applied_to_renewal BOOLEAN DEFAULT FALSE,
      created_at TEXT NOT NULL DEFAULT NOW()::TEXT
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      business_name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      website TEXT,
      phone TEXT,
      email TEXT,
      city TEXT,
      state TEXT NOT NULL,
      is_nationwide BOOLEAN DEFAULT FALSE,
      logo_url TEXT,
      featured BOOLEAN DEFAULT FALSE,
      created_at TEXT NOT NULL DEFAULT NOW()::TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      file_url TEXT,
      featured BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT NOT NULL DEFAULT NOW()::TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT NOW()::TEXT
    );

    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      author_id INTEGER NOT NULL,
      published BOOLEAN DEFAULT FALSE,
      featured BOOLEAN DEFAULT FALSE,
      created_at TEXT NOT NULL DEFAULT NOW()::TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      session_type TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT NOW()::TEXT
    );

    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT,
      members_only BOOLEAN DEFAULT FALSE,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT NOW()::TEXT
    );
  `);

  // Seed admin if not present
  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@cornerstonedirectory.com")).then(r => r[0]);
  if (!existingAdmin) {
    const [admin] = await db.insert(users).values({
      email: "admin@cornerstonedirectory.com",
      password: "admin123",
      firstName: "Platform",
      lastName: "Admin",
      businessName: "Cornerstone Directory",
      state: "UT",
      city: "St. George",
      role: "admin",
      membershipTier: "founding",
      membershipPrice: 59.99,
      referralCredit: 0,
      isActive: true,
      joinedAt: new Date().toISOString(),
    }).returning();
    await db.update(users).set({ referralCode: genReferralCode("Admin", admin.id) }).where(eq(users.id, admin.id));

    // Seed blog posts
    await db.insert(posts).values([
      {
        title: "Running Your Business as a Kingdom Steward",
        slug: "kingdom-steward-business",
        excerpt: "Discover how Proverbs 31 principles can transform the way you lead your company.",
        content: `<p>Scripture tells us that <strong>"The plans of the diligent lead to profit as surely as haste leads to poverty"</strong> (Proverbs 21:5). As Christian entrepreneurs, our businesses are not merely vehicles for profit — they are platforms for Kingdom impact.</p><h2>What Does Stewardship Mean?</h2><p>Stewardship is the responsible management of something entrusted to your care. God has entrusted you with talents, capital, relationships, and time. Your business is a stewardship opportunity — not just a livelihood.</p><h2>Three Pillars of Kingdom Business</h2><ul><li><strong>Integrity:</strong> Your word is your bond.</li><li><strong>Excellence:</strong> "Whatever you do, work at it with all your heart" (Col 3:23).</li><li><strong>Generosity:</strong> Margin is ministry. Profit enables purpose.</li></ul>`,
        category: "Leadership",
        imageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80",
        authorId: 1,
        published: true,
        featured: true,
      },
      {
        title: "Faith Over Fear: Decision-Making in Uncertain Markets",
        slug: "faith-over-fear-decisions",
        excerpt: "How to make bold, Spirit-led business decisions even when the economy is uncertain.",
        content: `<p>Every entrepreneur faces seasons of uncertainty. Markets shift, clients leave, and circumstances change. But Scripture gives us an anchor: <strong>"Trust in the Lord with all your heart and lean not on your own understanding"</strong> (Proverbs 3:5).</p><h2>Practical Steps for Faith-Led Decisions</h2><p>1. Pray before every major decision. 2. Seek wise counsel. 3. Test against your values. 4. Act with courage when you have peace.</p>`,
        category: "Mindset",
        imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
        authorId: 1,
        published: true,
        featured: false,
      },
      {
        title: "Building a Team That Shares Your Values",
        slug: "building-values-team",
        excerpt: "Hiring is a Kingdom act. Learn to attract people who align with your mission.",
        content: `<p>The right team multiplies your impact. The wrong team drains it. As you build your business, hiring aligned team members is one of the most important things you can do.</p><h2>Kingdom Culture Starts with You</h2><p>Before you can attract aligned people, you must define your culture. Write your values. Live them publicly. Lead by example.</p>`,
        category: "Team Building",
        imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
        authorId: 1,
        published: true,
        featured: false,
      },
    ]);

    // Seed products
    await db.insert(products).values([
      {
        title: "Faith Business Blueprint",
        description: "A 12-chapter digital workbook for building a faith-aligned business from the ground up.",
        price: 27.00,
        category: "digital",
        imageUrl: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
        featured: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        title: "Biblical Business Principles Reference Guide",
        description: "200+ Bible verses organized by business topic: leadership, finance, integrity, hiring, and more.",
        price: 14.99,
        category: "digital",
        imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
        featured: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ]);

    // Seed resources
    await db.insert(resources).values([
      {
        title: "Morning Scripture for Business Leaders",
        description: "A daily devotional specifically written for entrepreneurs facing the pressures of leadership.",
        type: "devotional",
        membersOnly: false,
        imageUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=80",
        createdAt: new Date().toISOString(),
      },
      {
        title: "Business Plan Template (Faith-Aligned)",
        description: "A full business plan template that incorporates mission, values, and Kingdom impact.",
        type: "template",
        membersOnly: true,
        imageUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80",
        createdAt: new Date().toISOString(),
      },
    ]);

    // Seed sample businesses
    await db.insert(businesses).values([
      {
        userId: 1,
        businessName: "Covenant Financial Advisors",
        description: "Faith-based financial planning and wealth management for Christian families.",
        category: "Financial Services",
        city: "St. George",
        state: "UT",
        isNationwide: false,
        featured: true,
        createdAt: new Date().toISOString(),
      },
      {
        userId: 1,
        businessName: "Cornerstone Marketing Co.",
        description: "Christian-owned marketing agency specializing in purpose-driven brands.",
        category: "Marketing",
        city: "Salt Lake City",
        state: "UT",
        isNationwide: true,
        featured: true,
        createdAt: new Date().toISOString(),
      },
    ]);

    console.log("[DB] Seeded initial data");
  }
}

// Initialize DB on startup
initDb().catch(err => console.error("[DB] Init error:", err));

// Generate a short unique referral code
function genReferralCode(firstName: string, id: number): string {
  const clean = firstName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  return `${clean}${id}`;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getMemberCount(): Promise<number>;
  getPaidMemberCount(): Promise<number>;
  addReferralCredit(userId: number, amount: number): Promise<void>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByReferrer(referrerId: number): Promise<Referral[]>;
  getAllBusinesses(): Promise<Business[]>;
  getBusinessesByState(state: string): Promise<Business[]>;
  getFeaturedBusinesses(): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  getBusinessByUserId(userId: number): Promise<Business | undefined>;
  updateBusiness(id: number, updates: Partial<InsertBusiness>): Promise<Business | undefined>;
  getAllProducts(): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  getPublishedPosts(): Promise<Post[]>;
  getFeaturedPost(): Promise<Post | undefined>;
  getPost(slug: string): Promise<Post | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByUser(userId: number): Promise<Booking[]>;
  getPublicResources(): Promise<Resource[]>;
  getMemberResources(): Promise<Resource[]>;
}

export const storage: IStorage = {
  async getUser(id) {
    return (await db.select().from(users).where(eq(users.id, id)))[0];
  },
  async getUserByEmail(email) {
    return (await db.select().from(users).where(eq(users.email, email)))[0];
  },
  async getUserByReferralCode(code) {
    return (await db.select().from(users).where(eq(users.referralCode, code)))[0];
  },
  async createUser(user) {
    const [created] = await db.insert(users).values(user).returning();
    const code = genReferralCode(created.firstName, created.id);
    await db.update(users).set({ referralCode: code }).where(eq(users.id, created.id));
    return { ...created, referralCode: code };
  },
  async updateUser(id, updates) {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  },
  async getAllUsers() {
    return db.select().from(users);
  },
  async getMemberCount() {
    return (await db.select().from(users)).length;
  },
  async getPaidMemberCount() {
    const all = await db.select().from(users);
    return all.filter(u => u.membershipTier !== "free").length;
  },
  async addReferralCredit(userId, amount) {
    const user = (await db.select().from(users).where(eq(users.id, userId)))[0];
    if (user) {
      await db.update(users).set({ referralCredit: (user.referralCredit || 0) + amount }).where(eq(users.id, userId));
    }
  },
  async createReferral(referral) {
    const [created] = await db.insert(referrals).values(referral).returning();
    return created;
  },
  async getReferralsByReferrer(referrerId) {
    return db.select().from(referrals).where(eq(referrals.referrerId, referrerId));
  },
  async getAllBusinesses() {
    return db.select().from(businesses).orderBy(desc(businesses.featured));
  },
  async getBusinessesByState(state) {
    return db.select().from(businesses).where(eq(businesses.state, state));
  },
  async getFeaturedBusinesses() {
    return db.select().from(businesses).where(eq(businesses.featured, true));
  },
  async createBusiness(business) {
    const [created] = await db.insert(businesses).values(business).returning();
    return created;
  },
  async getBusinessByUserId(userId) {
    return (await db.select().from(businesses).where(eq(businesses.userId, userId)))[0];
  },
  async updateBusiness(id, updates) {
    const [updated] = await db.update(businesses).set(updates).where(eq(businesses.id, id)).returning();
    return updated;
  },
  async getAllProducts() {
    return db.select().from(products).where(eq(products.isActive, true));
  },
  async getFeaturedProducts() {
    return db.select().from(products).where(and(eq(products.featured, true), eq(products.isActive, true)));
  },
  async getProduct(id) {
    return (await db.select().from(products).where(eq(products.id, id)))[0];
  },
  async createOrder(order) {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  },
  async getOrdersByUser(userId) {
    return db.select().from(orders).where(eq(orders.userId, userId));
  },
  async getPublishedPosts() {
    return db.select().from(posts).where(eq(posts.published, true)).orderBy(desc(posts.createdAt));
  },
  async getFeaturedPost() {
    return (await db.select().from(posts).where(and(eq(posts.featured, true), eq(posts.published, true))))[0];
  },
  async getPost(slug) {
    return (await db.select().from(posts).where(eq(posts.slug, slug)))[0];
  },
  async createBooking(booking) {
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  },
  async getBookingsByUser(userId) {
    return db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt));
  },
  async getPublicResources() {
    return db.select().from(resources).where(eq(resources.membersOnly, false));
  },
  async getMemberResources() {
    return db.select().from(resources);
  },
};
