import type { Express, Request, Response } from "express";
import { z } from "zod";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { kidsEditions, kidsSignups, kidsTeams } from "../drizzle/schema";
import { asyncHandler } from "./asyncHandler";
import { requireAdmin } from "./auth";

function dbOr503(res: Response) {
  res.status(503).json({ error: "database_unavailable" });
  return null;
}

/** As 12 equipes que o Wellington passou. Nascem na primeira vez que a area e aberta. */
const EQUIPES_PADRAO = [
  "Recepção e Check-in",
  "Cachorro-Quente",
  "Pipoca",
  "Algodão-Doce",
  "Brinquedos Infláveis",
  "Distribuição de Brinquedos",
  "Geladinho",
  "Bebidas",
  "Limpeza e Organização Pós-Evento",
  "Lembrancinhas",
  "Personagens e Recepção Infantil",
  "Segurança e Apoio",
];

type Banco = NonNullable<ReturnType<typeof getDb>>;

/** Primeira abertura: cria as 12 equipes e uma edicao, pra ninguem ter que configurar nada. */
async function garantirBase(db: Banco) {
  const [equipe] = await db.select({ id: kidsTeams.id }).from(kidsTeams).limit(1);
  if (!equipe) {
    await db.insert(kidsTeams).values(EQUIPES_PADRAO.map((name, i) => ({ name, slots: 10, sortOrder: i })));
  }
  const [edicao] = await db.select({ id: kidsEditions.id }).from(kidsEditions).limit(1);
  if (!edicao) {
    await db.insert(kidsEditions).values({ title: "Missão Reino Kids" });
  }
}

/** A edicao que esta valendo: a aberta mais recente, ou a ultima criada. */
async function edicaoAtual(db: Banco) {
  const [aberta] = await db.select().from(kidsEditions).where(eq(kidsEditions.open, true)).orderBy(desc(kidsEditions.id)).limit(1);
  if (aberta) return aberta;
  const [ultima] = await db.select().from(kidsEditions).orderBy(desc(kidsEditions.id)).limit(1);
  return ultima ?? null;
}

/** Quantos confirmados e quantos na fila, equipe por equipe. */
async function equipesComVagas(db: Banco, editionId: number) {
  const equipes = await db.select().from(kidsTeams).where(eq(kidsTeams.active, true)).orderBy(asc(kidsTeams.sortOrder), asc(kidsTeams.id));
  const contagem = await db
    .select({ teamId: kidsSignups.teamId, status: kidsSignups.status, n: sql<number>`count(*)::int` })
    .from(kidsSignups)
    .where(eq(kidsSignups.editionId, editionId))
    .groupBy(kidsSignups.teamId, kidsSignups.status);

  return equipes.map((e) => {
    const n = (status: string) => Number(contagem.find((c) => c.teamId === e.id && c.status === status)?.n ?? 0);
    const confirmados = n("confirmado");
    return {
      id: e.id,
      name: e.name,
      slots: e.slots,
      confirmados,
      vagas: Math.max(e.slots - confirmados, 0),
      fila: n("espera"),
    };
  });
}

const soDigitos = (v: string) => v.replace(/\D/g, "");

const inscricaoSchema = z.object({
  teamId: z.number().int(),
  fullName: z.string().trim().min(3).max(255),
  phone: z.string().trim().min(10).max(20),
  age: z.number().int().min(10).max(99).optional().nullable(),
  congregation: z.string().trim().max(120).optional().nullable(),
  vestSize: z.enum(["P", "M", "G", "GG", "XG"]).optional().nullable(),
  experience: z.string().trim().max(400).optional().nullable(),
  notes: z.string().trim().max(400).optional().nullable(),
  // A pessoa marca isto quando a equipe escolhida ja encheu e ela quer esperar vaga nela.
  aceitaFila: z.boolean().optional(),
});

