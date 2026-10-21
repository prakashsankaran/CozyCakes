ALTER TYPE "public"."order_status" ADD VALUE 'awaiting_payment' BEFORE 'confirmed';--> statement-breakpoint
ALTER TABLE "bakery_settings" ADD COLUMN "upi_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bakery_settings" ADD COLUMN "upi_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "claimed_at" timestamp with time zone;