-- ============================================================
-- FIX EXISTING USERS — Run on Neon SQL Editor
-- Fixes 3 issues for employees onboarded before these patches:
--   1. email_verified = NULL → blocks login
--   2. has_dashboard_access = false → blocks dashboard
--   3. email not lowercase → auth mismatch (NextAuth normalizes)
-- ============================================================

-- 1. Fix emailVerified for users who have a password (onboarded employees)
UPDATE users
SET email_verified = NOW()
WHERE email_verified IS NULL
  AND password IS NOT NULL
  AND is_active = true;

-- 2. Fix hasDashboardAccess for all active employees
UPDATE users
SET has_dashboard_access = true
WHERE has_dashboard_access = false
  AND password IS NOT NULL
  AND is_active = true;

-- 3. Normalize emails to lowercase (prevents auth mismatch)
UPDATE users
SET email = LOWER(TRIM(email))
WHERE email != LOWER(TRIM(email));

-- ============================================================
-- VERIFY — Run these to confirm fixes worked
-- ============================================================

-- Should return 0 rows (no stuck users left)
SELECT id, name, email, email_verified, has_dashboard_access, is_active
FROM users
WHERE password IS NOT NULL
  AND is_active = true
  AND (email_verified IS NULL OR has_dashboard_access = false);

-- Check for any remaining mixed-case emails
SELECT id, email
FROM users
WHERE email != LOWER(TRIM(email));
