import { pgTable, text, integer, real, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// USERS
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  businessName: text("business_name"),
  state: text("state"),
  city: text("city"),
  phone: text("phone"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("member"),
  membershipTier: text("membership_tier").notNull().default("free"),
  membershipPrice: real("membership_price"),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by"),
  referralCredit: real("referral_credit").notNull().default(0),
  joinedAt: text("joined_at").notNull().default(new Date().toISOString()),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, joinedAt: true, isActive: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// REFERRALS
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredId: integer("referred_id").notNull(),
  creditAmount: real("credit_amount").notNull().default(4.99),
  appliedToRenewal: boolean("applied_to_renewal").default(false),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// BUSINESS DIRECTORY
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessName: text("business_name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  state: text("state").notNull(),
  isNationwide: boolean("is_nationwide").default(false),
  logoUrl: text("logo_url"),
  featured: boolean("featured").default(false),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, createdAt: true });
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;

// MARKETPLACE LISTINGS (member-created digital products)
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  fileName: text("file_name"),       // original filename shown to buyer
  fileKey: text("file_key"),         // server-side storage key for download
  fileSize: integer("file_size"),    // bytes
  approved: boolean("approved").default(false),
  active: boolean("active").default(true),
  salesCount: integer("sales_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertListingSchema = createInsertSchema(listings).omit({ id: true, createdAt: true, salesCount: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;

// MARKETPLACE PURCHASES
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  listingId: integer("listing_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  amount: real("amount").notNull(),          // full price paid
  platformFee: real("platform_fee").notNull(), // 6%
  sellerAmount: real("seller_amount").notNull(), // 94%
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  downloadToken: text("download_token").unique(), // secure one-time-ish token
  downloadCount: integer("download_count").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | completed | refunded
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true, downloadCount: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

// SELLER PROFILES (Stripe Connect)
export const sellerProfiles = pgTable("seller_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  stripeAccountId: text("stripe_account_id"),  // Stripe Connect account id
  onboardingComplete: boolean("onboarding_complete").default(false),
  payoutsEnabled: boolean("payouts_enabled").default(false),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertSellerProfileSchema = createInsertSchema(sellerProfiles).omit({ id: true, createdAt: true });
export type InsertSellerProfile = z.infer<typeof insertSellerProfileSchema>;
export type SellerProfile = typeof sellerProfiles.$inferSelect;

// PRODUCTS
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  fileUrl: text("file_url"),
  featured: boolean("featured").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ORDERS
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// BLOG POSTS
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  authorId: integer("author_id").notNull(),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

// BOOKINGS
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionType: text("session_type").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// RESOURCES
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  url: text("url"),
  membersOnly: boolean("members_only").default(false),
  imageUrl: text("image_url"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertResourceSchema = createInsertSchema(resources).omit({ id: true, createdAt: true });
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;
