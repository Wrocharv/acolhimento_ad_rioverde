CREATE TABLE IF NOT EXISTS "congregations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "congregations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "service" varchar(120);
--> statement-breakpoint
INSERT INTO "congregations" ("name", "sort_order") VALUES ('Sede', 0) ON CONFLICT ("name") DO NOTHING;