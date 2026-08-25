import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { promisify } from "node:util";
import { storage } from "./storage";

const scrypt = promisify(crypto.scrypt);
const MemoryStore = createMemoryStore(session);

declare module "express-session" {
  interface SessionData { userId?: number }
}

export function sessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production");
  }
  return session({
    secret: secret || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 }),
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 12 * 60 * 60 * 1000 },
  });
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith("scrypt$")) return stored === password; // one-time legacy migration
  const [, salt, expectedHex] = stored.split("$");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function currentUser(req: Request) {
  return req.session.userId ? storage.getUser(req.session.userId) : undefined;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.locals.user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await currentUser(req);
  if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  res.locals.user = user;
  next();
}
