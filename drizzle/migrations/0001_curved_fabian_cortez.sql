CREATE TYPE "public"."sex" AS ENUM('masculino', 'feminino');--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "sex" "sex";--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "address" varchar(255);--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "accepts_visit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "preferred_visit_day" varchar(120);--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "preferred_visit_time" varchar(120);