-- Drop old turma column and add proper fields
ALTER TABLE "dc_users" DROP COLUMN IF EXISTS "turma";--> statement-breakpoint
ALTER TABLE "dc_users" ADD COLUMN IF NOT EXISTS "curso" text;--> statement-breakpoint
ALTER TABLE "dc_users" ADD COLUMN IF NOT EXISTS "ano_ingresso" integer;--> statement-breakpoint
ALTER TABLE "dc_users" ADD COLUMN IF NOT EXISTS "semestre" integer;--> statement-breakpoint
ALTER TABLE "dc_users" ADD COLUMN IF NOT EXISTS "sala" text;
