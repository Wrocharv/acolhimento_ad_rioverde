CREATE TYPE "public"."interaction_type" AS ENUM('mensagem', 'ligacao', 'presenca_culto', 'visita', 'outro');--> statement-breakpoint
CREATE TYPE "public"."need_status" AS ENUM('aberto', 'resolvido');--> statement-breakpoint
CREATE TYPE "public"."need_type" AS ENUM('financeiro', 'oracao', 'aconselhamento', 'outro');--> statement-breakpoint
CREATE TYPE "public"."person_source" AS ENUM('qrcode', 'manual');--> statement-breakpoint
CREATE TYPE "public"."person_status" AS ENUM('visitante', 'decisao', 'em_acompanhamento', 'membro', 'afastado');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"type" "interaction_type" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "needs" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"type" "need_type" NOT NULL,
	"description" text NOT NULL,
	"status" "need_status" DEFAULT 'aberto' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"city" varchar(120),
	"how_found" varchar(120),
	"decision_for_christ" boolean DEFAULT false NOT NULL,
	"decision_date" date,
	"first_visit_date" date NOT NULL,
	"status" "person_status" DEFAULT 'visitante' NOT NULL,
	"assigned_to" varchar(255),
	"notes" text,
	"source" "person_source" DEFAULT 'qrcode' NOT NULL,
	"welcome_message_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interactions" ADD CONSTRAINT "interactions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "needs" ADD CONSTRAINT "needs_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
