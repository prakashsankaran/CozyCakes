ALTER TABLE "discount_codes" ADD COLUMN "starts_on" date;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "discount_codes" DROP COLUMN "starts_at";--> statement-breakpoint
ALTER TABLE "discount_codes" DROP COLUMN "ends_at";