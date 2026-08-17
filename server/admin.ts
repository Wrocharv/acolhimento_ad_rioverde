import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { admins, people, interactions, needs, customFields, customFieldValues, congregations } from "../drizzle/schema";
import { getDb } from "./db";
import { createSessionCookie, clearSessionCookie, requireAdmin, getAdminIdFromRequest } from "./auth";
import { asyncHandler } from "./asyncHandler";

function dbOr503(res: Response) {
  res.status(503).json({ error: "database_unavailable" });
  return null;
}

const PERSON_UPDATE_FIELDS = [
  "fullName",
  "phone",
  "congregation",
  "service",
  "filledBy",
  "sex",
  "address",
  "city",
  "howFound",
  "status",
  "assignedTo",
  "notes",
  "acceptsVisit",
  "preferredVisitDay",
  "preferredVisitTime",
] as const;

// Campos disponíveis pra exportação: chave -> { rótulo da coluna, expressão SQL, formatador do valor }.
const EXPORT_FIELDS = {
  fullName: { label: "nome", sql: sql`p.full_name`, format: (v: unknown) => String(v ?? "") },
  phone: { label: "telefone", sql: sql`p.phone`, format: (v: unknown) => String(v ?? "") },
  congregation: { label: "congregacao", sql: sql`p.congregation`, format: (v: unknown) => String(v ?? "") },
  service: { label: "culto", sql: sql`p.service`, format: (v: unknown) => String(v ?? "") },
  filledBy: { label: "preenchido_por", sql: sql`p.filled_by`, format: (v: unknown) => String(v ?? "") },
  sex: { label: "sexo", sql: sql`p.sex`, format: (v: unknown) => String(v ?? "") },
  address: { label: "endereco", sql: sql`p.address`, format: (v: unknown) => String(v ?? "") },
  city: { label: "cidade", sql: sql`p.city`, format: (v: unknown) => String(v ?? "") },
  status: { label: "status", sql: sql`p.status`, format: (v: unknown) => String(v ?? "") },
  decisionForChrist: { label: "decisao_por_cristo", sql: sql`p.decision_for_christ`, format: (v: unknown) => (v ? "sim" : "não") },
  decisionDate: { label: "data_decisao", sql: sql`p.decision_date`, format: (v: unknown) => String(v ?? "") },
  firstVisitDate: { label: "primeira_visita", sql: sql`p.first_visit_date`, format: (v: unknown) => String(v ?? "") },
  howFound: { label: "como_conheceu", sql: sql`p.how_found`, format: (v: unknown) => String(v ?? "") },
  assignedTo: { label: "responsavel", sql: sql`p.assigned_to`, format: (v: unknown) => String(v ?? "") },
  notes: { label: "observacoes", sql: sql`p.notes`, format: (v: unknown) => String(v ?? "") },
  acceptsVisit: { label: "aceita_visita", sql: sql`p.accepts_visit`, format: (v: unknown) => (v ? "sim" : "não") },
  preferredVisitDay: { label: "melhor_dia_visita", sql: sql`p.preferred_visit_day`, format: (v: unknown) => String(v ?? "") },
  preferredVisitTime: { label: "melhor_horario_visita", sql: sql`p.preferred_visit_time`, format: (v: unknown) => String(v ?? "") },
} as const;
type ExportFieldKey = keyof typeof EXPORT_FIELDS;
const DEFAULT_EXPORT_FIELDS: ExportFieldKey[] = ["fullName", "phone", "city", "status", "decisionForChrist"];

async function queryExportRows(db: NonNullable<ReturnType<typeof getDb>>, req: Request) {
  const status = typeof req.query.status === "string" && req.query.status ? req.query.status : undefined;
  const congregation = typeof req.query.congregation === "string" && req.query.congregation ? req.query.congregation : undefined;
  const decisionForChrist =
    req.query.decisionForChrist === "true" ? true : req.query.decisionForChrist === "false" ? false : undefined;

  const requestedFields = typeof req.query.fields === "string" ? req.query.fields.split(",").map((f) => f.trim()) : [];
  const fieldKeys: ExportFieldKey[] = requestedFields.filter((f): f is ExportFieldKey => f in EXPORT_FIELDS);
  const fields = fieldKeys.length ? fieldKeys : DEFAULT_EXPORT_FIELDS;

  const filters = [sql`1 = 1`];
  if (status) filters.push(sql`p.status = ${status}`);
  if (congregation) filters.push(sql`p.congregation = ${congregation}`);
  if (decisionForChrist !== undefined) filters.push(sql`p.decision_for_christ = ${decisionForChrist}`);

  const whereClause = sql.join(filters, sql` and `);
  const selectList = sql.join(
    fields.map((key) => sql`${EXPORT_FIELDS[key].sql} as ${sql.raw(`"${key}"`)}`),
    sql`, `,
  );
  const result = await db.execute(sql`
    select ${selectList}
    from people p
    where ${whereClause}
    order by p.full_name asc
  `);

  const rows = (result.rows as Record<string, unknown>[]).map((row) =>
    Object.fromEntries(fields.map((key) => [key, EXPORT_FIELDS[key].format(row[key])])),
  );
  return { fields, rows };
}

