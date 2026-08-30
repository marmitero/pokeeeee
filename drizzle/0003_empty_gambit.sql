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