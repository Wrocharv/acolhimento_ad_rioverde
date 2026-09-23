import { pgTable, serial, varchar, text, boolean, integer, timestamp, date, pgEnum } from "drizzle-orm/pg-core";

export const personStatusEnum = pgEnum("person_status", ["visitante", "decisao", "em_acompanhamento", "membro", "afastado"]);
export const personSourceEnum = pgEnum("person_source", ["qrcode", "manual"]);
export const interactionTypeEnum = pgEnum("interaction_type", ["mensagem", "ligacao", "presenca_culto", "visita", "outro"]);
export const needTypeEnum = pgEnum("need_type", ["financeiro", "oracao", "aconselhamento", "outro"]);
export const needStatusEnum = pgEnum("need_status", ["aberto", "resolvido"]);
export const sexEnum = pgEnum("sex", ["masculino", "feminino"]);
export const customFieldTypeEnum = pgEnum("custom_field_type", ["text", "checkbox"]);
export const volunteerRoleEnum = pgEnum("volunteer_role", ["lider", "voluntario"]);
export const kidsSignupStatusEnum = pgEnum("kids_signup_status", ["confirmado", "espera", "cancelado"]);
export const volunteerStatusEnum = pgEnum("volunteer_status", ["pendente", "aprovado", "rejeitado"]);

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  congregation: varchar("congregation", { length: 120 }).notNull().default("Sede"),
  service: varchar("service", { length: 120 }),
  filledBy: varchar("filled_by", { length: 255 }),
  sex: sexEnum("sex"),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 120 }),
  howFound: varchar("how_found", { length: 120 }),
  decisionForChrist: boolean("decision_for_christ").notNull().default(false),
  decisionDate: date("decision_date"),
  firstVisitDate: date("first_visit_date").notNull(),
  status: personStatusEnum("status").notNull().default("visitante"),
  assignedTo: varchar("assigned_to", { length: 255 }),
  notes: text("notes"),
  source: personSourceEnum("source").notNull().default("qrcode"),
  welcomeMessageSentAt: timestamp("welcome_message_sent_at"),
  acceptsVisit: boolean("accepts_visit").notNull().default(false),
  preferredVisitDay: varchar("preferred_visit_day", { length: 120 }),
  preferredVisitTime: varchar("preferred_visit_time", { length: 120 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  personId: integer("person_id")
    .notNull()
    .references(() => people.id),
  type: interactionTypeEnum("type").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const needs = pgTable("needs", {
  id: serial("id").primaryKey(),
  personId: integer("person_id")
    .notNull()
    .references(() => people.id),
  type: needTypeEnum("type").notNull(),
  description: text("description").notNull(),
  status: needStatusEnum("status").notNull().default("aberto"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 255 }).notNull(),
  type: customFieldTypeEnum("type").notNull().default("text"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customFieldValues = pgTable("custom_field_values", {
  id: serial("id").primaryKey(),
  personId: integer("person_id")
    .notNull()
    .references(() => people.id),
  customFieldId: integer("custom_field_id")
    .notNull()
    .references(() => customFields.id),
  value: text("value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const congregations = pgTable("congregations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  congregation: varchar("congregation", { length: 120 }).notNull(),
  role: volunteerRoleEnum("role").notNull().default("voluntario"),
  status: volunteerStatusEnum("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Missao Reino Kids: as equipes de servico do evento. Sao linhas (e nao um enum) porque o
 * Wellington muda o nome e o numero de vagas de uma edicao pra outra.
 */
export const kidsTeams = pgTable("kids_teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slots: integer("slots").notNull().default(10),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Cada realizacao do evento. As equipes se repetem; as inscricoes sao por edicao. */
export const kidsEditions = pgTable("kids_editions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 160 }).notNull().default("Missão Reino Kids"),
  eventDate: date("event_date"),
  startTime: varchar("start_time", { length: 40 }),
  place: varchar("place", { length: 200 }),
  notes: text("notes"),
  open: boolean("open").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Inscricao de um voluntario numa equipe. "espera" e a fila daquela equipe, na ordem de
 * inscricao — quem sobe pra vaga e sempre escolhido pelo administrador, nunca automatico.
 */
export const kidsSignups = pgTable("kids_signups", {
  id: serial("id").primaryKey(),
  editionId: integer("edition_id").notNull().references(() => kidsEditions.id),
  teamId: integer("team_id").notNull().references(() => kidsTeams.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  age: integer("age"),
  congregation: varchar("congregation", { length: 120 }),
  vestSize: varchar("vest_size", { length: 6 }),
  experience: text("experience"),
  notes: text("notes"),
  status: kidsSignupStatusEnum("status").notNull().default("confirmado"),
  attendedAt: timestamp("attended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
