-- R4 lifecycle-integrity: one user per Employee ID. The hire wizard and the
-- invite path already check under an advisory lock (lockEmployeeIdAllocation);
-- this makes the database the final word. Blank and NULL IDs stay allowed
-- (CEO accounts and legacy rows have none). Prod had 0 duplicates when checked.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_employee_id"
  ON "users" ("employee_id")
  WHERE "employee_id" IS NOT NULL AND "employee_id" <> '';
