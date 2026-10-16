-- MIYO-0016 (optional, Tarun decides): salary structures created before 0157
-- store sunday/holiday OT multiplier 2.00, which still pays OT at 2x.
-- 1) See which active structures are affected:
SELECT s.id, s.org_id, s.user_id, s.sunday_ot_multiplier, s.holiday_ot_multiplier
FROM salary_structures s
WHERE s.is_active AND (s.sunday_ot_multiplier = 2.00 OR s.holiday_ot_multiplier = 2.00);
-- 2) Only if Tarun approves, switch them to 1x (run inside a transaction):
-- BEGIN;
-- UPDATE salary_structures SET sunday_ot_multiplier = 1.00 WHERE sunday_ot_multiplier = 2.00;
-- UPDATE salary_structures SET holiday_ot_multiplier = 1.00 WHERE holiday_ot_multiplier = 2.00;
-- COMMIT;
