-- MIYO-0001: read-only check of migration state on production.
-- Run BEFORE and AFTER `pnpm db:apply-pending`:
--   psql "$DATABASE_URL" -f scripts/prod-checks/miyo-0001-verify.sql
-- Every row should read `t` after the apply. Rows from migrations that are
-- NOT in apply-pending-migrations.ts (0126-0129, 0133-0144, 0148, 0149) must
-- already be `t`; if one is `f`, report it before running anything else.

SELECT m, ok FROM (VALUES
  -- covered by db:apply-pending
  ('0153 idx_org_members_org', to_regclass('public.idx_org_members_org') IS NOT NULL),
  ('0154 projects.deleted_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'deleted_at')),
  ('0154 tickets.version', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'version')),
  ('0154 tickets.rank', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'rank')),
  ('0154 tickets.deleted_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'deleted_at')),
  ('0154 ticket_activity', to_regclass('public.ticket_activity') IS NOT NULL),
  ('0154 ticket_comment_mentions', to_regclass('public.ticket_comment_mentions') IS NOT NULL),
  ('0154 ticket_comment_reactions', to_regclass('public.ticket_comment_reactions') IS NOT NULL),
  ('0155 invitations.project_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invitations' AND column_name = 'project_id')),
  ('0156 project_client_grants', to_regclass('public.project_client_grants') IS NOT NULL),
  -- NOT covered by db:apply-pending: must already exist
  ('0126 interview_questions.sample_answer', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interview_questions' AND column_name = 'sample_answer')),
  ('0127 one_on_one_meetings.scheduled_at timestamptz', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'one_on_one_meetings' AND column_name = 'scheduled_at' AND data_type = 'timestamp with time zone')),
  -- 0194 replaced 0128's timesheets_org_user_date_unique with per-ticket indexes.
  ('0194 uq_timesheets_org_user_date_ticket', to_regclass('public.uq_timesheets_org_user_date_ticket') IS NOT NULL),
  ('0133 assets.brand', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'brand')),
  ('0134 employee_career_profiles', to_regclass('public.employee_career_profiles') IS NOT NULL),
  ('0138 asset_assignment_history', to_regclass('public.asset_assignment_history') IS NOT NULL),
  ('0139 pip_documents', to_regclass('public.pip_documents') IS NOT NULL),
  ('0142 hiring_flow_templates', to_regclass('public.hiring_flow_templates') IS NOT NULL),
  ('0143 candidate_offers.acceptance_token', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidate_offers' AND column_name = 'acceptance_token')),
  ('0144 appraisals.calibrated_rating', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appraisals' AND column_name = 'calibrated_rating')),
  ('0149 ticket_comments.images', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_comments' AND column_name = 'images'))
) AS t(m, ok);
