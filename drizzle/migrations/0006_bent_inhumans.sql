CREATE TYPE "public"."volunteer_role" AS ENUM('lider', 'voluntario');--> statement-breakpoint
CREATE TYPE "public"."volunteer_status" AS ENUM('pendente', 'aprovado', 'rejeitado');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volunteers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"congregation" varchar(120) NOT NULL,
	"role" "volunteer_role" DEFAULT 'voluntario' NOT NULL,
	"status" "volunteer_status" DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	CONSTRAINT "volunteers_email_unique" UNIQUE("email")
);