export function registerKidsRoutes(app: Express) {
  // ---------- Publico ----------
  app.get(
    "/api/kids/evento",
    asyncHandler(async (_req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      await garantirBase(db);
      const edicao = await edicaoAtual(db);
      if (!edicao) return res.status(404).json({ error: "sem_edicao" });
      const equipes = await equipesComVagas(db, edicao.id);
      const totalVagas = equipes.reduce((s, e) => s + e.slots, 0);
      const totalConfirmados = equipes.reduce((s, e) => s + e.confirmados, 0);
      res.json({ edicao, equipes, totalVagas, totalConfirmados, lotado: totalConfirmados >= totalVagas });
    }),
  );

  app.post(
    "/api/kids/inscricoes",
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      await garantirBase(db);
      const edicao = await edicaoAtual(db);
      if (!edicao) return res.status(404).json({ error: "sem_edicao" });
      if (!edicao.open) return res.status(409).json({ error: "inscricoes_encerradas" });

      const parsed = inscricaoSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
      const input = parsed.data;
      const phone = soDigitos(input.phone);
      if (phone.length < 10 || phone.length > 11) return res.status(400).json({ error: "telefone_invalido" });

      // Vaga e fila contadas dentro da transacao: duas pessoas enviando ao mesmo tempo nao podem
      // ocupar a mesma vaga.
      try {
        const criado = await db.transaction(async (tx) => {
          const [equipe] = await tx.select().from(kidsTeams).where(eq(kidsTeams.id, input.teamId)).limit(1);
          if (!equipe || !equipe.active) throw new Error("equipe_invalida");

          const [ja] = await tx
            .select({ id: kidsSignups.id, status: kidsSignups.status })
            .from(kidsSignups)
            .where(and(eq(kidsSignups.editionId, edicao.id), eq(kidsSignups.phone, phone), sql`${kidsSignups.status} <> 'cancelado'`))
            .limit(1);
          if (ja) throw new Error("ja_inscrito");

          const [{ n }] = await tx
            .select({ n: sql<number>`count(*)::int` })
            .from(kidsSignups)
            .where(and(eq(kidsSignups.editionId, edicao.id), eq(kidsSignups.teamId, equipe.id), eq(kidsSignups.status, "confirmado")));

          const temVaga = Number(n) < equipe.slots;
          if (!temVaga && !input.aceitaFila) throw new Error("equipe_lotada");

          const [linha] = await tx
            .insert(kidsSignups)
            .values({
              editionId: edicao.id,
              teamId: equipe.id,
              fullName: input.fullName,
              phone,
              age: input.age ?? null,
              congregation: input.congregation || null,
              vestSize: input.vestSize ?? null,
              experience: input.experience || null,
              notes: input.notes || null,
              status: temVaga ? "confirmado" : "espera",
            })
            .returning();
          return { linha, equipe };
        });

        const posicao =
          criado.linha.status === "espera"
            ? (
                await db
                  .select({ n: sql<number>`count(*)::int` })
                  .from(kidsSignups)
                  .where(
                    and(
                      eq(kidsSignups.editionId, edicao.id),
                      eq(kidsSignups.teamId, criado.equipe.id),
                      eq(kidsSignups.status, "espera"),
                      sql`${kidsSignups.id} <= ${criado.linha.id}`,
                    ),
                  )
              )[0].n
            : null;

        res.json({ status: criado.linha.status, equipe: criado.equipe.name, posicaoNaFila: posicao ? Number(posicao) : null });
      } catch (e) {
        const codigo = (e as Error).message;
        if (["equipe_invalida", "ja_inscrito", "equipe_lotada"].includes(codigo)) return res.status(409).json({ error: codigo });
        throw e;
      }
    }),
  );

  // ---------- Painel ----------
  app.get(
    "/api/admin/kids/painel",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      await garantirBase(db);
      const edicoes = await db.select().from(kidsEditions).orderBy(desc(kidsEditions.id));
      const pedida = Number(req.query.edicao);
      const edicao = edicoes.find((e) => e.id === pedida) ?? (await edicaoAtual(db))!;
      const equipes = await equipesComVagas(db, edicao.id);
      const inscricoes = await db
        .select()
        .from(kidsSignups)
        .where(eq(kidsSignups.editionId, edicao.id))
        .orderBy(asc(kidsSignups.teamId), asc(kidsSignups.id));
      res.json({ edicoes, edicao, equipes, inscricoes });
    }),
  );

  app.post(
    "/api/admin/kids/edicoes",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const title = String(req.body?.title ?? "").trim() || "Missão Reino Kids";
      const [nova] = await db.insert(kidsEditions).values({ title }).returning();
      // So uma edicao aberta por vez: as anteriores fecham sozinhas.
      await db.update(kidsEditions).set({ open: false }).where(sql`${kidsEditions.id} <> ${nova.id}`);
      res.json(nova);
    }),
  );

  app.patch(
    "/api/admin/kids/edicoes/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const dados = z
        .object({
          title: z.string().trim().min(2).max(160).optional(),
          eventDate: z.string().trim().max(10).optional().nullable(),
          startTime: z.string().trim().max(40).optional().nullable(),
          place: z.string().trim().max(200).optional().nullable(),
          notes: z.string().trim().max(2000).optional().nullable(),
          open: z.boolean().optional(),
        })
        .safeParse(req.body);
      if (!dados.success) return res.status(400).json({ error: "invalid_input" });
      const mudancas = { ...dados.data };
      if (mudancas.eventDate === "") mudancas.eventDate = null;
      const [linha] = await db
        .update(kidsEditions)
        .set(mudancas)
        .where(eq(kidsEditions.id, Number(req.params.id)))
        .returning();
      if (!linha) return res.status(404).json({ error: "nao_encontrado" });
      if (mudancas.open) await db.update(kidsEditions).set({ open: false }).where(sql`${kidsEditions.id} <> ${linha.id}`);
      res.json(linha);
    }),
  );

  app.patch(
    "/api/admin/kids/equipes/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const dados = z
        .object({
          name: z.string().trim().min(2).max(120).optional(),
          slots: z.number().int().min(0).max(200).optional(),
          active: z.boolean().optional(),
        })
        .safeParse(req.body);
      if (!dados.success) return res.status(400).json({ error: "invalid_input" });
      const [linha] = await db.update(kidsTeams).set(dados.data).where(eq(kidsTeams.id, Number(req.params.id))).returning();
      if (!linha) return res.status(404).json({ error: "nao_encontrado" });
      res.json(linha);
    }),
  );

  app.post(
    "/api/admin/kids/equipes",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const name = String(req.body?.name ?? "").trim();
      const slots = Number(req.body?.slots ?? 10);
      if (name.length < 2) return res.status(400).json({ error: "invalid_input" });
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(kidsTeams);
      const [linha] = await db.insert(kidsTeams).values({ name, slots, sortOrder: Number(n) }).returning();
      res.json(linha);
    }),
  );

  /**
   * Muda uma inscricao: subir da fila para a equipe, trocar de equipe, cancelar ou marcar presenca.
   * Subir da fila e sempre decisao do administrador — o sistema nunca promove sozinho.
   */
  app.patch(
    "/api/admin/kids/inscricoes/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      const dados = z
        .object({
          status: z.enum(["confirmado", "espera", "cancelado"]).optional(),
          teamId: z.number().int().optional(),
          presente: z.boolean().optional(),
        })
        .safeParse(req.body);
      if (!dados.success) return res.status(400).json({ error: "invalid_input" });

      const [atual] = await db.select().from(kidsSignups).where(eq(kidsSignups.id, Number(req.params.id))).limit(1);
      if (!atual) return res.status(404).json({ error: "nao_encontrado" });

      const teamId = dados.data.teamId ?? atual.teamId;
      const status = dados.data.status ?? atual.status;

      // Passar de "espera" para "confirmado" (ou mudar de equipe) so vale se houver vaga la.
      if (status === "confirmado" && (atual.status !== "confirmado" || teamId !== atual.teamId)) {
        const [equipe] = await db.select().from(kidsTeams).where(eq(kidsTeams.id, teamId)).limit(1);
        if (!equipe) return res.status(400).json({ error: "equipe_invalida" });
        const [{ n }] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(kidsSignups)
          .where(
            and(
              eq(kidsSignups.editionId, atual.editionId),
              eq(kidsSignups.teamId, teamId),
              eq(kidsSignups.status, "confirmado"),
              sql`${kidsSignups.id} <> ${atual.id}`,
            ),
          );
        if (Number(n) >= equipe.slots) return res.status(409).json({ error: "equipe_lotada" });
      }

      const mudancas: Record<string, unknown> = { teamId, status, updatedAt: new Date() };
      if (dados.data.presente !== undefined) mudancas.attendedAt = dados.data.presente ? new Date() : null;

      const [linha] = await db.update(kidsSignups).set(mudancas).where(eq(kidsSignups.id, atual.id)).returning();
      res.json(linha);
    }),
  );

  app.delete(
    "/api/admin/kids/inscricoes/:id",
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      if (!db) return dbOr503(res);
      await db.delete(kidsSignups).where(eq(kidsSignups.id, Number(req.params.id)));
      res.json({ ok: true });
    }),
  );
}
