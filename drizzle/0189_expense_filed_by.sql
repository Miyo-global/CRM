-- R2-CRUD-06: who filed a claim made on an employee's behalf, so the filer
-- cannot also approve it. Null for a claim the employee filed themselves.
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "filed_by" text REFERENCES "users"("id") ON DELETE SET NULL;
