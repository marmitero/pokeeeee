CREATE TABLE "boss_fights" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"arena_map_id" integer NOT NULL,
	"week_id" text NOT NULL,
	"day" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"stone_claimed" boolean DEFAULT false NOT NULL,
	"legendary_granted" boolean DEFAULT false NOT NULL,
	"boss_pokedex_id" integer NOT NULL,
	"boss_level" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "boss_fights_arena_check" CHECK ("boss_fights"."arena_map_id" IN (20, 40)),
	CONSTRAINT "boss_fights_status_check" CHECK ("boss_fights"."status" IN ('ACTIVE', 'WON', 'LOST')),
	CONSTRAINT "boss_fights_level_check" CHECK ("boss_fights"."boss_level" BETWEEN 80 AND 100)
);
--> statement-breakpoint
ALTER TABLE "battles" DROP CONSTRAINT "battles_kind_check";--> statement-breakpoint
ALTER TABLE "boss_fights" ADD CONSTRAINT "boss_fights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boss_fights_user_arena_week_idx" ON "boss_fights" USING btree ("user_id","arena_map_id","week_id");--> statement-breakpoint
CREATE INDEX "boss_fights_user_arena_day_idx" ON "boss_fights" USING btree ("user_id","arena_map_id","day");--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_kind_check" CHECK ("battles"."kind" IN ('wild', 'gym', 'boss'));