-- Catchbound production bootstrap — execute apenas no projeto novo e vazio.
-- Gerado das migrations Drizzle 0000–0004. Transação integral.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('users','sessions','user_pokemon','game_maps',
        'shop_items','gym_leaders','user_badges','pvp_battles','battles',
        'rate_limits','chat_messages')
  ) THEN
    RAISE EXCEPTION 'Bootstrap recusado: já existem tabelas do Catchbound em public';
  END IF;
END $$;

-- 0000_military_kitty_pryde.sql | sha256 f9c17bcfd691716a98b2581cd77c5eac457579e5a56376a7ad8589beea080c75
CREATE TABLE "battles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"map_id" integer,
	"gym_leader_id" integer,
	"active_pokemon_id" integer,
	"opponent_index" integer DEFAULT 0 NOT NULL,
	"state" jsonb NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"username" text NOT NULL,
	"message" text NOT NULL,
	"channel" text DEFAULT 'global' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_maps" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"width" integer DEFAULT 16 NOT NULL,
	"height" integer DEFAULT 16 NOT NULL,
	"tile_grid" jsonb NOT NULL,
	"encounter_table" jsonb NOT NULL,
	"portals" jsonb NOT NULL,
	"npcs" jsonb DEFAULT '[]' NOT NULL,
	"creator_username" text DEFAULT 'GameMaster' NOT NULL,
	"creator_id" integer,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "game_maps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gym_leaders" (
	"id" serial PRIMARY KEY NOT NULL,
	"map_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"badge_name" text NOT NULL,
	"badge_emoji" text DEFAULT '🏅' NOT NULL,
	"specialty" text NOT NULL,
	"required_badges" integer DEFAULT 0 NOT NULL,
	"reward_money" integer DEFAULT 1500 NOT NULL,
	"team" jsonb NOT NULL,
	"npc_dialog" text NOT NULL,
	"defeat_dialog" text NOT NULL,
	"win_dialog" text NOT NULL,
	"shop_id" integer
);
--> statement-breakpoint
CREATE TABLE "pvp_battles" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_code" text NOT NULL,
	"player1_id" integer NOT NULL,
	"player1_username" text NOT NULL,
	"player2_id" integer,
	"player2_username" text,
	"status" text DEFAULT 'WAITING' NOT NULL,
	"current_turn_player_id" integer,
	"battle_state" jsonb NOT NULL,
	"winner_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pvp_battles_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"item_key" text NOT NULL,
	"buy_price" integer NOT NULL,
	"sell_price" integer NOT NULL,
	"icon_emoji" text DEFAULT '📦' NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"stock" integer DEFAULT 99 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"gym_leader_id" integer NOT NULL,
	"badge_name" text NOT NULL,
	"badge_emoji" text NOT NULL,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_pokemon" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"pokedex_id" integer NOT NULL,
	"nickname" text,
	"name" text NOT NULL,
	"variant" text DEFAULT 'Normal' NOT NULL,
	"is_premium_skin" boolean DEFAULT false NOT NULL,
	"level" integer DEFAULT 5 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"xp_to_next_level" integer DEFAULT 100 NOT NULL,
	"hp" integer DEFAULT 24 NOT NULL,
	"max_hp" integer DEFAULT 24 NOT NULL,
	"attack" integer DEFAULT 14 NOT NULL,
	"defense" integer DEFAULT 12 NOT NULL,
	"sp_attack" integer DEFAULT 15 NOT NULL,
	"sp_defense" integer DEFAULT 13 NOT NULL,
	"speed" integer DEFAULT 14 NOT NULL,
	"move1" text NOT NULL,
	"move2" text NOT NULL,
	"move3" text NOT NULL,
	"move4" text NOT NULL,
	"party_slot" integer,
	"is_starter" boolean DEFAULT false NOT NULL,
	"caught_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_sprite" text DEFAULT 'red' NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"money" integer DEFAULT 3000 NOT NULL,
	"pokeballs" integer DEFAULT 10 NOT NULL,
	"greatballs" integer DEFAULT 5 NOT NULL,
	"ultraballs" integer DEFAULT 2 NOT NULL,
	"masterballs" integer DEFAULT 0 NOT NULL,
	"potions" integer DEFAULT 3 NOT NULL,
	"super_potions" integer DEFAULT 1 NOT NULL,
	"max_potions" integer DEFAULT 0 NOT NULL,
	"revives" integer DEFAULT 1 NOT NULL,
	"current_map_id" integer DEFAULT 1 NOT NULL,
	"player_x" integer DEFAULT 8 NOT NULL,
	"player_y" integer DEFAULT 12 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"premium_skins" jsonb DEFAULT '[]' NOT NULL,
	"last_online_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

