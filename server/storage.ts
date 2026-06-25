import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
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

// Use /data/data.db on Railway (persistent volume) or local data.db in dev
const DB_PATH = process.env.NODE_ENV === "production" ? "/data/data.db" : "data.db";
try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch {}
const sqlite = new Database(DB_PATH);
console.log(`[DB] Using database at: ${DB_PATH}`);
const db = drizzle(sqlite);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    credit_amount REAL NOT NULL DEFAULT 4.99,
    applied_to_renewal INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    business_name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    website TEXT,
    phone TEXT,
    email TEXT,
    city TEXT,
    state TEXT NOT NULL,
    is_nationwide INTEGER DEFAULT 0,
    logo_url TEXT,
    featured INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    file_url TEXT,
    featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    author_id INTEGER NOT NULL,
    published INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_type TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    members_only INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Generate a short unique referral code
function genReferralCode(firstName: string, id: number): string {
  const clean = firstName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  return `${clean}${id}`;
}

// Seed admin if not present
const existingAdmin = db.select().from(users).where(eq(users.email, "admin@cornerstonedirectory.com")).get();
if (!existingAdmin) {
  const admin = db.insert(users).values({
    email: "admin@cornerstonedirectory.com",
    password: "admin123",
    firstName: "Platform",
    lastName: "Admin",
    businessName: "Faith Business Network",
    state: "UT",
    city: "St. George",
    role: "admin",
    membershipTier: "founding",
    membershipPrice: 59.99,
    referralCredit: 0,
    isActive: true,
    joinedAt: new Date().toISOString(),
  }).returning().get();
  // Set referral code now that we have an ID
  db.update(users).set({ referralCode: genReferralCode("Admin", admin.id) }).where(eq(users.id, admin.id)).run();

  // Seed blog posts
  db.insert(posts).values([
    {
      title: "Running Your Business as a Kingdom Steward",
      slug: "kingdom-steward-business",
      excerpt: "Discover how Proverbs 31 principles can transform the way you lead your company.",
      content: `<p>Scripture tells us that <strong>"The plans of the diligent lead to profit as surely as haste leads to poverty"</strong> (Proverbs 21:5). As Christian entrepreneurs, our businesses are not merely vehicles for profit — they are platforms for Kingdom impact.</p>
      <h2>What Does Stewardship Mean?</h2>
      <p>Stewardship is the responsible management of something entrusted to your care. God has entrusted you with talents, capital, relationships, and time. Your business is a stewardship opportunity — not just a livelihood.</p>
      <h2>Three Pillars of Kingdom Business</h2>
      <ul><li><strong>Integrity:</strong> Your word is your bond. Build systems of accountability.</li><li><strong>Excellence:</strong> "Whatever you do, work at it with all your heart" (Col 3:23).</li><li><strong>Generosity:</strong> Margin is ministry. Profit enables purpose.</li></ul>`,
      category: "Leadership",
      imageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80",
      authorId: 1,
      published: 1,
      featured: 1,
    },
    {
      title: "Faith Over Fear: Decision-Making in Uncertain Markets",
      slug: "faith-over-fear-decisions",
      excerpt: "How to make bold, Spirit-led business decisions even when the economy is uncertain.",
      content: `<p>Every entrepreneur faces seasons of uncertainty. Markets shift, clients leave, and circumstances change. But Scripture gives us an anchor: <strong>"Trust in the Lord with all your heart and lean not on your own understanding"</strong> (Proverbs 3:5).</p>
      <h2>Practical Steps for Faith-Led Decisions</h2>
      <p>1. Pray before every major decision. 2. Seek wise counsel. 3. Test against your values. 4. Act with courage when you have peace.</p>`,
      category: "Mindset",
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
      authorId: 1,
      published: 1,
      featured: 0,
    },
    {
      title: "Building a Team That Shares Your Values",
      slug: "building-values-team",
      excerpt: "Hiring is a Kingdom act. Learn to attract people who align with your mission.",
      content: `<p>The right team multiplies your impact. The wrong team drains it. As you build your business, hiring aligned team members is one of the most important things you can do.</p>
      <h2>Kingdom Culture Starts with You</h2>
      <p>Before you can attract aligned people, you must define your culture. Write your values. Live them publicly. Lead by example.</p>`,
      category: "Team Building",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
      authorId: 1,
      published: 1,
      featured: 0,
    },
  ] as any).run();

  // Seed products
  db.insert(products).values([
    {
      title: "Faith Business Blueprint",
      description: "A 12-chapter digital workbook for building a faith-aligned business from the ground up. Covers vision, strategy, finance, team, and legacy.",
      price: 27.00,
      category: "digital",
      imageUrl: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
      featured: 1,
      isActive: 1,
      createdAt: new Date().toISOString(),
    },
    {
      title: "Biblical Business Principles Reference Guide",
      description: "200+ Bible verses organized by business topic: leadership, finance, integrity, hiring, conflict resolution, and more.",
      price: 14.99,
      category: "digital",
      imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
      featured: 1,
      isActive: 1,
      createdAt: new Date().toISOString(),
    },
    {
      title: "Grant Writing Starter Kit for Christian Nonprofits",
      description: "Templates, checklists, and guides for writing your first grant proposal. Includes SAM.gov registration walkthrough.",
      price: 37.00,
      category: "resource",
      imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
      featured: 0,
      isActive: 1,
      createdAt: new Date().toISOString(),
    },
  ] as any).run();

  // Seed resources
  db.insert(resources).values([
    {
      title: "Morning Scripture for Business Leaders",
      description: "A daily devotional specifically written for entrepreneurs facing the pressures of leadership.",
      type: "devotional",
      membersOnly: 0,
      imageUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=80",
      createdAt: new Date().toISOString(),
    },
    {
      title: "Business Plan Template (Faith-Aligned)",
      description: "A full business plan template that incorporates mission, values, and Kingdom impact alongside financial projections.",
      type: "template",
      membersOnly: 1,
      imageUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80",
      createdAt: new Date().toISOString(),
    },
    {
      title: "Faith Entrepreneur Video Series",
      description: "10 short video teachings on faith in business from seasoned Christian entrepreneurs.",
      type: "video",
      membersOnly: 1,
      imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
      createdAt: new Date().toISOString(),
    },
    {
      title: "Cash Flow Management Guide",
      description: "Practical financial management principles rooted in Biblical wisdom about money and stewardship.",
      type: "guide",
      membersOnly: 0,
      imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
      createdAt: new Date().toISOString(),
    },
  ] as any).run();

  // Seed sample businesses (paid member only)
  db.insert(businesses).values([
    {
      userId: 1,
      businessName: "Covenant Financial Advisors",
      description: "Faith-based financial planning and wealth management for Christian families and business owners.",
      category: "Financial Services",
      city: "St. George",
      state: "UT",
      isNationwide: 0,
      featured: 1,
      createdAt: new Date().toISOString(),
    },
    {
      userId: 1,
      businessName: "Cornerstone Marketing Co.",
      description: "Christian-owned marketing agency specializing in purpose-driven brands and ethical advertising.",
      category: "Marketing",
      city: "Salt Lake City",
      state: "UT",
      isNationwide: 1,
      featured: 1,
      createdAt: new Date().toISOString(),
    },
    {
      userId: 1,
      businessName: "Harvest Real Estate Group",
      description: "Helping families find homes that match their values. Faith-minded real estate in the Mountain West.",
      category: "Real Estate",
      city: "Provo",
      state: "UT",
      isNationwide: 0,
      featured: 0,
      createdAt: new Date().toISOString(),
    },
  ] as any).run();
}

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByEmail(email: string): User | undefined;
  getUserByReferralCode(code: string): User | undefined;
  createUser(user: InsertUser): User;
  updateUser(id: number, updates: Partial<InsertUser>): User | undefined;
  getAllUsers(): User[];
  getMemberCount(): number;
  getPaidMemberCount(): number;
  addReferralCredit(userId: number, amount: number): void;

  // Referrals
  createReferral(referral: InsertReferral): Referral;
  getReferralsByReferrer(referrerId: number): Referral[];

  // Businesses
  getAllBusinesses(): Business[];
  getBusinessesByState(state: string): Business[];
  getFeaturedBusinesses(): Business[];
  createBusiness(business: InsertBusiness): Business;
  getBusinessByUserId(userId: number): Business | undefined;

  // Products
  getAllProducts(): Product[];
  getFeaturedProducts(): Product[];
  getProduct(id: number): Product | undefined;

  // Orders
  createOrder(order: InsertOrder): Order;
  getOrdersByUser(userId: number): Order[];

  // Posts
  getPublishedPosts(): Post[];
  getFeaturedPost(): Post | undefined;
  getPost(slug: string): Post | undefined;

  // Bookings
  createBooking(booking: InsertBooking): Booking;
  getBookingsByUser(userId: number): Booking[];

  // Resources
  getPublicResources(): Resource[];
  getMemberResources(): Resource[];
}

