ALTER TABLE "kids_editions" ADD COLUMN "situacao" varchar(12) DEFAULT 'aberto' NOT NULL;--> statement-breakpoint
UPDATE "kids_editions" SET "situacao" = 'encerrado' WHERE "open" = false;
