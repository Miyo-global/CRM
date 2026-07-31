CREATE TABLE IF NOT EXISTS "hr_offer_letter_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "name" text NOT NULL,
  "body" text NOT NULL,
  "description" text,
  "is_default" boolean DEFAULT false NOT NULL,
  "variables" text[],
  "created_by" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_offer_letter_templates_org" ON "hr_offer_letter_templates" ("org_id");
