CREATE TABLE IF NOT EXISTS "asset_assignment_history" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id"),
  "asset_id" integer NOT NULL REFERENCES "assets"("id"),
  "from_user_id" text REFERENCES "users"("id"),
  "to_user_id" text REFERENCES "users"("id"),
  "reason" text,
  "assigned_by" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_asset_assignment_history_asset"
  ON "asset_assignment_history" ("asset_id");
