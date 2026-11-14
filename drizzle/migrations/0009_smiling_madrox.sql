ALTER TYPE "public"."kids_signup_status" ADD VALUE 'pendente';--> statement-breakpoint
ALTER TYPE "public"."kids_signup_status" ADD VALUE 'recusado';--> statement-breakpoint
ALTER TABLE "kids_signups" ADD COLUMN "second_team_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kids_signups" ADD CONSTRAINT "kids_signups_second_team_id_kids_teams_id_fk" FOREIGN KEY ("second_team_id") REFERENCES "public"."kids_teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
