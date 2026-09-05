-- Drops three tables with no reference anywhere in application code.
-- Verified before writing: zero inbound foreign keys, and row counts of
-- 0 / 0 / 4 respectively. The four employee_devices rows were exported with
-- their DDL beforehand.
--
-- Deliberately no CASCADE: if something does still depend on these, the
-- migration must fail loudly rather than quietly widening the blast radius.
DROP TABLE IF EXISTS "module_links";
--> statement-breakpoint
DROP TABLE IF EXISTS "crm_views";
--> statement-breakpoint
DROP TABLE IF EXISTS "employee_devices";
--> statement-breakpoint
-- device_status was used only by employee_devices.
DROP TYPE IF EXISTS "device_status";
