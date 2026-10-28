-- P2-no-outbound-email-delivery-audit: one row per outbound email, written by
-- lib/email/sender.ts (queued -> sent | failed) and by the ZeptoMail bounce
-- webhook (-> bounced). org_id is NULL when the sender could not tell which
-- workspace the mail belongs to (e.g. a recipient with no account).
CREATE TABLE IF NOT EXISTS "email_deliveries" (
  "id" serial PRIMARY KEY,
  "org_id" text REFERENCES "organizations"("id") ON DELETE CASCADE,
  "to_address" text NOT NULL,
  "subject" text NOT NULL,
  "template_key" text,
  "status" text NOT NULL DEFAULT 'queued',
  "provider_message_id" text,
  "error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_deliveries_status_check') THEN
    ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_status_check"
      CHECK ("status" IN ('queued', 'sent', 'failed', 'bounced'));
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_deliveries_org_created" ON "email_deliveries" ("org_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_deliveries_provider_msg" ON "email_deliveries" ("provider_message_id");
