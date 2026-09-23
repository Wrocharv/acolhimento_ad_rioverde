CREATE TYPE "public"."admin_role" AS ENUM('total', 'kids');--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "role" "admin_role" DEFAULT 'total' NOT NULL;