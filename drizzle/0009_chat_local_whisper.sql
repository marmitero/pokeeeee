ALTER TABLE "chat_messages" ADD COLUMN "map_id" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "recipient_id" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_map_id_idx" ON "chat_messages" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "chat_messages_recipient_id_idx" ON "chat_messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "chat_messages_channel_map_idx" ON "chat_messages" USING btree ("channel","map_id");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channel_check" CHECK ("chat_messages"."channel" IN ('global','local','whisper','arena-global'));