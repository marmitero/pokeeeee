CREATE TABLE "pvp_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenger_id" integer NOT NULL,
	"target_id" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"battle_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"cooldown_until" timestamp,
	CONSTRAINT "pvp_challenges_status_check" CHECK ("pvp_challenges"."status" IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED')),
	CONSTRAINT "pvp_challenges_players_distinct" CHECK ("pvp_challenges"."challenger_id" <> "pvp_challenges"."target_id")
);
--> statement-breakpoint
ALTER TABLE "pvp_challenges" ADD CONSTRAINT "pvp_challenges_challenger_id_users_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_challenges" ADD CONSTRAINT "pvp_challenges_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_challenges" ADD CONSTRAINT "pvp_challenges_battle_id_pvp_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."pvp_battles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pvp_challenges_target_status_idx" ON "pvp_challenges" USING btree ("target_id","status");--> statement-breakpoint
CREATE INDEX "pvp_challenges_challenger_status_idx" ON "pvp_challenges" USING btree ("challenger_id","status");--> statement-breakpoint
CREATE INDEX "pvp_challenges_pair_created_idx" ON "pvp_challenges" USING btree ("challenger_id","target_id","created_at");