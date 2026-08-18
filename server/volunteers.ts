import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { volunteers } from "../drizzle/schema";
import { asyncHandler } from "./asyncHandler";
import { createVolunteerSessionCookie, clearVolunteerSessionCookie, getVolunteerIdFromRequest, requireLeader } from "./volunteerAuth";

function dbOr503(res: Response) {
  res.status(503).json({ error: "database_unavailable" });
  return null;
}

const signupSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  congregation: z.string().trim().min(1),
});

export function registerVolunteerRoutes(app: Express) {
  app.post(
    "/api/volunteers/signup",
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);

      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
      }
      const input = parsed.data;

      const [existing] = await db.select({ id: volunteers.id }).from(volunteers).where(eq(volunteers.email, input.email)).limit(1);
      if (existing) return res.status(409).json({ error: "email_already_registered" });

      const passwordHash = await bcrypt.hash(input.password, 10);
      const [created] = await db
        .insert(volunteers)
        .values({ name: input.name, email: input.email, passwordHash, congregation: input.congregation })
        .returning();

      return res.status(201).json({ id: created.id, status: created.status });
    }),
  );

  app.post(
    "/api/volunteers/login",
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);

      const { email, password } = req.body ?? {};
      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "missing_credentials" });
      }

      const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.email, email.toLowerCase().trim())).limit(1);
      if (!volunteer || !(await bcrypt.compare(password, volunteer.passwordHash))) {
        return res.status(401).json({ error: "invalid_credentials" });
      }
      if (volunteer.status !== "aprovado") {
        return res.status(403).json({ error: `account_${volunteer.status}` });
      }

      res.setHeader("Set-Cookie", createVolunteerSessionCookie(volunteer.id));
      return res.json({ id: volunteer.id, name: volunteer.name, email: volunteer.email, congregation: volunteer.congregation, role: volunteer.role });
    }),
  );

  app.post("/api/volunteers/logout", (_req: Request, res: Response) => {
    res.setHeader("Set-Cookie", clearVolunteerSessionCookie());
    return res.json({ ok: true });
  });

  app.get(
    "/api/volunteers/me",
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const volunteerId = getVolunteerIdFromRequest(req);
      if (!volunteerId) return res.status(401).json({ error: "not_authenticated" });
      const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.id, volunteerId)).limit(1);
      if (!volunteer || volunteer.status !== "aprovado") return res.status(401).json({ error: "not_authenticated" });
      return res.json({ id: volunteer.id, name: volunteer.name, email: volunteer.email, congregation: volunteer.congregation, role: volunteer.role });
    }),
  );

  app.get(
    "/api/volunteers/pending",
    requireLeader,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const leaderCongregation = (req as Request & { leaderCongregation: string }).leaderCongregation;
      const rows = await db
        .select({ id: volunteers.id, name: volunteers.name, email: volunteers.email, createdAt: volunteers.createdAt })
        .from(volunteers)
        .where(and(eq(volunteers.congregation, leaderCongregation), eq(volunteers.status, "pendente")));
      return res.json(rows);
    }),
  );

  app.post(
    "/api/volunteers/:id/approve",
    requireLeader,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const leaderCongregation = (req as Request & { leaderCongregation: string }).leaderCongregation;
      const volunteerId = Number(req.params.id);
      const [target] = await db.select().from(volunteers).where(eq(volunteers.id, volunteerId)).limit(1);
      if (!target || target.congregation !== leaderCongregation) return res.status(404).json({ error: "not_found" });
      await db.update(volunteers).set({ status: "aprovado", approvedAt: new Date() }).where(eq(volunteers.id, volunteerId));
      return res.json({ ok: true });
    }),
  );

  app.post(
    "/api/volunteers/:id/reject",
    requireLeader,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const leaderCongregation = (req as Request & { leaderCongregation: string }).leaderCongregation;
      const volunteerId = Number(req.params.id);
      const [target] = await db.select().from(volunteers).where(eq(volunteers.id, volunteerId)).limit(1);
      if (!target || target.congregation !== leaderCongregation) return res.status(404).json({ error: "not_found" });
      await db.update(volunteers).set({ status: "rejeitado" }).where(eq(volunteers.id, volunteerId));
      return res.json({ ok: true });
    }),
  );
}
