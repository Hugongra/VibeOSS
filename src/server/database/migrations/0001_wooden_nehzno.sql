CREATE TABLE "vibe_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"module_id" uuid,
	"title" varchar(500) NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vibe_chats" ADD CONSTRAINT "vibe_chats_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_chats" ADD CONSTRAINT "vibe_chats_module_id_vibe_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."vibe_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vibe_chats_org" ON "vibe_chats" USING btree ("org_id");