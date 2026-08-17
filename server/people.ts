import type { Express, Request, Response } from "express";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { getDb } from "./db";
import { people, customFields, customFieldValues, congregations } from "../drizzle/schema";
import { asyncHandler } from "./asyncHandler";

function dbOr503(res: Response) {
  res.status(503).json({ error: "database_unavailable" });
  return null;
}

const createPersonSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  congregation: z.string().trim().min(1),
  service: z.string().trim().optional(),
  filledBy: z.string().trim().min(1),
  firstVisitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sex: z.enum(["masculino", "feminino"]).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  howFound: z.string().trim().optional(),
  decisionForChrist: z.boolean().default(false),
  acceptsVisit: z.boolean().default(false),
  preferredVisitDay: z.string().trim().optional(),
  preferredVisitTime: z.string().trim().optional(),
  source: z.enum(["qrcode", "manual"]).default("qrcode"),
  customAnswers: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
});

export function registerPeopleRoutes(app: Express) {
  app.get(
    "/api/congregations",
    asyncHandler(async (_req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const rows = await db
        .select({ id: congregations.id, name: congregations.name })
        .from(congregations)
        .where(eq(congregations.active, true))
        .orderBy(asc(congregations.sortOrder));
      return res.json(rows);
    }),
  );

  app.get(
    "/api/custom-fields",
    asyncHandler(async (_req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const rows = await db
        .select({ id: customFields.id, label: customFields.label, type: customFields.type })
        .from(customFields)
        .where(eq(customFields.active, true))
        .orderBy(asc(customFields.sortOrder));
      return res.json(rows);
    }),
  );

  app.post(
    "/api/people",
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);

      const parsed = createPersonSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
      }
      const input = parsed.data;
      const today = new Date().toISOString().slice(0, 10);
      const visitDate = input.firstVisitDate || today;

      const [created] = await db
        .insert(people)
        .values({
          fullName: input.fullName,
          phone: input.phone.replace(/\D/g, ""),
          congregation: input.congregation,
          service: input.service || null,
          filledBy: input.filledBy || null,
          sex: input.sex || null,
          address: input.address || null,
          city: input.city || null,
          howFound: input.howFound || null,
          decisionForChrist: input.decisionForChrist,
          decisionDate: input.decisionForChrist ? visitDate : null,
          firstVisitDate: visitDate,
          status: input.decisionForChrist ? "decisao" : "visitante",
          source: input.source,
          acceptsVisit: input.acceptsVisit,
          preferredVisitDay: input.acceptsVisit ? input.preferredVisitDay || null : null,
          preferredVisitTime: input.acceptsVisit ? input.preferredVisitTime || null : null,
        })
        .returning();

      const answers = Object.entries(input.customAnswers ?? {});
      if (answers.length) {
        await db.insert(customFieldValues).values(
          answers.map(([customFieldId, value]) => ({
            personId: created.id,
            customFieldId: Number(customFieldId),
            value: typeof value === "boolean" ? (value ? "sim" : "não") : value,
          })),
        );
      }

      return res.status(201).json({ id: created.id });
    }),
  );
}
