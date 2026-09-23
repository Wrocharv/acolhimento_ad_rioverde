import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { admins } from "../drizzle/schema";
import { getDb } from "./db";
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

export type AdminLogado = { id: number; name: string; email: string; role: "total" | "kids" };

/** Quem esta logado agora, com o papel dele. */
export async function adminDaSessao(req: Request): Promise<AdminLogado | null> {
  const adminId = getAdminIdFromRequest(req);
  const db = getDb();
  if (!adminId || !db) return null;
  const [linha] = await db
    .select({ id: admins.id, name: admins.name, email: admins.email, role: admins.role })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);
  return linha ?? null;
}

/**
 * Painel inteiro: so quem tem acesso total. Quem foi criado so para a Missao Reino Kids nao
 * enxerga a base de pessoas da igreja.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const admin = await adminDaSessao(req).catch(() => null);
  if (!admin) return res.status(401).json({ error: "not_authenticated" });
  if (admin.role !== "total") return res.status(403).json({ error: "sem_permissao" });
  (req as Request & { adminId: number; admin: AdminLogado }).adminId = admin.id;
  (req as Request & { adminId: number; admin: AdminLogado }).admin = admin;
  next();
}

/** Telas da Missao Reino Kids: acesso total ou acesso so do evento. */
export async function requireKidsAdmin(req: Request, res: Response, next: NextFunction) {
  const admin = await adminDaSessao(req).catch(() => null);
  if (!admin) return res.status(401).json({ error: "not_authenticated" });
  (req as Request & { adminId: number; admin: AdminLogado }).adminId = admin.id;
  (req as Request & { adminId: number; admin: AdminLogado }).admin = admin;
  next();
}
