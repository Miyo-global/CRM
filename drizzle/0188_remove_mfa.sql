-- V5-R01: two-factor authentication removed. Supersedes 0017_add_totp_mfa and
-- the MFA parts of 0027_auth_security_hardening / 0100_sync_all_missing_columns.
DROP TABLE IF EXISTS "mfa_backup_codes";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "totp_secret";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "totp_enabled";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "mfa_enforced";
