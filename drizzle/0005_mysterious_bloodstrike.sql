ALTER TABLE "game_maps" ADD COLUMN "encounter_grid" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "game_maps" ADD COLUMN "collision_grid" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "game_maps" ADD COLUMN "encounter_rate" integer DEFAULT 22 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_maps" ADD CONSTRAINT "game_maps_encounter_rate_check" CHECK ("game_maps"."encounter_rate" BETWEEN 0 AND 100);