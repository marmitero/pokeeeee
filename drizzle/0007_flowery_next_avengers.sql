ALTER TABLE "users" DROP CONSTRAINT "users_inventory_nonnegative";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "fire_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "water_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "thunder_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "leaf_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "moon_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sun_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shiny_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "metal_coat" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kings_rock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dragon_scale" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "upgrade" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dusk_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dawn_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oval_stone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_inventory_nonnegative" CHECK ("users"."pokeballs" >= 0 AND "users"."greatballs" >= 0 AND "users"."ultraballs" >= 0 AND "users"."masterballs" >= 0 AND "users"."potions" >= 0 AND "users"."super_potions" >= 0 AND "users"."max_potions" >= 0 AND "users"."revives" >= 0 AND "users"."fire_stone" >= 0 AND "users"."water_stone" >= 0 AND "users"."thunder_stone" >= 0 AND "users"."leaf_stone" >= 0 AND "users"."moon_stone" >= 0 AND "users"."sun_stone" >= 0 AND "users"."shiny_stone" >= 0 AND "users"."metal_coat" >= 0 AND "users"."kings_rock" >= 0 AND "users"."dragon_scale" >= 0 AND "users"."upgrade" >= 0 AND "users"."dusk_stone" >= 0 AND "users"."dawn_stone" >= 0 AND "users"."oval_stone" >= 0);