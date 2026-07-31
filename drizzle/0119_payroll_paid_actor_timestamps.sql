ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "paid_by" text REFERENCES "users"("id");
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "paid_at" timestamp;