export function registerAdminRoutes(app: Express) {
  app.post(
    "/api/admin/login",
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);

      const { email, password } = req.body ?? {};
      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "missing_credentials" });
      }

      const [admin] = await db.select().from(admins).where(eq(admins.email, email.toLowerCase().trim())).limit(1);
      if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
        return res.status(401).json({ error: "invalid_credentials" });
      }

      res.setHeader("Set-Cookie", createSessionCookie(admin.id));
      return res.json({ id: admin.id, email: admin.email, name: admin.name });
    }),
  );

  app.post("/api/admin/logout", (_req: Request, res: Response) => {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.json({ ok: true });
  });

  app.get(
    "/api/admin/me",
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const adminId = getAdminIdFromRequest(req);
      if (!adminId) return res.status(401).json({ error: "not_authenticated" });
      const [admin] = await db.select().from(admins).where(eq(admins.id, adminId)).limit(1);
      if (!admin) return res.status(401).json({ error: "not_authenticated" });
      return res.json({ id: admin.id, email: admin.email, name: admin.name });
    }),
  );

  // Precisa vir antes de "/api/admin/people/:id" — senão o Express trata "export.csv" como valor de :id.
  app.get(
    "/api/admin/people/export.csv",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const { fields, rows } = await queryExportRows(db, req);

      const header = fields.map((key) => EXPORT_FIELDS[key].label).join(",") + "\n";
      const body = rows.map((row) => fields.map((key) => `"${String(row[key]).replace(/"/g, '""')}"`).join(",")).join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=acolhimento.csv");
      return res.send(header + body);
    }),
  );

  app.get(
    "/api/admin/people/export.xlsx",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const { fields, rows } = await queryExportRows(db, req);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Acolhimento");
      sheet.columns = fields.map((key) => ({ header: EXPORT_FIELDS[key].label, key, width: 22 }));
      sheet.getRow(1).font = { bold: true };
      rows.forEach((row) => sheet.addRow(row));

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=acolhimento.xlsx");
      await workbook.xlsx.write(res);
      return res.end();
    }),
  );

  app.get(
    "/api/admin/people/export.json",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const { fields, rows } = await queryExportRows(db, req);
      return res.json({ columns: fields.map((key) => ({ key, label: EXPORT_FIELDS[key].label })), rows });
    }),
  );

  // Precisa vir antes de "/api/admin/people/:id" pelo mesmo motivo.
  app.get(
    "/api/admin/people/pending-welcome",
    requireAdmin,
    asyncHandler(async (_req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const rows = await db
        .select()
        .from(people)
        .where(and(eq(people.decisionForChrist, true), sql`${people.welcomeMessageSentAt} is null`))
        .orderBy(desc(people.decisionDate));
      return res.json(rows);
    }),
  );

  app.get(
    "/api/admin/people",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const status = typeof req.query.status === "string" && req.query.status ? req.query.status : undefined;
      const congregation = typeof req.query.congregation === "string" && req.query.congregation ? req.query.congregation : undefined;
      const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;

      const filters = [sql`1 = 1`];
      if (status) filters.push(sql`${people.status} = ${status}`);
      if (congregation) filters.push(sql`${people.congregation} = ${congregation}`);
      if (search) filters.push(sql`(${people.fullName} ilike ${`%${search}%`} or ${people.phone} ilike ${`%${search}%`})`);

      const rows = await db
        .select()
        .from(people)
        .where(and(...filters))
        .orderBy(desc(people.createdAt));
      return res.json(rows);
    }),
  );

  app.get(
    "/api/admin/people/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const personId = Number(req.params.id);
      const [person] = await db.select().from(people).where(eq(people.id, personId)).limit(1);
      if (!person) return res.status(404).json({ error: "not_found" });

      const [interactionRows, needRows, customAnswerRows] = await Promise.all([
        db.select().from(interactions).where(eq(interactions.personId, personId)).orderBy(desc(interactions.createdAt)),
        db.select().from(needs).where(eq(needs.personId, personId)).orderBy(desc(needs.createdAt)),
        db
          .select({ id: customFieldValues.id, label: customFields.label, type: customFields.type, value: customFieldValues.value })
          .from(customFieldValues)
          .innerJoin(customFields, eq(customFieldValues.customFieldId, customFields.id))
          .where(eq(customFieldValues.personId, personId)),
      ]);

      return res.json({ ...person, interactions: interactionRows, needs: needRows, customAnswers: customAnswerRows });
    }),
  );

  app.patch(
    "/api/admin/people/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const personId = Number(req.params.id);

      const updates: Record<string, unknown> = {};
      for (const field of PERSON_UPDATE_FIELDS) {
        if (field in (req.body ?? {})) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: "no_fields" });
      updates.updatedAt = new Date();

      await db.update(people).set(updates).where(eq(people.id, personId));
      const [updated] = await db.select().from(people).where(eq(people.id, personId)).limit(1);
      if (!updated) return res.status(404).json({ error: "not_found" });
      return res.json(updated);
    }),
  );

  app.post(
    "/api/admin/people/:id/welcome-sent",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const personId = Number(req.params.id);
      await db.update(people).set({ welcomeMessageSentAt: new Date(), updatedAt: new Date() }).where(eq(people.id, personId));
      return res.json({ ok: true });
    }),
  );

  app.post(
    "/api/admin/people/:id/interactions",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const personId = Number(req.params.id);
      const { type, note } = req.body ?? {};
      const validTypes = ["mensagem", "ligacao", "presenca_culto", "visita", "outro"] as const;
      if (typeof type !== "string" || !(validTypes as readonly string[]).includes(type)) {
        return res.status(400).json({ error: "invalid_type" });
      }
      const [created] = await db
        .insert(interactions)
        .values({ personId, type: type as (typeof validTypes)[number], note: typeof note === "string" ? note : null })
        .returning();
      return res.status(201).json(created);
    }),
  );

  app.post(
    "/api/admin/people/:id/needs",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const personId = Number(req.params.id);
      const { type, description } = req.body ?? {};
      const validTypes = ["financeiro", "oracao", "aconselhamento", "outro"] as const;
      if (typeof type !== "string" || !(validTypes as readonly string[]).includes(type) || typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ error: "invalid_input" });
      }
      const [created] = await db
        .insert(needs)
        .values({ personId, type: type as (typeof validTypes)[number], description: description.trim() })
        .returning();
      return res.status(201).json(created);
    }),
  );

  app.patch(
    "/api/admin/needs/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const needId = Number(req.params.id);
      const { status } = req.body ?? {};
      if (status !== "aberto" && status !== "resolvido") return res.status(400).json({ error: "invalid_status" });
      await db
        .update(needs)
        .set({ status, resolvedAt: status === "resolvido" ? new Date() : null })
        .where(eq(needs.id, needId));
      return res.json({ ok: true });
    }),
  );

  app.get(
    "/api/admin/custom-fields",
    requireAdmin,
    asyncHandler(async (_req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const rows = await db.select().from(customFields).orderBy(asc(customFields.sortOrder));
      return res.json(rows);
    }),
  );

  app.post(
    "/api/admin/custom-fields",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const { label, type } = req.body ?? {};
      if (typeof label !== "string" || !label.trim() || (type !== "text" && type !== "checkbox")) {
        return res.status(400).json({ error: "invalid_input" });
      }
      const [{ maxOrder }] = await db.select({ maxOrder: sql<number>`coalesce(max(sort_order), -1)` }).from(customFields);
      const [created] = await db
        .insert(customFields)
        .values({ label: label.trim(), type, sortOrder: maxOrder + 1 })
        .returning();
      return res.status(201).json(created);
    }),
  );

  app.patch(
    "/api/admin/custom-fields/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const fieldId = Number(req.params.id);
      const updates: Record<string, unknown> = {};
      if (typeof req.body?.label === "string") updates.label = req.body.label.trim();
      if (req.body?.type === "text" || req.body?.type === "checkbox") updates.type = req.body.type;
      if (typeof req.body?.active === "boolean") updates.active = req.body.active;
      if (typeof req.body?.sortOrder === "number") updates.sortOrder = req.body.sortOrder;
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: "no_fields" });
      await db.update(customFields).set(updates).where(eq(customFields.id, fieldId));
      return res.json({ ok: true });
    }),
  );

  app.delete(
    "/api/admin/custom-fields/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const fieldId = Number(req.params.id);
      await db.delete(customFieldValues).where(eq(customFieldValues.customFieldId, fieldId));
      await db.delete(customFields).where(eq(customFields.id, fieldId));
      return res.json({ ok: true });
    }),
  );

  app.get(
    "/api/admin/congregations",
    requireAdmin,
    asyncHandler(async (_req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const rows = await db.select().from(congregations).orderBy(asc(congregations.sortOrder));
      return res.json(rows);
    }),
  );

  app.post(
    "/api/admin/congregations",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const { name } = req.body ?? {};
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "invalid_input" });
      }
      const [{ maxOrder }] = await db.select({ maxOrder: sql<number>`coalesce(max(sort_order), -1)` }).from(congregations);
      const [created] = await db
        .insert(congregations)
        .values({ name: name.trim(), sortOrder: maxOrder + 1 })
        .returning();
      return res.status(201).json(created);
    }),
  );

  app.patch(
    "/api/admin/congregations/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const congregationId = Number(req.params.id);
      const updates: Record<string, unknown> = {};
      if (typeof req.body?.name === "string" && req.body.name.trim()) updates.name = req.body.name.trim();
      if (typeof req.body?.active === "boolean") updates.active = req.body.active;
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: "no_fields" });
      await db.update(congregations).set(updates).where(eq(congregations.id, congregationId));
      return res.json({ ok: true });
    }),
  );
}
