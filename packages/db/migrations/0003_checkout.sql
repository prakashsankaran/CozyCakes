CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 24001 CACHE 1;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "slot_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "capacity_holds_date_idx" ON "capacity_holds" USING btree ("date");--> statement-breakpoint
CREATE INDEX "orders_date_idx" ON "orders" USING btree ("date");