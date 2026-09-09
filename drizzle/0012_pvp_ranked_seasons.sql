CREATE TABLE "pvp_seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"elo_final" integer NOT NULL,
	"rank" integer NOT NULL,
	"reward_claimed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pvp_seasons_rank_check" CHECK ("pvp_seasons"."rank" >= 1),
	CONSTRAINT "pvp_seasons_elo_check" CHECK ("pvp_seasons"."elo_final" >= 0)
);
--> statement-breakpoint
ALTER TABLE "pvp_seasons" ADD CONSTRAINT "pvp_seasons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pvp_seasons_week_user_unique" ON "pvp_seasons" USING btree ("week_id","user_id");--> statement-breakpoint
CREATE INDEX "pvp_seasons_week_rank_idx" ON "pvp_seasons" USING btree ("week_id","rank");