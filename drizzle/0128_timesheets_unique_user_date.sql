-- Remove duplicate timesheet rows per (org_id, user_id, date), keeping highest id
DELETE FROM timesheets
WHERE id NOT IN (
  SELECT DISTINCT ON (org_id, user_id, date) id
  FROM timesheets
  ORDER BY org_id, user_id, date, id DESC
);

-- Enforce uniqueness going forward
ALTER TABLE timesheets
  ADD CONSTRAINT timesheets_org_user_date_unique UNIQUE (org_id, user_id, date);