export const storage: IStorage = {
  // USERS
  getUser(id) {
    return db.select().from(users).where(eq(users.id, id)).get();
  },
  getUserByEmail(email) {
    return db.select().from(users).where(eq(users.email, email)).get();
  },
  getUserByReferralCode(code) {
    return db.select().from(users).where(eq(users.referralCode, code)).get();
  },
  createUser(user) {
    const created = db.insert(users).values(user).returning().get();
    // Auto-generate referral code now that we have an ID
    const code = genReferralCode(created.firstName, created.id);
    db.update(users).set({ referralCode: code }).where(eq(users.id, created.id)).run();
    return { ...created, referralCode: code };
  },
  updateUser(id, updates) {
    return db.update(users).set(updates).where(eq(users.id, id)).returning().get();
  },
  getAllUsers() {
    return db.select().from(users).all();
  },
  getMemberCount() {
    return db.select().from(users).all().length;
  },
  getPaidMemberCount() {
    return db.select().from(users).all().filter(u => u.membershipTier !== "free").length;
  },
  addReferralCredit(userId, amount) {
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (user) {
      db.update(users).set({ referralCredit: (user.referralCredit || 0) + amount }).where(eq(users.id, userId)).run();
    }
  },

  // REFERRALS
  createReferral(referral) {
    return db.insert(referrals).values(referral).returning().get();
  },
  getReferralsByReferrer(referrerId) {
    return db.select().from(referrals).where(eq(referrals.referrerId, referrerId)).all();
  },

  // BUSINESSES
  getAllBusinesses() {
    return db.select().from(businesses).orderBy(desc(businesses.featured)).all();
  },
  getBusinessesByState(state) {
    return db.select().from(businesses).where(eq(businesses.state, state)).all();
  },
  getFeaturedBusinesses() {
    return db.select().from(businesses).where(eq(businesses.featured, true)).all();
  },
  createBusiness(business) {
    return db.insert(businesses).values(business).returning().get();
  },
  getBusinessByUserId(userId) {
    return db.select().from(businesses).where(eq(businesses.userId, userId)).get();
  },

  // PRODUCTS
  getAllProducts() {
    return db.select().from(products).where(eq(products.isActive, true)).all();
  },
  getFeaturedProducts() {
    return db.select().from(products).where(and(eq(products.featured, true), eq(products.isActive, true))).all();
  },
  getProduct(id) {
    return db.select().from(products).where(eq(products.id, id)).get();
  },

  // ORDERS
  createOrder(order) {
    return db.insert(orders).values(order).returning().get();
  },
  getOrdersByUser(userId) {
    return db.select().from(orders).where(eq(orders.userId, userId)).all();
  },

  // POSTS
  getPublishedPosts() {
    return db.select().from(posts).where(eq(posts.published, true)).orderBy(desc(posts.createdAt)).all();
  },
  getFeaturedPost() {
    return db.select().from(posts).where(and(eq(posts.featured, true), eq(posts.published, true))).get();
  },
  getPost(slug) {
    return db.select().from(posts).where(eq(posts.slug, slug)).get();
  },

  // BOOKINGS
  createBooking(booking) {
    return db.insert(bookings).values(booking).returning().get();
  },
  getBookingsByUser(userId) {
    return db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt)).all();
  },

  // RESOURCES
  getPublicResources() {
    return db.select().from(resources).where(eq(resources.membersOnly, false)).all();
  },
  getMemberResources() {
    return db.select().from(resources).all();
  },
};