-- 0001_useful_vin_gonzales.sql | sha256 9c6b89334dfb4b0a46835ef16f50a129842c45e8278f3f63c9592996b12ee683
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"reset_at" timestamp NOT NULL
);

-- 0002_long_squadron_sinister.sql | sha256 73220ce5753196cdc206f5dc31159588997a9c4dcbf23a7eb5ee99ee4c698539
ALTER TABLE "pvp_battles" ADD COLUMN "mode" text DEFAULT 'friendly' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "elo" integer DEFAULT 1000 NOT NULL;

-- 0003_empty_gambit.sql | sha256 ca83039e23329d05acc09f881222623c420750c7d019e157e03668f863dd4654
ALTER TABLE "battles" ADD CONSTRAINT "battles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_map_id_game_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."game_maps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_gym_leader_id_gym_leaders_id_fk" FOREIGN KEY ("gym_leader_id") REFERENCES "public"."gym_leaders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_active_pokemon_id_user_pokemon_id_fk" FOREIGN KEY ("active_pokemon_id") REFERENCES "public"."user_pokemon"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_maps" ADD CONSTRAINT "game_maps_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_leaders" ADD CONSTRAINT "gym_leaders_map_id_game_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."game_maps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_player1_id_users_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_player2_id_users_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_current_turn_player_id_users_id_fk" FOREIGN KEY ("current_turn_player_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_gym_leader_id_gym_leaders_id_fk" FOREIGN KEY ("gym_leader_id") REFERENCES "public"."gym_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pokemon" ADD CONSTRAINT "user_pokemon_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battles_user_status_idx" ON "battles" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "chat_messages_channel_created_idx" ON "chat_messages" USING btree ("channel","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_user_id_idx" ON "chat_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_maps_published_idx" ON "game_maps" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "gym_leaders_map_id_idx" ON "gym_leaders" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "pvp_battles_player1_idx" ON "pvp_battles" USING btree ("player1_id");--> statement-breakpoint
CREATE INDEX "pvp_battles_player2_idx" ON "pvp_battles" USING btree ("player2_id");--> statement-breakpoint
CREATE INDEX "pvp_battles_status_idx" ON "pvp_battles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rate_limits_reset_at_idx" ON "rate_limits" USING btree ("reset_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "shop_items_shop_id_idx" ON "shop_items" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_gym_unique" ON "user_badges" USING btree ("user_id","gym_leader_id");--> statement-breakpoint
CREATE INDEX "user_badges_user_id_idx" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_pokemon_user_id_idx" ON "user_pokemon" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_pokemon_party_slot_unique" ON "user_pokemon" USING btree ("user_id","party_slot") WHERE "user_pokemon"."party_slot" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_kind_check" CHECK ("battles"."kind" IN ('wild', 'gym'));--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_status_check" CHECK ("battles"."status" IN ('ACTIVE', 'WON', 'LOST', 'FLED', 'CAUGHT'));--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_opponent_index_check" CHECK ("battles"."opponent_index" >= 0);--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_length_check" CHECK (char_length("chat_messages"."message") BETWEEN 1 AND 500);--> statement-breakpoint
ALTER TABLE "game_maps" ADD CONSTRAINT "game_maps_dimensions_check" CHECK ("game_maps"."width" BETWEEN 1 AND 64 AND "game_maps"."height" BETWEEN 1 AND 64);--> statement-breakpoint
ALTER TABLE "gym_leaders" ADD CONSTRAINT "gym_leaders_rewards_check" CHECK ("gym_leaders"."required_badges" >= 0 AND "gym_leaders"."reward_money" >= 0);--> statement-breakpoint
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_mode_check" CHECK ("pvp_battles"."mode" IN ('friendly', 'ranked'));--> statement-breakpoint
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_status_check" CHECK ("pvp_battles"."status" IN ('WAITING', 'ACTIVE', 'FINISHED'));--> statement-breakpoint
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_players_distinct" CHECK ("pvp_battles"."player2_id" IS NULL OR "pvp_battles"."player1_id" <> "pvp_battles"."player2_id");--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_count_check" CHECK ("rate_limits"."count" >= 0);--> statement-breakpoint
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_category_check" CHECK ("shop_items"."category" IN ('ball', 'potion', 'misc'));--> statement-breakpoint
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_prices_stock_check" CHECK ("shop_items"."buy_price" >= 0 AND "shop_items"."sell_price" >= 0 AND "shop_items"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "user_pokemon" ADD CONSTRAINT "user_pokemon_variant_check" CHECK ("user_pokemon"."variant" IN ('Normal', 'Shiny', 'Metallic', 'Mystic', 'Dark', 'Ghostly'));--> statement-breakpoint
ALTER TABLE "user_pokemon" ADD CONSTRAINT "user_pokemon_level_check" CHECK ("user_pokemon"."level" BETWEEN 1 AND 100);--> statement-breakpoint
ALTER TABLE "user_pokemon" ADD CONSTRAINT "user_pokemon_xp_check" CHECK ("user_pokemon"."xp" >= 0 AND "user_pokemon"."xp_to_next_level" > 0);--> statement-breakpoint
ALTER TABLE "user_pokemon" ADD CONSTRAINT "user_pokemon_hp_check" CHECK ("user_pokemon"."max_hp" > 0 AND "user_pokemon"."hp" BETWEEN 0 AND "user_pokemon"."max_hp");--> statement-breakpoint
ALTER TABLE "user_pokemon" ADD CONSTRAINT "user_pokemon_stats_check" CHECK ("user_pokemon"."attack" > 0 AND "user_pokemon"."defense" > 0 AND "user_pokemon"."sp_attack" > 0 AND "user_pokemon"."sp_defense" > 0 AND "user_pokemon"."speed" > 0);--> statement-breakpoint
ALTER TABLE "user_pokemon" ADD CONSTRAINT "user_pokemon_party_slot_check" CHECK ("user_pokemon"."party_slot" IS NULL OR "user_pokemon"."party_slot" BETWEEN 1 AND 6);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('player', 'moderator', 'admin'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_money_nonnegative" CHECK ("users"."money" >= 0);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_inventory_nonnegative" CHECK ("users"."pokeballs" >= 0 AND "users"."greatballs" >= 0 AND "users"."ultraballs" >= 0 AND "users"."masterballs" >= 0 AND "users"."potions" >= 0 AND "users"."super_potions" >= 0 AND "users"."max_potions" >= 0 AND "users"."revives" >= 0);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_progress_nonnegative" CHECK ("users"."wins" >= 0 AND "users"."losses" >= 0 AND "users"."elo" >= 0);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_position_check" CHECK ("users"."player_x" BETWEEN 0 AND 63 AND "users"."player_y" BETWEEN 0 AND 63);

-- 0004_lowly_valkyrie.sql | sha256 680bc51e0a8953f62e531a572d01c344a1f150df5ab8f1222780c9f3c080e009
ALTER TABLE "pvp_battles" DROP CONSTRAINT "pvp_battles_status_check";--> statement-breakpoint
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_status_check" CHECK ("pvp_battles"."status" IN ('WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED'));

-- Data API fechada por padrão; o papel de runtime terá policies próprias.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pokemon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
);
INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES ('f9c17bcfd691716a98b2581cd77c5eac457579e5a56376a7ad8589beea080c75',1787754262798);
INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES ('9c6b89334dfb4b0a46835ef16f50a129842c45e8278f3f63c9592996b12ee683',1787755002023);
INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES ('73220ce5753196cdc206f5dc31159588997a9c4dcbf23a7eb5ee99ee4c698539',1787790732368);
INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES ('ca83039e23329d05acc09f881222623c420750c7d019e157e03668f863dd4654',1787997585731);
INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES ('680bc51e0a8953f62e531a572d01c344a1f150df5ab8f1222780c9f3c080e009',1788017993127);

COMMIT;

SELECT
 (SELECT count(*) FROM information_schema.tables WHERE table_schema='public'
   AND table_name IN ('users','sessions','user_pokemon','game_maps','shop_items',
   'gym_leaders','user_badges','pvp_battles','battles','rate_limits','chat_messages')) AS game_tables,
 (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations,
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relrowsecurity) AS rls_tables;
