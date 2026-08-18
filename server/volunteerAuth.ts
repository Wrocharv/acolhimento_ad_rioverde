import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { ENV } from "./env";
import { getDb } from "./db";
import { volunteers } from "../drizzle/schema";

const COOKIE_NAME = "acolhimento_volunteer_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

function sign(value: string) {
  return createHmac("sha256", ENV.adminSessionSecret).update(value).digest("hex");
}

export function createVolunteerSessionCookie(volunteerId: number) {
  const payload = `${volunteerId}.${Date.now()}`;
  const signature = sign(payload);
  const token = `${payload}.${signature}`;
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: ENV.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearVolunteerSessionCookie() {
  return cookie.serialize(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

function parseSessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [volunteerIdStr, ts, signature] = parts;
  const expected = sign(`${volunteerIdStr}.${ts}`);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }
  const volunteerId = Number(volunteerIdStr);
  return Number.isFinite(volunteerId) ? volunteerId : null;
}

export function getVolunteerIdFromRequest(req: Request): number | null {
  const cookies = cookie.parse(req.headers.cookie || "");
  return parseSessionToken(cookies[COOKIE_NAME]);
}

export function requireVolunteer(req: Request, res: Response, next: NextFunction) {
  const volunteerId = getVolunteerIdFromRequest(req);
  if (!volunteerId) {
    return res.status(401).json({ error: "not_authenticated" });
  }
  (req as Request & { volunteerId: number }).volunteerId = volunteerId;
  next();
}

export async function requireLeader(req: Request, res: Response, next: NextFunction) {
  const volunteerId = getVolunteerIdFromRequest(req);
  if (!volunteerId) return res.status(401).json({ error: "not_authenticated" });

  const db = getDb();
  if (!db) return res.status(503).json({ error: "database_unavailable" });

  const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.id, volunteerId)).limit(1);
  if (!volunteer || volunteer.role !== "lider" || volunteer.status !== "aprovado") {
    return res.status(403).json({ error: "not_a_leader" });
  }
  (req as Request & { volunteerId: number; leaderCongregation: string }).volunteerId = volunteerId;
  (req as Request & { volunteerId: number; leaderCongregation: string }).leaderCongregation = volunteer.congregation;
  next();
}
