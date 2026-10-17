# ATS: what we keep from the removed Recruitment module

Recruitment was removed in `3cbeb49` (15 Oct 2026). The tables and most of the
code stayed behind. This file records what the ATS build reuses, what it
drops, and what Tarun has to check on production before anything is deleted.

Nothing here deletes data. A drop happens only after the row counts below are
read on production and Tarun says go.

## Tables (MIYO-0626)

| Table | Decision | Why |
|---|---|---|
| `job_postings` | reuse | Gains slug, publishedAt, closesAt, seoTitle, seoDescription, requisitionId, salaryVisible. `applicationFields` is read once to seed `ats_application_questions`, then left alone. |
| `candidates` | reuse | Gains a tsvector `search` column, `phoneNormalized`, an index on `linkedinUrl`. `duplicateOfId` stays. `aiScore*` and `bgv*` are ignored for v1, not dropped. |
| `candidate_applications` | reuse | Gains `stageId`, `rating`, `rejectedReasonId`, `source`. New logic reads the stage, not the `application_status` enum. |
| `candidate_sources` | reuse | The source list: Careers, LinkedIn, Referral, Agency, Manual. |
| `candidate_documents` | reuse | Candidate attachments. |
| `interviews` | reuse | Gains `icsUid`, `icsSequence`, `meetingUrl`, `timezone`. |
| `scorecard_templates`, `interview_scorecards` | reuse | Criteria JSON, 1–5 plus a recommendation. |
| `candidate_offers` | reuse | Gains `tokenHash`, `expiresAt`, `respondedAt`, `declineReason`, `approvalStatus`. |
| `hr_offer_letter_templates`, `hr_offer_letter_custom_variables` | reuse | `/hr/offer-letter-templates` stays as it is. |
| `job_roles` | reuse | The designation picker. The four QA test roles go with MIYO-0621. |
| `interview_booking_links` | reuse later | Self-scheduling is a later phase (MIYO-0660). |
| `candidate_referrals` | reuse later | Referral programme. |
| `background_verifications` | reuse later | Not in v1. |
| `hiring_flow_templates`, `hiring_flow_rounds` | drop | Replaced by `ats_stages`. |
| `candidate_documents_vault` | drop | Merges into `candidate_documents`. |
| `interview_slas`, `candidate_sla_tracking` | drop | Time in stage is derived from `ats_activity`. |
| `interview_questions` | drop | Questions belong to a scorecard template. |
| `candidate_reference_checks` | drop | Not in v1. |

Enums: `job_posting_status`, `interview_type` and `interview_result` stay in
use. `candidate_status` and `application_status` are left in place — a
Postgres enum value cannot be dropped cleanly — but no new code reads them.

### Row counts to read on production before any drop

Tarun runs this; the agent never connects to the production database.

```sql
SELECT 'hiring_flow_templates' AS table_name, count(*) FROM hiring_flow_templates
UNION ALL SELECT 'hiring_flow_rounds', count(*) FROM hiring_flow_rounds
UNION ALL SELECT 'candidate_documents_vault', count(*) FROM candidate_documents_vault
UNION ALL SELECT 'interview_slas', count(*) FROM interview_slas
UNION ALL SELECT 'candidate_sla_tracking', count(*) FROM candidate_sla_tracking
UNION ALL SELECT 'interview_questions', count(*) FROM interview_questions
UNION ALL SELECT 'candidate_reference_checks', count(*) FROM candidate_reference_checks
ORDER BY table_name;
```

A table that comes back `0` can be dropped in the ATS migration. Anything
with rows is exported first and dropped in a separate, explicitly approved
migration — the same rule as MIYO-0310.

## Code (MIYO-0627)

| Path | Decision |
|---|---|
| `lib/files/extract-resume-text.ts`, `lib/files/resume-file-validation.ts` | reuse |
| `lib/constants/candidate-offers.ts`, `lib/constants/interview-format.ts` | reuse |
| `lib/hr/render-offer-letter-for-offer.ts`, `lib/hr/offer-letter-branded-pdf.tsx` | reuse |
| `lib/hr/job-opening-form-state.ts`, `lib/hr/application-field-config.ts` | reuse, adapted to the new question model |
| `lib/data/india-locations.ts`, `lib/data/country-states.ts` | reuse for the location picker |
| `lib/email-templates/hr-recruitment.ts` and the recruitment parts of `lib/email-templates/hr.ts` | drop — replaced by the `email-templates/ats-*` files |
| `lib/integrations/job-boards.ts` | drop for now; job-board syndication is a later phase |

## Open decisions for Tarun

- Whether the RECRUITER role is a system role on `users.role` (MIYO-0628) or
  only a per-job membership. The build assumes both: a system role for people
  whose job this is, and `ats_job_members` for everyone else on a hiring team.
- Whether the careers site lives at `/careers` on the app domain or on the
  marketing site with a link across.
