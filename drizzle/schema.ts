import { pgTable, serial, varchar, text, boolean, integer, timestamp, date, pgEnum } from "drizzle-orm/pg-core";

export const personStatusEnum = pgEnum("person_status", ["visitante", "decisao", "em_acompanhamento", "membro", "afastado"]);
export const personSourceEnum = pgEnum("person_source", ["qrcode", "manual"]);
export const interactionTypeEnum = pgEnum("interaction_type", ["mensagem", "ligacao", "presenca_culto", "visita", "outro"]);
export const needTypeEnum = pgEnum("need_type", ["financeiro", "oracao", "aconselhamento", "outro"]);
export const needStatusEnum = pgEnum("need_status", ["aberto", "resolvido"]);
export const sexEnum = pgEnum("sex", ["masculino", "feminino"]);
export const customFieldTypeEnum = pgEnum("custom_field_type", ["text", "checkbox"]);

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

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
