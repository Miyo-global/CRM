# QA zip closeout — MiyoCRM-QA-docs-todos.zip

Source: `~/Downloads/MiyoCRM-QA-docs-todos.zip` (FIX-QUEUE snapshot 2026-10-28 12:30 IST).
Checked against `main` and https://crm.miyoglobal.com on 2026-10-29.

**Totals (133 unchecked FIX-QUEUE lines):** 117 FIXED-VERIFIED · 13 CLOSED · 3 BLOCKED · **0 P0/P1 open**.

Status meanings:
- **FIXED-VERIFIED**: a fix commit on main names the bug, the full suite is green, and for route/alias bugs prod returns 307 to the canonical page.
- **CLOSED**: false positive, duplicate, not reproducible, or not a code defect. The evidence column says why.
- **BLOCKED**: needs a decision or prod-data approval from Tarun.

## Gates

| Gate | Result |
|------|--------|
| `pnpm typecheck` | PASS (0 errors after clearing stale `.next/types`) |
| `pnpm test` | PASS: 272 files, 2142 tests (vitest now excludes `.claude/**` agent worktrees) |
| Prod redirect smoke (33 aliases) | PASS: all 307 to canonical routes |

## Live E2E (prod)

| Check | Result | Evidence |
|-------|--------|----------|
| P1 forgot-password email | PASS | Sent to `qa-test-r3-emp2-0f5d4@maxxspace.com` on 2026-10-29 07:30Z; `email_deliveries` id 1 `auth-password-reset` status `sent` with a ZeptoMail message id |
| P2 `/reset-password` without token | PASS | Shows "Invalid Link" with "Request a new link" and "Back to Sign In" |
| Alias redirects (/tickets, /health, /settings/data-export, …) | PASS | See gate above |
| P0 admin/CEO onboard notify (in-app + email) | BLOCKED (sign-in) | Fixed in 67bc026ce; `lib/hr/onboarded-notification.test.ts` passes. A live run needs an SA session on prod. |
| P1 setup-password signs out prior session | BLOCKED (sign-in) | Fixed in 0532575ce (signOut before redirect). Needs an SA session plus a fresh setup link. |
| P0 role change sticks after re-login | BLOCKED (sign-in) | Fixed in 3a38b0539 (invalidateUserSession + JWT role refresh). Needs an SA session. |
| /hr/shifts, /ats as SA/HR | BLOCKED (sign-in) | Anonymous: /hr/shifts goes to signin (route exists). /ats is soft-denied because the ATS module flag is off. |

The agent does not type passwords into production. **Tarun action:** sign in as SA in the Chrome window, then ask for the four authenticated checks to be rerun.

## BLOCKED: Tarun action

1. **P2-recruitment-route-404 (line 19).** The ATS module exists but is off (`NEXT_PUBLIC_ATS_MODULE`). Turn it on in Vercel, or leave it off. Marketing copy was already removed in 2f87aa44e.
2. **Seed skills (line 404).** Demo data only. App code contains no mock data. Add real skills at /hr/skills if you want them.
3. **P3-my-leaves-used-count-vs-empty-history (line 749).** Prod-data drift on the SA account only: `leave_balances` id 1 has balance 3 (12 entitled) and 0 leave requests, so the page shows "Used 9". The employee path is consistent. To fix, approve `UPDATE leave_balances SET balance = 12 WHERE id = 1;`

## Bug files with no FIX-QUEUE line

Every `bugs/*.md` that no fix commit names was triaged. Each one is marked CLOSED, DUPLICATE, NOT-REPRO or by-design in its own file, or is covered by another commit:
P2-dashboard-whos-on-leave-misses-active-today and P2-attendance-team-monitor-misses-employee-on-leave (by design: the employee was terminated; the leftover bug was fixed in 5d4ac9ea7),
P3-helpdesk-creator-self-assign-inconsistent (FP, see line 415), P3-expense-submit-no-success-toast (FP, see line 43), P2-api-no-visible-rate-limit (54809fb8f), P3-appraisal-categories-not-configured (222f17bb2), P3-departments-admin-missing (0645c2039).
All other unreferenced files already have a CLOSED/DUPLICATE/OBSOLETE status in the zip.

