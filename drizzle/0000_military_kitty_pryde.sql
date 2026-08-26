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
