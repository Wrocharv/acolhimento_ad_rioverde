import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import * as cookie from "cookie";
import { ENV } from "./env";

const COOKIE_NAME = "acolhimento_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

function sign(value: string) {
  return createHmac("sha256", ENV.adminSessionSecret).update(value).digest("hex");
}

export function createSessionCookie(adminId: number) {
  const payload = `${adminId}.${Date.now()}`;
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

export function clearSessionCookie() {
  return cookie.serialize(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

function parseSessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminIdStr, ts, signature] = parts;
  const expected = sign(`${adminIdStr}.${ts}`);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }
  const adminId = Number(adminIdStr);
  return Number.isFinite(adminId) ? adminId : null;
}

export function getAdminIdFromRequest(req: Request): number | null {
  const cookies = cookie.parse(req.headers.cookie || "");
  return parseSessionToken(cookies[COOKIE_NAME]);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminId = getAdminIdFromRequest(req);
  if (!adminId) {
    return res.status(401).json({ error: "not_authenticated" });
  }
  (req as Request & { adminId: number }).adminId = adminId;
  next();
}
