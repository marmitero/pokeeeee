ALTER TABLE "pvp_battles" ADD COLUMN "mode" text DEFAULT 'friendly' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "elo" integer DEFAULT 1000 NOT NULL;