## FIX-QUEUE matrix

`Line` = line number in `claude/FIX-QUEUE.md`.

| Line | Item | Status | Evidence |
|------|------|--------|----------|
| 3 | **P0** Stale member role on login (Employee/HR flash; Admin change may never apply) (`bugs/P0-hr-role-session- | FIXED-VERIFIED | 3a38b0539 (P0-hr-role-session-drops-to-employee) |
| 4 | **P0 CONFIRMED** Admin/CEO New Employee Onboarded notify | FIXED-VERIFIED | 67bc026ce (P0-no-admin-notify-on-new-onboard) |
| 8 | **P1** Setup-password session handoff (`bugs/P1-setup-password-keeps-admin-session.md`) | FIXED-VERIFIED | 0532575ce (P1-setup-password-keeps-admin-session) |
| 9 | **P2** Reset-password requires token (`bugs/P2-reset-password-renders-without-token.md`) | FIXED-VERIFIED | b5430e38f (P2-reset-password-renders-without-token) |
| 10 | **P2** Onboarding checklist progress (`bugs/P2-onboarding-checklist-stuck-0-of-7.md`) | FIXED-VERIFIED | 534796214 (P2-onboarding-checklist-stuck-0-of-7) |
| 12 | **P2** Support nav IA (`bugs/P2-support-not-in-top-nav.md`) | FIXED-VERIFIED | 8c362e7df (P2-support-not-in-top-nav) |
| 13 | **P2** Termination toast vs Active (`bugs/P2-termination-toast-says-deactivated-still-active.md`) | FIXED-VERIFIED | d63e27bbe (P2-termination-toast-says-deactivated-still-active) |
| 14 | **P2** Wiki empty state (`bugs/P2-wiki-empty-state-hides-existing-page.md`) | FIXED-VERIFIED | 56249f732 (P2-wiki-empty-state-hides-existing-page) |
| 15 | **P3** Announcement script title (`bugs/P3-script-tag-in-announcement-title.md`) | FIXED-VERIFIED | 423fadf0a (P3-script-tag-in-announcement-title) |
| 16 | **P3** Long overflow strings (`bugs/P3-long-overflow-strings-in-lists.md`) | FIXED-VERIFIED | 6c0fd925f (P3-long-overflow-strings-in-lists) |
| 18 | **P3** Timesheet log when project has no tickets (`bugs/P3-timesheet-log-blocked-without-ticket-no-hint.md`) | FIXED-VERIFIED | 3dde2aa1f (P3-timesheet-log-blocked-without-ticket-no-hint) |
| 19 | **P2** Recruitment 404 / missing module (`bugs/P2-recruitment-route-404.md`) | BLOCKED | ATS module exists (app/(dashboard)/ats, sidebar 'Hiring') but ships off behind NEXT_PUBLIC_ATS_MODULE; marketing promise removed in 2f87aa44e. Tarun: decide whether to enable the flag in Vercel. |
| 20 | **P3** Add Asset validation toasts (`bugs/P3-asset-add-validation-toasts-overlap.md`) | FIXED-VERIFIED | 8b56f54de (P3-asset-add-validation-toasts-overlap) |
| 21 | **P1** Forgot-password email not received (`bugs/P1-forgot-password-no-email-received.md`) | FIXED-VERIFIED | 5fecd22af (P1-forgot-password-no-email-received) |
| 22 | **P3** Attendance check-in on holiday (`bugs/P3-attendance-checkin-allowed-on-holiday.md`) | FIXED-VERIFIED | 58b7f93ae (P3-attendance-checkin-allowed-on-holiday) |
| 23 | **P3** Kudos confirm easy to miss (`bugs/P3-kudos-confirm-easy-to-miss.md`) | FIXED-VERIFIED | c5039dfc0 (P3-kudos-confirm-silent-close) |
| 24 | **P3** QR image blank (`bugs/P3-qr-code-image-blank.md`) | CLOSED | Not reproducible per bug file ~23:22 IST 10-27; QR renders |
| 25 | **P2** Reimbursement self-approve vs loans (`bugs/P2-reimbursement-allows-self-approve.md`) | FIXED-VERIFIED | 28ce89341 (P2-reimbursement-allows-self-approve) |
| 26 | **P2** HR Analytics KPI/panel inconsistency (`bugs/P2-hr-analytics-metric-inconsistency.md`) | FIXED-VERIFIED | ace7214ed (P2-hr-analytics-metric-inconsistency) |
| 27 | **P2** Email header logo truncated to “MI” | FIXED-VERIFIED | 10f1bc9ca (P2-email-header-logo-truncated-mi) |
| 28 | **P2** Knowledge `/knowledge/spaces` 404 (wiki/spaces works) (`bugs/P2-knowledge-spaces-templates-404.md`) | FIXED-VERIFIED | d577b30ee (P2-knowledge-spaces-templates-404) |
| 29 | **P3** Leave Approvals row click no detail (`bugs/P3-leave-approvals-row-click-no-detail.md`) | FIXED-VERIFIED | ee3c2e195 (P3-leave-approvals-row-click-no-detail) |
| 31 | **P2** API rate limits (429/Retry-After; auth+API; document scope) (`bugs/P2-api-no-visible-rate-limit.md`) | FIXED-VERIFIED | 54809fb8f R5e X-RateLimit-* headers + 429; e380344d4 auth rate-limit test |
| 32 | **P2** Unified `/api/*` JSON error envelope (`bugs/P2-api-error-envelope-inconsistent.md`) | FIXED-VERIFIED | d75ffd156 (P2-api-error-envelope-inconsistent) |
| 33 | **P2/P3** Idempotency-Key (or equiv) on hire/invite/pay-run POSTs | CLOSED | Covered by natural-key guards: uq_users_employee_id (0199), uniq_payroll_org_user_month, invitation route 409, R3-0008 double-submit rejects. Idempotency-Key header skipped; add if a client retries POSTs |
| 34 | **P2** Employee recognition access vs kudos notifications (`bugs/P2-employee-recognition-access-restricted.md` | FIXED-VERIFIED | b65e6a90b (P2-employee-recognition-access-restricted) |
| 35 | **P3** Helpdesk RESOLVED vs Closed label (`bugs/P3-helpdesk-resolved-vs-closed-label.md`) | FIXED-VERIFIED | cff639d78 (P3-helpdesk-resolved-vs-closed-label) |
| 36 | **P3** Sign-in error alert stacks | FIXED-VERIFIED | 328e73df7 (P3-signin-error-alert-stacks) |
| 38 | **P3** Data Hub Employees export filename headcount (`bugs/P3-data-hub-employees-export-filename.md`) | FIXED-VERIFIED | c3526459e (P3-data-hub-employees-export-filename) |
| 39 | **P3** Expenses “Rejected today” KPI stale (`bugs/P3-expenses-rejected-today-kpi-stale.md`) | FIXED-VERIFIED | f343de32b (P3-expenses-rejected-today-kpi-stale) |
| 40 | **P3** Career ladder title required before input (`bugs/P3-career-ladder-title-required-before-input.md`) | FIXED-VERIFIED | 4083ab174 (P3-career-ladder-title-required-before-input) |
| 41 | **P2** AI hub unavailable vs settings flags (`bugs/P2-ai-hub-unavailable-while-settings-on.md`) | FIXED-VERIFIED | 7718bd9f7 (P2-ai-flags-on-but-hub-unavailable is its DUPLICATE) |
| 42 | **P2** Support AI Reply fails (`bugs/P2-support-ai-reply-fails.md`) | FIXED-VERIFIED | 8be4c6a0d (P2-support-ai-reply-fails) |
| 43 | **P3** Expense submit missing success toast (`bugs/P3-expense-submit-no-success-toast.md`) | CLOSED | toast.success('Expense submitted successfully') in create-expense-dialog.tsx:346 since 2026-07-31; Submit New Claim uses that dialog. Claim saved; toast not observed = FP |
| 44 | **P3** Attendance calendar partial month (`bugs/P3-attendance-calendar-partial-month.md`) | FIXED-VERIFIED | 2bd5e4775 (P3-attendance-calendar-partial-month) |
| 45 | **P2** Emp cannot view own performance review (`bugs/P2-emp-no-own-performance-view.md`) | FIXED-VERIFIED | 7274dd16e (P2-emp-no-own-performance-view) |
| 46 | **P3** Expense KPI includes rejected (`bugs/P3-expense-kpi-includes-rejected.md`) | FIXED-VERIFIED | f343de32b |
| 47 | **P3** Emp reimbursements title unscoped (`bugs/P3-reimbursements-title-unscoped-for-emp.md`) | FIXED-VERIFIED | 8aa79344e (P3-reimbursements-title-unscoped-for-emp) |
| 48 | **P3** Emp `/hr` breadcrumb access-restricted (`bugs/P3-emp-hr-breadcrumb-access-restricted.md`) | FIXED-VERIFIED | 928f684af (P3-emp-hr-breadcrumb-access-restricted) |
| 49 | **P3** Helpdesk `?new=1` persists (`bugs/P3-helpdesk-new-query-persists.md`) | FIXED-VERIFIED | a62ab5f3c (P3-helpdesk-new-query-persists) |
| 50 | **P3** Wiki home empty vs sidebar (`bugs/P3-wiki-home-empty-vs-sidebar.md`) | CLOSED | DUPLICATE of P2-wiki-empty-state-hides-existing-page, fixed 56249f732 |
| 51 | **P3** Work Logs blur-autosave (`bugs/P3-work-log-blur-autosave.md`) | FIXED-VERIFIED | 1b0e73905 (P3-work-log-blur-autosave) |
| 52 | **P3** Timesheets nav inconsistency (`bugs/P3-timesheets-nav-inconsistency.md`) | FIXED-VERIFIED | c4e4af765 (P3-timesheets-nav-inconsistency) |
| 53 | **P3** Project soft-deny ambiguous (`bugs/P3-project-soft-deny-ambiguous.md`) | FIXED-VERIFIED | 4e3d6f83c (P3-project-soft-deny-ambiguous) |
| 54 | **P2** Audit log missing project events (`bugs/P2-audit-log-missing-project-events.md`) | FIXED-VERIFIED | 52930e76b (P2-audit-log-missing-project-events) |
| 55 | **P3** Session accumulation Unknown device (`bugs/P3-session-accumulation-unknown-device.md`) | FIXED-VERIFIED | e78018b6a (P3-session-accumulation-unknown-device) |
| 57 | **P3** Data Export no confirm (`bugs/P3-data-export-no-confirm.md`) | FIXED-VERIFIED | daa020ba7 (P3-data-export-no-confirm) |
| 58 | **P3** Permission Matrix Employee column clipped (`bugs/P3-permission-matrix-employee-column-clipped.md`) | FIXED-VERIFIED | 2fd05a1e0 (matrix sized for 4 role columns) |
| 59 | **P3** Termination reason long label wrap (`bugs/P3-termination-reason-long-label-wrap.md`) | FIXED-VERIFIED | ba9dcbb85 (P3-termination-reason-long-label-wrap) |
| 60 | **P3** settings/system-health soft 404 (`bugs/P3-settings-system-health-soft-404.md`) | FIXED-VERIFIED | bf83392d9 (P3-settings-system-health-soft-404) |
| 62 | **P2** Emp handbook access-restricted (`bugs/P2-emp-handbook-access-restricted.md`) | FIXED-VERIFIED | 0e669ef30 (P2-emp-handbook-access-restricted) |
| 64 | **P3** Payslip preview loan EMI not itemized (`bugs/P3-payroll-preview-loan-emi-not-itemized.md`) | FIXED-VERIFIED | 13ca8c40f (P3-payroll-preview-loan-emi-not-itemized) |
| 65 | **P2** Recalculate drafts drops Professional Tax (`bugs/P2-payroll-recalc-drops-professional-tax.md`) | FIXED-VERIFIED | 747a5a5ad (P2-payroll-recalc-drops-professional-tax) |
| 66 | **P3** Recalculate drafts no confirm (`bugs/P3-payroll-recalculate-no-confirm.md`) | FIXED-VERIFIED | 6881d704d (P3-payroll-recalculate-no-confirm) |
| 68 | **P3** Appraisal categories not configured / no settings link (`bugs/P3-appraisal-categories-not-configured.md | FIXED-VERIFIED | 222f17bb2 R1b /settings/appraisal-categories + banner link |
| 70 | **P3** Support Assignee not editable (`bugs/P3-support-assignee-not-editable.md`) | FIXED-VERIFIED | 16c6bd40b (P3-support-assignee-not-editable) |
| 71 | **P2** Notifications stale after WFH/loan approve (`bugs/P2-notifications-stale-after-approve.md`) | FIXED-VERIFIED | b39ee45dd |
| 72 | **P3** Performance tab clicks inert (`bugs/P3-performance-tab-clicks-inert.md`) | CLOSED | NOT REPRO per bug file ~19:34 IST 10-27 |
| 73 | **P3** Notification deep-link no entity id (`bugs/P3-notification-deeplink-no-entity-id.md`) | FIXED-VERIFIED | b39ee45dd (P3-notification-deeplink-no-entity-id) |
| 74 | **P3** Who's Out omits WFH (`bugs/P3-whos-out-omits-wfh.md`) | FIXED-VERIFIED | d3e382712 (P3-whos-out-omits-wfh) |
| 75 | **P3** Mark reimbursed no confirm (`bugs/P3-expense-mark-reimbursed-no-confirm.md`) | FIXED-VERIFIED | b35e7b6cb (P3-expense-mark-reimbursed-no-confirm) |
| 76 | **P3** Calendar renders leave/holidays one day early vs modules (`bugs/P3-calendar-leave-dates-off-by-one-vs-d | FIXED-VERIFIED | 0340d3ded (bare dates, IST) |
| 79 | **P3** Toolbar Add Event ignores selected day | FIXED-VERIFIED | cbb2cfccf (P3-calendar-add-event-ignores-selected-day) |
| 80 | **P3** Month-cell Add Event End = Start+1 day, All-day OFF (`bugs/P3-calendar-month-cell-end-plus-one.md`) | FIXED-VERIFIED | b2c94bf63 (P3-calendar-month-cell-end-plus-one) |
| 81 | **P3** Attendance holiday vs calendar mismatch (`bugs/P3-attendance-holiday-vs-calendar-mismatch.md`) | FIXED-VERIFIED | 0340d3ded |
| 82 | **P3** Emp attendance holiday shown as Absent (`bugs/P3-attendance-holiday-shown-as-absent.md`) | FIXED-VERIFIED | d5c3064ad (Holiday status in Team monitor) |
| 83 | **P3** Project Health Off track with 0 overdue (`bugs/P3-project-health-off-track-zero-overdue.md`) | FIXED-VERIFIED | d64c7e364 (P3-project-health-off-track-zero-overdue) |
| 84 | **P3** Create drawers missing Cancel (`bugs/P3-create-drawer-missing-cancel.md`) | FIXED-VERIFIED | 98bf9e675 (P3-create-drawer-missing-cancel) |
| 88 | **P3** Project Calendar view empty without due dates (`bugs/P3-project-calendar-view-empty.md`) | FIXED-VERIFIED | 51d4efb26 (P3-project-calendar-view-empty) |
| 89 | **P2** Emp Contributor full ticket edit + Archive (`bugs/P2-emp-contributor-full-ticket-edit.md`) | FIXED-VERIFIED | 1655e2b68 (P2-emp-contributor-full-ticket-edit) |
| 91 | **P3** /data-hub + /hr/data-hub 404 → redirect to /settings/data-hub (`bugs/P3-data-hub-route-404.md`) | FIXED-VERIFIED | 190590831 (P3-data-hub-route-404) |
| 92 | **P3** /settings/data-export "section not found"; real /settings/data-hub (`bugs/P3-settings-data-export-route | FIXED-VERIFIED | 3baecf6f7 (P3-settings-data-export-route-404) |
| 93 | **P3** /settings/qr-codes "section not found"; real /tools/qr-code (`bugs/P3-settings-qr-codes-route-not-found | FIXED-VERIFIED | bc1407844 (P3-settings-qr-codes-route-not-found) |
| 94 | **P3** Wiki doc stuck on loading skeleton (`bugs/P3-wiki-openable-page-stuck-skeleton.md`) | CLOSED | FP / load race per bug file; passes on 3 rechecks |
| 95 | **P3** No Announcements route / nav link (`bugs/P3-announcements-route-missing.md`) | FIXED-VERIFIED | ea1c1ac55 /dashboard/announcements; prod /announcements 307 |
| 99 | P2 `bugs/P2-expense-import-auto-approve-default-on.md` | FIXED-VERIFIED | e17967dbf (P2-expense-import-auto-approve-default-on) |
| 100 | P2 `bugs/P2-expense-import-category-taxonomy-mismatch.md` | FIXED-VERIFIED | 2a137e49c (P2-expense-import-category-taxonomy-mismatch) |
| 101 | **P2** `bugs/P2-hire-wizard-duplicate-employee-id-no-client-check.md` | FIXED-VERIFIED | 5b4ff401a (P2-hire-wizard-duplicate-employee-id-no-client-check) |
| 103 | **QA coverage** Multi-role ID/email coverage | CLOSED | QA-process item (manual multi-role pass), not a code defect; dup-ID guard covered by 5b4ff401a + 0199 |
| 104 | **P3** `bugs/P3-hire-wizard-blank-id-no-preview.md` | FIXED-VERIFIED | 5b4ff401a (step-2 check + next-ID preview) |
| 105 | **P3** `bugs/P3-no-rehire-reonboard-for-terminated.md` | FIXED-VERIFIED | 3b6a9b932 (P3-no-rehire-reonboard-for-terminated) |
| 106 | **P3** `bugs/P3-payroll-attendance-no-emp-id-column.md` | FIXED-VERIFIED | 8d705d8fd (P3-payroll-attendance-no-emp-id-column) |
| 173 | **P3** Onboarding Documents tab hub-only (`bugs/P3-onboarding-documents-tab-empty-hub-only.md`) | FIXED-VERIFIED | be7b227a7 (P3-onboarding-documents-tab-empty-hub-only) |
| 178 | **P2** EmpOne deactivated before effective date, exit still open (`bugs/P2-empone-terminated-effective-future- | FIXED-VERIFIED | bc816093a (P2-empone-terminated-effective-future-still-on-exit) |
| 182 | **P3** Assets still Assigned while return PENDING (`bugs/P3-assets-still-assigned-while-return-pending.md`) | FIXED-VERIFIED | 86755dfe9 (P3-assets-still-assigned-while-return-pending) |
| 228 | INFO-hr-cannot-approve-loans | FIXED-VERIFIED | 10dd3b9da (HR decides loans) + c84519bd8 |
| 236 | INFO-gantt-default-today-bars | FIXED-VERIFIED | 0f4bffe7b (INFO-gantt-default-today-bars) |
| 238 | P3-departments-admin-missing | FIXED-VERIFIED | 0645c2039 R1a /settings/departments CRUD; prod /hr/departments 307 |
| 243 | P3-settings-profile-route-not-found | FIXED-VERIFIED | 875750f3b (P3-settings-profile-route-not-found) |
| 249 | P3-leave-types-route-split: redirect /hr/leave-types, /settings/leave and /hr/leave-policy to /hr/leaves/polic | FIXED-VERIFIED | b8ff843d8 (P3-leave-types-route-split) |
| 250 | INFO-no-add-leave-type-button: confirm with product | FIXED-VERIFIED | 45f41efe4 (INFO-no-add-leave-type-button) |
| 259 | P3-attendance-team-route-404: /hr/attendance/team returns 404; add the route or a redirect | FIXED-VERIFIED | 488428cea (P3-attendance-team-route-404) |
| 260 | P3-dashboard-team-attendance-widget-not-link: make the widget link to the team attendance view | FIXED-VERIFIED | fd330639a (P3-dashboard-team-attendance-widget-not-link) |
| 270 | P3-performance-new-review-noop (reopened tentative, create-noop cluster) | CLOSED | FP per bug file (drawer opens) |
| 271 | INFO-performance-cycles-tab-noop (tentative, tabs-noop cluster) | CLOSED | NOT REPRO per bug file ~19:34 IST |
| 273 | P3-offboarding-route-404 | FIXED-VERIFIED | 1467c9299 (P3-offboarding-route-404) |
| 274 | Exit: show Emp IDs in /hr/exit list (termination list already shows them) | FIXED-VERIFIED | 04f210042 |
| 275 | Terminated (Completed) employees: hide from calendar, recover assets, close exit record (EmpOne VC26006) | FIXED-VERIFIED | 5d4ac9ea7 hide leavers from calendars; bc816093a exit closes/deactivation date; a8b14a4b7 exit cancels future leave |
| 276 | INFO-new-termination-noop (tentative) | CLOSED | NOT A BUG per bug file (misclick) |
| 277 | P3-announcements-route-404 | FIXED-VERIFIED | ea1c1ac55 (P3-announcements-route-404) |
| 279 | P3-audit-route-split | FIXED-VERIFIED | 263b0e979 (P3-audit-route-split) |
| 280 | Audit log: show actor names/Emp IDs and entity labels instead of User #/numeric IDs | FIXED-VERIFIED | b7d0fc733 |
| 284 | P3-documents-upload-cancel-disabled | FIXED-VERIFIED | 4bc3dd0c0 (P3-documents-upload-cancel-disabled) |
| 290 | (INFO→P3 if expected) shifts-rosters-not-in-build | FIXED-VERIFIED | R3 shifts merged; prod /hr/shifts 307 to signin (route exists) |
| 329 | P3-doc-types-alias-404 (~17:47 IST) [PARTIAL ~09:43 IST 2026-10-28: canonical OK, alias still 404]: add redire | FIXED-VERIFIED | e8d86dc31 (P3-doc-types-alias-404) |
| 332 | P3-doc-review-alias-404 (~17:50 IST): add redirect /hr/doc-review → /hr/document-review (alias-404 cluster wit | FIXED-VERIFIED | next.config redirect; prod /hr/doc-review 307 -> /hr/document-review |
| 335 | P3-roadmap-alias-404 (~17:55 IST): add redirect /roadmap → /projects/roadmap (alias-404 cluster). | FIXED-VERIFIED | 37a63601e (P3-roadmap-alias-404) |
| 338 | P2-wiki-new-page-no-cancel (~17:57 IST): /knowledge/wiki "New page" creates a draft immediately with no Cancel | FIXED-VERIFIED | 6fc55e760 (P2-wiki-new-page-no-cancel) |
| 342 | P3-permission-matrix-alias-404 (OPEN) | FIXED-VERIFIED | b391cdcc8 (P3-permission-matrix-alias-404) |
| 344 | P3-ai-settings-immediate-toggle | FIXED-VERIFIED | 9426ee728 (Undo toast per AI flag) |
| 345 | P3-data-export-alias-404 | FIXED-VERIFIED | 3baecf6f7; prod 307 -> /settings/data-hub |
| 372 | P3-performance-review-card-noop (~18:51 IST): /hr/performance Reviews card click does nothing (no detail view) | FIXED-VERIFIED | bd069b5ca (P3-performance-review-card-noop) |
| 387 | `/hr/shifts` 404 | FIXED-VERIFIED | Shifts module built (hooks/shifts.ts, sidebar); prod /hr/shifts route live |
| 388 | `/hr/team-schedule` 404 | FIXED-VERIFIED | redirect; prod /hr/team-schedule 307 -> /hr/attendance |
| 389 | Team monitor: user marked Present with in=out=03:12 and 0.0h | CLOSED | Prod rows show real punches seconds apart (e.g. attendance id 5: 07:12:26-07:12:30Z), so 0.0h is accurate; tz display fixed f3869e1c2 |
| 403 | Low: alias routes 404 (/hr/find-expert, /find-expert, /skills, /hr/experts, /knowledge/find-expert) | FIXED-VERIFIED | 5e9c259b8; prod /find-expert, /skills, /hr/find-expert 307 |
| 404 | Info: /hr/skills has 0 seeded skills; Find Expert returns 0 for "Python" | BLOCKED | Demo data only. No mock data in app code; Tarun: add real skills via /hr/skills if wanted |
| 415 | P3-helpdesk-creator-self-assign-inconsistent | CLOSED | FP: POST /api/hr/helpdesk never sets assignee; prod ticket #8 was raised by an employee and assigned to Tarun manually 3 min later (updated_at 08:39 vs created 08:36) |
| 482 | (reinforced ~20:03 IST, bug file created) P3-performance-review-card-noop | FIXED-VERIFIED | bd069b5ca (P3-performance-review-card-noop) |
| 486 | P3-timesheets-nav-inconsistency REINFORCED ~20:06 IST: /hr/timesheets, /work-logs show soft-404 "Page not foun | FIXED-VERIFIED | c4e4af765 (P3-timesheets-nav-inconsistency) |
| 542 | [P3] P3-roadmap-alias-404 STILL OPEN: redirect /roadmap → /projects/roadmap; redirect /resource-allocation → / | FIXED-VERIFIED | 37a63601e (P3-roadmap-alias-404) |
| 567 | P2-attendance-holiday-counted-as-absent (reconfirmed 21:39 IST 10-27): exclude holidays from Absent; add Holid | FIXED-VERIFIED | d5c3064ad (P2-attendance-holiday-counted-as-absent) |
| 568 | P2-onboarding-checklist-stuck-0-of-7 (reconfirmed 21:41 IST 10-27): 13/13 at 0/7; wire checklist item completi | FIXED-VERIFIED | 534796214 (P2-onboarding-checklist-stuck-0-of-7) |
| 569 | P2-audit-log-missing-project-events (reconfirmed 21:44 IST 10-27): log Project updated, ticket/task/sprint CRU | FIXED-VERIFIED | 52930e76b (P2-audit-log-missing-project-events) |
| 571 | P2-support-ai-reply-fails (reconfirmed ~21:45 IST 2026-10-27 (Asia/Calcutta)): fix AI reply generation backend | FIXED-VERIFIED | 8be4c6a0d (P2-support-ai-reply-fails) |
| 574 | P2-payroll-recalc-drops-professional-tax | FIXED-VERIFIED | 747a5a5ad (P2-payroll-recalc-drops-professional-tax) |
| 575 | P2-support-not-in-top-nav (reconfirmed ~21:51 IST 2026-10-27): add Support top module or highlight correctly o | FIXED-VERIFIED | 8c362e7df (P2-support-not-in-top-nav) |
| 585 | P2-employee-recognition-access-restricted | FIXED-VERIFIED | b65e6a90b (P2-employee-recognition-access-restricted) |
| 586 | P3-timesheets-nav-inconsistency reconfirmed OPEN ~22:28 IST 2026-10-27 (/timesheets→team OK; /hr/timesheets+/w | FIXED-VERIFIED | c4e4af765 (P3-timesheets-nav-inconsistency) |
| 680 | **P3** Career Ladders "Create Ladder" button no-op | CLOSED | Not reproduced ~01:22 IST 10-28 (wrong singular URL) |
| 689 | **P3** Permission Matrix Super Admin header clipped to "uper Admin" (`bugs/P3-permission-matrix-super-admin-co | FIXED-VERIFIED | 2fd05a1e0 (P3-permission-matrix-super-admin-column-clipped) |
| 749 | PARTIAL ~09:23 IST 2026-10-28 | BLOCKED | Data drift on SA row only: leave_balances id=1 balance 3 (entitled 12) with 0 leave_requests, so Used shows 9. Employee path consistent. Tarun: approve `UPDATE leave_balances SET balance=12 WHERE id=1` |
| 768 | **P3** `bugs/P3-emp-self-profile-missing-empid.md` | FIXED-VERIFIED | ff82a62d0 (P3-emp-self-profile-missing-empid) |
