CREATE TYPE "public"."kids_signup_status" AS ENUM('confirmado', 'espera', 'cancelado');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kids_editions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(160) DEFAULT 'Missão Reino Kids' NOT NULL,
	"event_date" date,
	"start_time" varchar(40),
	"place" varchar(200),
	"notes" text,
	"open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kids_signups" (
	"id" serial PRIMARY KEY NOT NULL,
	"edition_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"age" integer,
	"congregation" varchar(120),
	"vest_size" varchar(6),
	"experience" text,
	"notes" text,
	"status" "kids_signup_status" DEFAULT 'confirmado' NOT NULL,
	"attended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kids_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slots" integer DEFAULT 10 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kids_signups" ADD CONSTRAINT "kids_signups_edition_id_kids_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."kids_editions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kids_signups" ADD CONSTRAINT "kids_signups_team_id_kids_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."kids_teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
