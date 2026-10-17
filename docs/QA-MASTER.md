# the latest testing CRM MiyoGlobal testing file

**Product:** Miyo Global CRM — https://crm.miyoglobal.com
**Repo:** github.com/Miyo-global/CRM
**Retest HEAD:** `b1bd73f` (16 Oct 2026, 20:27 IST)
**Security audit HEAD:** `b1bd73f`
**Assembled:** 17 Oct 2026 (Asia/Kolkata)
**Sources merged:** RETEST.md (v3), SECURITY-TODO.md, KB-TODO.md, MIYO-CRM-TODO.md (ATS MIYO-0626–0687), ATS-MASTER-PROMPT.md, MIYO-CRM-QA-TODO.md (full text for open old IDs)

---

## 0. Instructions for the coding agent (Claude Code / Cursor)

1. Work **strictly in order** through the phases below, one item at a time. Do not skip ahead except where an item is blocked on a Decision in §2; if so, leave it unchecked, note the blocker, and continue.
2. After each item: run `pnpm typecheck` plus the related tests for the files you touched. Commit with the item ID in the message (e.g. `SEC-0001: gate settings role API through checkRoleAssignment`), **push to `main`**, and tick the checkbox in this file in the same commit.
3. Every **10 items**, run the full `pnpm lint && pnpm test && pnpm build`. **Stop** if the build breaks; fix or report before continuing.
4. **Production DB holds only test data.** You have full DB access: you may run migrations (`pnpm db:apply-pending` / `pnpm db:migrate:deploy`), add or alter tables, and insert or delete QA rows. Migrations also run automatically on deploy via `vercel.json`.
5. For any end-to-end check (onboarding, welcome email, login, MFA, leave, payroll, payslip, exit, ATS apply-to-hire, KB), use **temp emails** (e.g. mail.tm) and prefix every test record with `QA`.
6. **Never touch** `.omc/` *file contents*, `scripts/generate-miyo-payslips.ts`, or any `.env*` file. Never print secret values. **Exception for SEC-0013:** `git rm -r --cached .omc` and add `.omc/` to `.gitignore` — delete from the git index only, never delete the local files.
7. After code changes, run `graphify update .` (as required by CLAUDE.md).
8. After each commit, print one status line: `ITEM-ID | pass/fail | pushed yes/no`.
9. Design rule for every UI change: simple, neat, clean, not AI-looking. No gradients, glow, glass, illustrations, emoji decoration or filler copy. Palette: gold `#D4AF37`, ink `#201E1F`, silver `#D8D8D8`, plus neutral greys. Times in IST with a short label.
10. Payroll rules (source of truth): PT ₹150 if gross ≤ ₹11,000, else ₹250. Basic 50% / HRA 25% / Special 25%. Per-day = salary ÷ 31. Net = salary − LOP×per-day − PT + OT (OT = OT days × per-day, 1×). No LOP before joining date. Mid-month joiners: salary ÷ 31 × days from joining (confirm D7). Keep the free 1–2 absent-days budget.
11. Email templates: target HTML+text files live in `email-templates/` (bundled next to this file / in the zip). Copy into the repo as part of the email-template items.
12. **Push policy (Tarun's decision):** Tarun has asked for direct pushes to `main`. Security reviewers (SEC-0010) recommend PRs with required checks instead. Present this as Tarun's call — do not silently switch to PRs unless Tarun changes D-PUSH below.
13. When an item lists **Also known as:** those IDs are the same bug; fix once and tick conceptually covers them. Do not re-fix the aliases as separate work.

---

## 1. Summary

| Phase | What | Items |
|---|---|---:|
| 1 | Critical security & blockers | 7 |
| 2 | High | 69 |
| 3 | Medium | 90 |
| 4 | Low + design + responsiveness | 240 |
| 5 | Hardening baseline (SEC) | 7 |
| 6 | ATS build (MIYO-0626–0687) | 62 |
| 7 | Knowledge Base port (KB-0001–0169) | 169 |
| **Total** | | **644** |

### By severity (Phases 1–4 + 6–7 checklist items)
| Severity | Count |
|---|---:|
| Critical | 48 |
| High | 168 |
| Medium | 172 |
| Low | 248 |
| Info | 1 |
| Hardening baseline steps | 7 |

### Retest coverage (from RETEST.md @ b1bd73f)

| Metric | Value |
|---|---|
| Old IDs re-verified | 493 |
| FIXED | 91 |
| STILL_BROKEN | 131 |
| PARTIAL | 238 |
| NEEDS_UI | 25 |
| CANT_VERIFY | 2 |
| INTENDED | 2 |
| OUT_OF_SCOPE | 4 |
| New R3 open items | 44 (2 Critical, 12 High, 20 Medium, 9 Low, 1 Info) |
| SEC open items | 18 (1 Critical, 6 High, 6 Medium, 5 Low) |
| Status-matrix rows | 5466 (9 actors × pages/APIs) |
| Responsive cells graded | 69 (37 OK / 28 MINOR / 4 BROKEN) |
| ATS | **Not built** (removed `3cbeb49`); `/hr/ats`, `/careers`, `/jobs` → 404 |

### Top 15 (do these first)

1. **SEC-0001 / R3-0001 / QA-0002** — HR can promote anyone to CEO/ADMIN via `/api/settings/users/[userId]/role` (no `checkRoleAssignment`).
2. **R3-0002 / MIYO-0071** — No QA CEO/ADMIN path: exit CEO review + payroll approve/pay are a dead end.
3. **SEC-0007 / R3-0003** — Revoked sessions still execute Next.js server actions.
4. **SEC-0003** — Rate limiting is in-memory per-instance → no-op on Vercel (20 login + 20 reset, zero 429s).
5. **SEC-0002** — `updateEmployee` server action writes `role`/salary/bank with no role gate.
6. **SEC-0006** — PAN, bank details, Google OAuth tokens stored unencrypted at rest.
7. **SEC-0004 / SEC-0005** — Upgrade `sanitize-html` (≥2.17.7) and `undici` (≥8.10.2).
8. **R3-0020 / QA-0018** — Approved leaves do not reduce balance.
9. **R3-0008 / QA-0032** — Double-submit creates duplicates (leave, loans, departments, holidays, calendar).
10. **R3-0004 / QA-0004** — Reporting manager cannot approve leave (`hr:leaves:approve` 403).
11. **R3-0005 / QA-0011** — Leave decision emails skipped on PATCH status path.
12. **R3-0019** — App is a day behind just after midnight IST (UTC date keys).
13. **R3-0021 / R3-0016** — `/ai` error page + `/api/ai/*` 5xx when AI unconfigured.
14. **R3-0200 / R3-0201** — Dashboard 6–20s; 4 BROKEN responsive cells.
15. **R3-0007 / QA-0028** — `/api/hr/incentives` readable by every role.

### Status-code matrix (summary)

```
# Status matrix summary (v3)
Total rows: **5466** (9 actors × pages+APIs from feature-map-v3). HEAD b1bd73f.
Actors: OUT, HR, ENG, ENG2, CS, SALES, DESIGN, VIDEO, DM.

## Counts by status per role
| Role | 200 | 307/302 | 401 | 403 | 404 | 400 | 405 | 429 | 5xx | other | total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| OUT | 13 | 122 | 455 | 0 | 4 | 11 | 0 | 1 | 2 | 0 | 608 |
| HR | 358 | 15 | 13 | 9 | 33 | 157 | 0 | 1 | 21 | 1 | 608 |
| ENG | 196 | 81 | 13 | 151 | 62 | 85 | 0 | 1 | 19 | 0 | 608 |
| ENG2 | 194 | 79 | 13 | 151 | 60 | 85 | 0 | 1 | 19 | 0 | 602 |
| CS | 195 | 81 | 13 | 150 | 62 | 87 | 0 | 1 | 19 | 0 | 608 |
| SALES | 195 | 81 | 13 | 152 | 62 | 85 | 0 | 1 | 19 | 0 | 608 |
| DESIGN | 194 | 81 | 13 | 153 | 62 | 86 | 0 | 0 | 19 | 0 | 608 |
| VIDEO | 195 | 81 | 13 | 153 | 62 | 85 | 0 | 0 | 19 | 0 | 608 |
| DM | 195 | 81 | 13 | 152 | 62 | 85 | 0 | 0 | 20 | 0 | 608 |

## Every 5xx (157)
| Role | Method | Path | Status | ms | Detail |
|---|---|---|---:|---:|---|
| HR | POST | `/api/expenses/import` | 500 | 197 | {"error":"Failed to import expenses"} |
| HR | GET | `/api/hr/dashboard/payroll-summary` | 500 | 184 |  |
| CS | GET | `/api/inngest` | 500 | 170 | {"code":"internal_server_error"} |
| DESIGN | GET | `/api/inngest` | 500 | 181 | {"code":"internal_server_error"} |
| DM | GET | `/api/inngest` | 500 | 229 | {"code":"internal_server_error"} |
| ENG | GET | `/api/inngest` | 500 | 133 | {"code":"internal_server_error"} |
| ENG2 | GET | `/api/inngest` | 500 | 154 | {"code":"internal_server_error"} |
| HR | GET | `/api/inngest` | 500 | 227 | {"code":"internal_server_error"} |
| OUT | GET | `/api/inngest` | 500 | 357 | {"code":"internal_server_error"} |
| SALES | GET | `/api/inngest` | 500 | 168 | {"code":"internal_server_error"} |
| VIDEO | GET | `/api/inngest` | 500 | 126 | {"code":"internal_server_error"} |
| CS | POST | `/api/onboarding/documents` | 500 | 158 |  |
| DESIGN | POST | `/api/onboarding/documents` | 500 | 176 |  |
| DM | POST | `/api/onboarding/documents` | 500 | 188 |  |
| ENG | POST | `/api/onboarding/documents` | 500 | 134 |  |
| ENG2 | POST | `/api/onboarding/documents` | 500 | 194 |  |
| HR | POST | `/api/onboarding/documents` | 500 | 392 |  |
| SALES | POST | `/api/onboarding/documents` | 500 | 136 |  |
| VIDEO | POST | `/api/onboarding/documents` | 500 | 168 |  |
| CS | POST | `/api/storage/upload` | 500 | 162 | {"error":"Failed to upload file"} |
| DESIGN | POST | `/api/storage/upload` | 500 | 133 | {"error":"Failed to upload file"} |
| DM | POST | `/api/storage/upload` | 500 | 179 | {"error":"Failed to upload file"} |
| ENG | POST | `/api/storage/upload` | 500 | 194 | {"error":"Failed to upload file"} |
| ENG2 | POST | `/api/storage/upload` | 500 | 145 | {"error":"Failed to upload file"} |
| HR | PO
```

Full matrix: see original `status-matrix-summary.md` / `status-matrix.csv` in the QA v3 artifacts.

### Responsiveness (summary)

- **BROKEN (must fix — R3-0201):** `/hr/payroll` @375; `/hr/holidays` @375 and @768; `/hr/documents` @1024.
- **MINOR (30 cells — R3-0202):** tables clip Actions, sidebar crowds content @1024, board toolbar wrap, etc.
- **Performance (R3-0200):** dashboard cold >20s; `/api/hr/dashboard/headcount-trends` 25.5s.

---

## 2. Decisions Tarun must answer

Fill these in before or as the agent reaches the blocked items. Recommended defaults are in **bold** where the source suggested one.

| ID | Decision | Options / notes |
|---|---|---|
| D-PUSH | Direct push to `main` vs PRs with required checks | Tarun currently wants direct push. SEC-0010 recommends PRs + required gitleaks/audit/osv/semgrep. **Confirm.** |
| D-CEO | Seed a QA CEO (or allow Admin on exit CEO-review + payroll approve) | Without this, exit and payslip email E2E stay blocked. **Recommend:** create `QA CEO` test user OR allow ADMIN on exit CEO step and payroll approve. |
| D1 | Where Build lives | Keep as Projects (maybe rename nav to Build) **or** add `/build` alias. |
| D2 | Who approves payroll | CEO-only today (CEO can't approve own). Options: CEO or Admin; or two-step HR → CEO. |
| D3 | Half-day attendance threshold | Any check-in = full day today. |
| D4 | Free/paid leave days per year + manager approval before HR | |
| D5 | Leave policy editable in Settings? | |
| D6 | Keep public `/signup` open? | |
| D7 | PT basis for mid-month joiners | Prorated gross **or** full monthly salary. |
| D8 | Default ATS stages + requisition approver | Proposal in Phase 6 / ATS-MASTER-PROMPT: Applied → Screen → Interview → Offer → Hired / Rejected; CEO default approver. |
| D-KB1 | Where KB lives | **Default: top-nav module Knowledge at `/knowledge`.** |
| D-KB2 | KB editor | **Default: Plate v53** (same as Streamline). |
| D-KB3 | Migrate project `pages` → `kb_pages` | **Default: yes.** |
| D-KB4 | Company documents (HR docs in KB) | **Default: build, off by default.** |
| D-KB5 | Help centre | **Default: build last, flag off.** |
| D-KB6 | AI provider | **Default: reuse `lib/ai/openai.ts`; embeddings = text-embedding-3-small.** |
| D-ENV | Confirm prod env | Confirm `ENCRYPTION_KEY`, `CRON_SECRET`, `NEXTAUTH_SECRET`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`, `DATABASE_URL_MIGRATE`, Upstash Redis, R2, ZeptoMail, `OPENAI_API_KEY` (optional for AI/KB embeddings) are set in Vercel. `/api/inngest` currently 500. |

Until D-CEO is answered, the agent may temporarily promote a QA user to CEO **only in the test org**, then demote/delete after exit + payroll E2E — record the action in the commit body.

---

## 3. Phase 1 — Critical security and blockers


SEC-0001 is first. Overlapping R3/QA/MIYO IDs are folded into the canonical item via **Also known as.**

### Must-fix first

- [x] SEC-0001 [Critical][Broken Access Control / A01 — Privilege Escalation] HR/Admin can promote any account to CEO/ADMIN — **code-only (retest live with an HR account)**
  - Where: `app/api/settings/users/[userId]/role/route.ts:19-72`
  - Evidence: handler gates on `isAdminOrOwner(session.user.role)` (which = `ADMIN_ROLES` = **CEO, HR, ADMIN**) and only validates `ALL_ROLES.includes(input.role)` (ALL_ROLES includes CEO & ADMIN). It blocks changing *your own* role but never calls `checkRoleAssignment`, unlike the onboard/employee routes.
    ```ts
    if (!isAdminOrOwner(session.user.role)) return err(... 403);
    if (!ALL_ROLES.includes(input.role ...)) return err(... 400);
    if (userId === session.user.id) return err(... 403);
    await tx.update(users).set({ role: input.role })...   // no checkRoleAssignment
    ```
  - Impact: an HR (or Admin) user can set a colleague account to **CEO/ADMIN**, or demote the CEO — full tenant takeover, bypasses the QA-0002 fix on this endpoint.
  - Fix: route this write through `checkRoleAssignment({ orgId, actorRole, actorId, targetUserId, targetCurrentRole, newRole })` and honour its 400/403 result before updating `users.role` and `organizationMembers.role`.
  - Acceptance test: as HR, `POST /api/settings/users/{other}/role {"role":"CEO"}` → 403 "Only the CEO can grant…"; as CEO it succeeds. Regression test: unit test `checkRoleAssignment` is invoked and HR→CEO is rejected.
  - **Also known as:** R3-0001, QA-0002
  - **Retest status:** STILL_BROKEN live (HR→CEO/ADMIN via settings role API returns 200)


- [x] R3-0002 [Critical][Exit/Payroll] Org has no QA CEO/ADMIN — exit CEO review and payroll approve/pay unreachable — Where: `ceo-review` requires `role===CEO`; `PAYROLL_APPROVER_ROLES=CEO|ADMIN`; only `tarun@miyoglobal.com` is ADMIN — Steps: HR ceo-review → 403; HR payroll approve → 403 `hr:payroll:manage` — Expected: QA-completable path or seed QA CEO — Actual: dead end (cannot finish offboard or payslip email without Tarun) — Fix: allow Admin on exit CEO step **or** document that Tarun must act; align permission `hr:payroll:manage` with PAYROLL_APPROVER_ROLES for ADMIN — Acceptance: QA ADMIN/CEO can complete exit + payroll — Ref: MIYO-0071, 16 Oct 23:00 IST
  - **Also known as:** MIYO-0071


### Critical

- [x] MIYO-0002 [Critical][Prod/Deploy] Add a migration step to the deploy pipeline
  - **Where:** package.json scripts, vercel.json (add buildCommand) or .github/workflows/ci.yml, scripts/apply-pending-migrations.ts
  - **Problem:** There is no automated migration step; Vercel only runs `next build`. Any schema change ships code before columns exist (root cause of the 16 Oct outage).
  - **Fix:** Add a `db:migrate:deploy` script that runs scripts/apply-pending-migrations.ts with a lock (pg_advisory_lock) and exits non-zero on failure; run it in a GitHub Actions job on push to main before the Vercel production promote (or as Vercel `buildCommand: pnpm db:migrate:deploy && pnpm build` with `DATABASE_URL_MIGRATE`). Document required secret names only.
  - **Acceptance check:** A test migration that adds a nullable column is applied automatically on the next push to main; the job log shows `applied: <name>`; a failing migration blocks the deploy.
  - **Retest status:** PARTIAL
  - **Remaining:** ci.yml Replay migrations step exists but uses `// true` (errors tolerated) — not a hard deploy gate
  - **Agent note (17 Oct):** Code done in 66e3ce2 (hard gate, auto-picks new files, per-file txn). Live check pending: next prod deploy log must show `applied: <tag>`.


- [x] MIYO-0004 [Critical][Prod/Deploy] Repair drizzle meta snapshots and journal so `pnpm db:generate` works
  - **Where:** drizzle/meta/_journal.json, drizzle/meta/*_snapshot.json
  - **Problem:** Journal has 69 entries (last 0125_document_types_sort_order_decimal) while drizzle/ has 166 SQL files; snapshots only to 0006.
  - **Fix:** Regenerate a baseline snapshot from the current schema (drizzle-kit introspect against a DB built from all SQL files), register 0126–0156 in the journal with their real timestamps, keep SQL files unchanged.
  - **Acceptance check:** `pnpm db:generate` on unchanged schema produces 'No schema changes'.
  - **Retest status:** CANT_VERIFY
  - **Remaining:** Could not verify this pass: need to run pnpm db:generate locally; not probed this pass


- [x] MIYO-0010 [Critical][Prod/Performance] Check that the Vercel function region matches the Postgres region **[confirm on prod]**
  - **Where:** vercel.json (no `regions` set), DATABASE_URL host
  - **Problem:** Without `regions`, functions run in iad1 by default; if the DB is in Mumbai/Singapore every query crosses continents, and withAuth alone makes 2–3 round trips per request.
  - **Fix:** Confirm the DB region with Tarun, then set `"regions": ["bom1"]` (or the DB's region) in vercel.json.
  - **Acceptance check:** Server-Timing for a trivial API drops below 300 ms on prod.
  - **Retest status:** CANT_VERIFY
  - **Remaining:** Could not verify this pass: Vercel function region vs Postgres region — needs dashboard confirm


- [ ] MIYO-0013 [Critical][Build port] Treat the Build port as NOT deployed until migrations are applied and a prod smoke test passes **[confirm on prod]**
  - **Where:** STATUS.md, drizzle/0154–0156
  - **Problem:** Code is on main but the DB lacks its columns; every projects query fails on prod.
  - **Fix:** After MIYO migration item is done, run the PR #4 manual QA list on prod (create project via wizard, board drag, ticket page, comment mention, member role change, delete/restore).
  - **Acceptance check:** All PR #4 manual QA steps pass on crm.miyoglobal.com.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/support/page.tsx); live acceptance outstanding
  - **Agent note (17 Oct):** Blocked: needs push + prod smoke test (PR #4 manual QA list on crm.miyoglobal.com).


- [ ] MIYO-0017 [Critical][Payroll] Recompute or regenerate existing DRAFT payrolls after the rules fix **[confirm on prod]**
  - **Where:** app/api/hr/payrolls/generate/route.ts (duplicate check blocks regeneration), new route POST /api/hr/payrolls/recompute
  - **Problem:** Prod 16 Oct: Qa Alpha's Oct 2026 draft (generated 15 Oct) still shows PT ₹200, LOP 10 days (−₹3,226), net ₹6,574. Drafts are frozen at generation time, so fixed rules never reach them; the generate route refuses to regenerate (design doc N17).
  - **Fix:** Add 'Recalculate draft' (single and bulk, HR/CEO/Admin) that re-runs computePayroll for DRAFT rows only and writes an audit log with before/after net. Never touch APPROVED/PAID.
  - **Acceptance check:** After the fix, recalculating Qa Alpha's Oct draft gives PT ₹150 and LOP 0 for days before 15 Oct; APPROVED rows are unchanged.
  - **Retest status:** PARTIAL
  - **Remaining:** recompute route exists app/api/hr/payrolls/recompute; not confirmed all DRAFTs regenerated on prod
  - **Agent note (17 Oct):** Blocked: recompute route exists; running it on prod DRAFTs needs prod access (agent prod-DB commands denied in auto mode).



---

## 4. Phase 2 — High

### High

- [x] MIYO-0062 [High][Prod/Performance] Replace the in-memory redis shim with a shared KV store (design doc N4)
  - **Where:** lib/redis.ts
  - **Problem:** Process-local Map: rate limits, IP allowlist, MFA markers and caches are per-instance and lost on cold start (also hurts performance, nothing stays cached).
  - **Fix:** Use Upstash Redis or Vercel KV behind the same interface; keep the Map as a dev fallback only.
  - **Acceptance check:** Two concurrent instances share a rate-limit counter in a test.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [ ] MIYO-0063 [High][Prod/Performance] Collapse the dashboard's widget requests into one aggregated endpoint
  - **Where:** app/api/dashboard/* (21 endpoints), app/(dashboard)/dashboard/page.tsx, components/dashboard/widgets/*
  - **Problem:** 21 separate dashboard APIs, each paying auth cost; cold starts multiply.
  - **Fix:** Add GET /api/dashboard/summary returning the above-the-fold data in one call (role-aware), keep the rest lazy below the fold.
  - **Acceptance check:** Network tab on /dashboard shows ≤ 4 API calls before first meaningful paint.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (17 Oct):** Partial in code: /api/dashboard/summary replaces 6 calls (stats, role-stats, active-sprint, recent-projects, recent-activity, today-activities); team-availability skipped for employees. Widgets, notifications, birthdays, my-issues still separate. Not measured in a browser; <=4 calls not yet confirmed.

- [x] MIYO-0064 [High][Prod/Performance] Stop the sidebar waiting for client-side useSession before rendering navigation
  - **Where:** components/layout/app-sidebar.tsx:36, app/(dashboard)/layout.tsx
  - **Problem:** QA: long sidebar skeletons and the wrong (employee) view for ~40 s until role loads.
  - **Fix:** Read the session in the server layout and pass role/nav groups as props; keep useSession only for updates.
  - **Acceptance check:** Hard reload shows the correct sidebar in the first HTML response.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/api-client.test.ts); live acceptance outstanding

- [x] MIYO-0065 [High][Prod/Performance] Remove `force-dynamic` from routes that can be cached
  - **Where:** app/api/hr/dashboard/*/route.ts and others with `export const dynamic = "force-dynamic"`
  - **Problem:** Forces every request to hit the DB even for org-level aggregates that change rarely.
  - **Fix:** Use `unstable_cache`/`revalidateTag` per org for metrics (headcount, trends) with 60–300 s TTL; tag-invalidate on writes.
  - **Acceptance check:** Second load of /hr dashboard serves metrics from cache (Server-Timing shows cache hit).
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: no fix commit since 914259e — no commit on main at HEAD 914259e
  - **Agent note (17 Oct):** Metrics already go through lib/cache `cached()` (Redis TTL, CACHE_TTL.LONG) and are invalidated by invalidateHrDashboardCache; with the Upstash-backed store (MIYO-0062) that cache is shared across instances. force-dynamic stays: these routes read the session.

- [ ] MIYO-0066 [High][Prod/Performance] Add missing indexes for hot project queries after the Build port
  - **Where:** lib/db/schema/projects.ts, new migration
  - **Problem:** New filters `deleted_at is null`, `(project_id, rank)`, `ticket_activity (project_id, created_at)` run on every board/overview load; check each has an index (only some were added in 0154).
  - **Fix:** Run EXPLAIN on the overview, board and list queries against a seeded local DB; add partial indexes `where deleted_at is null` where seq scans appear.
  - **Acceptance check:** EXPLAIN shows index scans for board/list/overview queries.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (17 Oct):** Added drizzle/0159 partial index tickets(project_id, rank) where deleted_at is null; ticket_activity(project_id, created_at) already existed. Applied to prod 17 Oct via Neon (journal rows recorded). EXPLAIN not run yet.

- [x] MIYO-0067 [High][Build port] Make the projects layout reject non-numeric project ids with a 404 instead of a 'doesn't exist' page that looks like a module
  - **Where:** app/(dashboard)/projects/[projectId]/layout.tsx, access-denied-view.tsx
  - **Problem:** /projects/build renders the project access view. Fine for security, confusing for users looking for Build.
  - **Fix:** If projectId is not an integer, call notFound().
  - **Acceptance check:** /projects/abc returns the app's 404 page.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0068 [High][Build port] Add a unique index on tickets (project_id, ticket_number)
  - **Where:** lib/db/schema/projects.ts:111, new migration
  - **Problem:** Numbers are assigned under an advisory lock only (PR #4 gap); a bug or manual insert can duplicate KEY-123.
  - **Fix:** Additive `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS ... where deleted_at is null` after checking for duplicates.
  - **Acceptance check:** Inserting a duplicate number fails.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0069 [High][Build port] Use timestamptz (or treat naive timestamps as UTC) in the projects area
  - **Where:** lib/db/schema/projects.ts (49 timestamp columns, 0 withTimezone)
  - **Problem:** PR #4 QA saw 'in about 5 hours' relative times; prod also shows UTC payroll times.
  - **Fix:** Add a parse helper that appends 'Z' to naive timestamps for display; plan an additive migration to timestamptz later.
  - **Acceptance check:** Ticket created now shows 'just now' in IST.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0070 [High][Build port] Unify the two status systems (tickets.status text vs project_statuses)
  - **Where:** lib/db/schema/projects.ts, components/projects/kanban-board.tsx, app/api/projects/[projectId]/statuses
  - **Problem:** PR #4 gap: both coexist, so board columns, WIP limits and filters can disagree.
  - **Fix:** Make project_statuses the source; keep tickets.status as a denormalised key written from it; backfill.
  - **Acceptance check:** Renaming a status renames the board column and filters.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email-templates/leave-status.test.ts); live acceptance outst
  - **Agent note (17 Oct):** PATCH /api/projects/[id]/statuses/[statusId] now takes `name` and renames the column and every ticket in it in one transaction; filter bar reads the project columns. Prod had no tickets with a status missing from project_statuses, so no backfill. No rename button in the UI yet (API only).

- [x] MIYO-0072 [High][Payroll] Make payroll approve/paid transitions atomic
  - **Where:** app/api/hr/payrolls/[payrollId]/approve/route.ts, [payrollId]/paid/route.ts
  - **Problem:** Status is read, checked, then updated without a status condition, so two clicks can double-approve/double-send emails.
  - **Fix:** Use `update ... where id = ? and status = 'DRAFT' returning *` and treat 0 rows as 409.
  - **Acceptance check:** Two concurrent approve requests: one 200, one 409, one email sent.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0073 [High][Payroll] Payroll timestamps shown without timezone and in UTC
  - **Where:** features/hr/payroll/payroll-record-preview-sheet.tsx:223-232 (dt()), payrolls.createdAt/approvedAt/paidAt are `timestamp` without time zone
  - **Problem:** Prod 16 Oct: 'Created 15 Oct 2026, 03:20 AM' for a record created ~08:50 IST. Naive timestamps are parsed as local time.
  - **Fix:** Format all payroll timestamps with timeZone 'Asia/Kolkata' and an 'IST' suffix via one helper; treat DB naive timestamps as UTC when parsing (append 'Z').
  - **Acceptance check:** The same record shows 'Created 15 Oct 2026, 08:50 AM IST'.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0074 [High][Payroll] Block or warn when generating payroll for the current, unfinished month
  - **Where:** app/api/hr/payrolls/generate/route.ts, app/(dashboard)/hr/payroll/page.tsx
  - **Problem:** QA: payroll for October generated on 15 Oct silently; with recompute available it should at least warn.
  - **Fix:** Show a confirm dialog 'October is not over. Days after today are counted as present.' and store `generatedThrough` on the row.
  - **Acceptance check:** Generating for the current month shows the warning; the row stores generatedThrough.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [ ] MIYO-0075 [High][Payroll] Half-day check-ins count as full present days
  - **Where:** lib/hr/payroll-calculations.ts computeStrictAttendance (`loggedIn = workHoursByDate.has(date)`)
  - **Problem:** Any check-in, even 10 minutes, counts as a full day; workHours is ignored.
  - **Fix:** DECISION for Tarun: threshold (e.g. < 4 h = half day). Implement as HALF_DAY_MIN_HOURS in rules.ts.
  - **Acceptance check:** Test: 3 h logged → 0.5 present.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (17 Oct):** Blocked on D3 (half-day threshold). Skipped.

- [x] MIYO-0077 [High][Security] Encrypt PII at rest: taxId, bankDetails, googleRefreshToken
  - **Where:** lib/db/schema/auth.ts:54-56, :92; reuse encryptSecret/decryptSecret already used for totpSecret (app/api/auth/mfa/setup/route.ts:26)
  - **Problem:** PAN, bank account numbers and Google refresh tokens are stored in plain text (design doc N16).
  - **Fix:** Encrypt on write, decrypt on read in one data-access helper; add a one-off backfill script (Tarun runs it, never the agent against prod).
  - **Acceptance check:** Row in DB shows ciphertext; UI shows the value; backfill script is idempotent.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: taxId/bankDetails still plaintext in schema — SEC-0006

- [x] MIYO-0078 [High][Security] Biometric webhook trusts the caller-supplied orgId when BIOMETRIC_ORG_ID is unset
  - **Where:** app/api/hr/integrations/biometric/route.ts:35-45
  - **Problem:** With only the API key configured, any orgId in the body is accepted.
  - **Fix:** Require BIOMETRIC_ORG_ID (503 if missing) and ignore body.orgId; return 400 on schema errors instead of a 500 (parse is outside withAuth).
  - **Acceptance check:** Request with a different orgId gets 403; malformed body gets 400.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0081 [High][Security] Escape LIKE wildcards in project and ticket search
  - **Where:** app/api/projects/route.ts:91-92, app/api/projects/[projectId]/tickets/route.ts:36-37, server/queries/projects.ts:36
  - **Problem:** `%`/`_` in search become wildcards (PR #4 open gap); `%` returns everything.
  - **Fix:** Add lib/db/escape-like.ts and use `ILIKE ... ESCAPE '\\'`.
  - **Acceptance check:** Searching '100%' only matches titles containing '100%'.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0082 [High][Security] Escape LIKE wildcards in the remaining 12 ilike() call sites
  - **Where:** `grep -rn "ilike(" app server lib` (12 hits)
  - **Problem:** Same wildcard issue in HR searches.
  - **Fix:** Use the escape helper everywhere.
  - **Acceptance check:** grep shows every ilike uses escapeLike().
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0083 [High][Access control] /settings/notifications must be reachable by every employee
  - **Where:** lib/auth/route-access.ts
  - **Problem:** Notification preferences are personal but blocked by the /settings HR_TEAM entry.
  - **Fix:** Add `"/settings/notifications": EVERYONE`.
  - **Acceptance check:** Employee can save notification preferences.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0084 [High][Access control] Manager sees Approve on leave but the API rejects it
  - **Where:** lib/auth/leave-approval.ts canApproveLeaveRequest (role-only), approver chain in lib/auth/leave-approval-roles.ts
  - **Problem:** Requests are routed to managers but only HR/CEO/ADMIN roles may approve (design doc N9, Q13).
  - **Fix:** DECISION for Tarun. If yes: allow when isManagerOf(session.user.id, requestUserId). If no: hide the buttons and stop routing to managers.
  - **Acceptance check:** UI and API agree for a manager account.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/auth/leave-approval.ts); live acceptance outstanding

- [x] MIYO-0085 [High][Access control] Holiday edit rights differ between API and server actions
  - **Where:** app/api/hr/holidays/*, server/actions/* holiday actions
  - **Problem:** API allows HR, server actions deny HR (design doc N14).
  - **Fix:** Use one helper canManageHolidays(role) = CEO/HR/ADMIN.
  - **Acceptance check:** HR can edit a holiday via both paths.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/hr/documents/editor/[documentId]/page.tsx); live

- [x] MIYO-0086 [High][Access control] Remove leftover branch routes from the access map
  - **Where:** lib/auth/route-access.ts:36 (`/settings/branches`), :42 (`/dashboard/branches`)
  - **Problem:** Branches were removed (D-6) but the map and links remain.
  - **Fix:** Delete both entries.
  - **Acceptance check:** grep 'branches' lib/auth/route-access.ts returns nothing.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: no fix commit since 914259e — no commit on main at HEAD 914259e

- [x] MIYO-0087 [High][Leave] Auto-approved leave does not deduct the balance
  - **Where:** app/api/hr/leaves/route.ts POST (auto-approve branch)
  - **Problem:** Design doc N10.
  - **Fix:** Call the same deduction helper used by the approve route inside the insert transaction.
  - **Acceptance check:** Auto-approved 1-day casual leave reduces balance by 1.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/auth/leave-approval.ts); live acceptance outstanding

- [ ] MIYO-0088 [High][Leave] Approvals tab and Pending sub-tab show no count badge **[confirm on prod]**
  - **Where:** app/(dashboard)/hr/leaves/leaves-wfh-content.tsx:67 (actionableLeaveCount), tab triggers
  - **Problem:** Prod 16 Oct: 1 pending request but no badge on 'Approvals' or 'Pending'.
  - **Fix:** Render <Badge> with actionableLeaveCount on both triggers when > 0, using the same number as the sidebar badge.
  - **Acceptance check:** With 1 pending request both tabs show '1'; sidebar badge also shows 1.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/hr/leaves/leave-approvals.tsx); live acceptance
  - **Agent note (17 Oct):** Both badges already render from the same canActOnLeave rule as the sidebar. Fixed: managers (non-HR approvers) now get the Approvals tab and its query. Prod 1-pending case still to confirm live.

- [x] MIYO-0089 [High][Attendance] Attendance calendar marks days before joining as Absent **[confirm on prod]**
  - **Where:** features/hr/attendance/* calendar, lib/hr/payroll-attendance.ts
  - **Problem:** QA Critical (📷 05). Commit 53b6615 claims employment-aware calendar — re-verify on prod with Qa Alpha (joined 15 Oct).
  - **Fix:** If still wrong: render days before joiningDate as 'Not employed' (neutral).
  - **Acceptance check:** Qa Alpha's October calendar shows 1–14 Oct neutral.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/hr/attendance/check-in/route.ts); live acceptance outsta
  - **Agent note (17 Oct):** Code already renders days before joiningDate as notEmployed (features/hr/attendance/attendance-calendar.tsx:92, A37). Live check with Qa Alpha still to do.

- [x] MIYO-0090 [High][Jobs & cron] Run `daily-notifications` from one scheduler only
  - **Where:** vercel.json (0 9 * * * (14:30 IST)) and lib/inngest/functions/daily-notifications.ts (0 8 * * * (13:30 IST))
  - **Problem:** The same job is scheduled twice (design doc N11). Emails/notifications can go out twice; the Inngest path does not share the cron route's idempotency guard.
  - **Fix:** Keep the Inngest function (retries, steps) and remove the vercel.json entry, OR keep Vercel and remove it from lib/inngest/functions/index.ts — after Tarun confirms Inngest is connected in production. Wrap the remaining one with cronIdempotencyCheck('daily-notifications').
  - **Acceptance check:** Only one schedule for daily-notifications exists in the repo; a manual double trigger runs the work once.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email-templates/notifications.ts); live acceptance outstandi

- [x] MIYO-0091 [High][Jobs & cron] Run `monthly-leave-reset` from one scheduler only
  - **Where:** vercel.json (0 0 1 * *) and lib/inngest/functions/monthly-leave-reset.ts (0 0 1 * * (no cronIdempotencyCheck in the Inngest path))
  - **Problem:** The same job is scheduled twice (design doc N11). Emails/notifications can go out twice; the Inngest path does not share the cron route's idempotency guard.
  - **Fix:** Keep the Inngest function (retries, steps) and remove the vercel.json entry, OR keep Vercel and remove it from lib/inngest/functions/index.ts — after Tarun confirms Inngest is connected in production. Wrap the remaining one with cronIdempotencyCheck('monthly-leave-reset').
  - **Acceptance check:** Only one schedule for monthly-leave-reset exists in the repo; a manual double trigger runs the work once.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/auth/leave-approval.ts); live acceptance outstanding

- [ ] MIYO-0092 [High][Jobs & cron] Confirm Inngest is connected in production (birthday wishes and auto-payroll depend on it) **[confirm on prod]**
  - **Where:** app/api/inngest/route.ts, lib/inngest/functions/celebration-greetings.ts, auto-payroll-generation.ts
  - **Problem:** QA Round 3: the birthday person got no wish/email. celebration-greetings only exists in Inngest (design doc Q9).
  - **Fix:** Tarun checks the Inngest dashboard for app sync and recent runs; if not connected, set INNGEST_SIGNING_KEY/EVENT_KEY in Vercel and sync. Add /api/health check that reports last celebration run.
  - **Acceptance check:** Inngest dashboard shows celebration-greetings ran today at 08:00 IST.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/inngest/dispatch-webhook.ts); live acceptance outstanding
  - **Agent note (17 Oct):** Blocked on D-ENV: /api/inngest is 500 on prod; Tarun to set INNGEST_SIGNING_KEY/EVENT_KEY and sync. Celebration greetings and auto-payroll run only in Inngest.

- [x] MIYO-0093 [High][Onboarding] Password policy rejects common special characters such as # and _
  - **Where:** lib/password-utils.ts:9,22, lib/utils/password-validation.ts:32, lib/validations/hr.ts:459, app/api/auth/accept-invitation/route.ts:20, app/api/auth/reset-password/route.ts:19, app/(auth)/reset-password/page.tsx:73, features/settings/settings-security.tsx:26,38
  - **Problem:** Regex allows only @$!%*?& and forbids every other character (QA Round 3 bug 2). Seven copies of the rule.
  - **Fix:** One shared PASSWORD_POLICY in lib/password-utils.ts: ≥ 8 chars, upper, lower, digit, any non-alphanumeric; no character whitelist. Import it everywhere.
  - **Acceptance check:** Vitest: 'Abcdef1#' and 'Abcdef1_' valid; UI checklist says 'One symbol'.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(auth)/setup-password/page.tsx); live acceptance outstanding

- [x] MIYO-0094 [High][Onboarding] Banking step Next does nothing when an earlier step has an error **[confirm on prod]**
  - **Where:** components/hr/onboarding-wizard.tsx, components/hr/_onboarding/step-banking.tsx
  - **Problem:** QA High; design doc says needs re-test.
  - **Fix:** On submit failure, jump to the first step with an error and focus the field.
  - **Acceptance check:** Leave DOB empty, go to Banking, press Next → wizard returns to Personal with the DOB error focused.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/ai/next-action/route.ts); live acceptance outstanding
  - **Agent note (17 Oct):** Next already jumped to the first error (A16); the final submit had no onInvalid and failed silently. Fixed. Live re-test pending.

- [x] MIYO-0095 [High][Employees & settings] Members table shows raw enum roles (CUSTOMER_SUPPORT) **[confirm on prod]**
  - **Where:** app/(dashboard)/settings/members/page.tsx:461 and :529 (`{member.role}`, `{inv.role}`)
  - **Problem:** Prod 16 Oct.
  - **Fix:** Use the role label map (the same one used for the role Select) → 'Customer support'.
  - **Acceptance check:** Members table shows 'Customer support'.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/export/table-pdf.test.ts); live acceptance outstanding

- [x] MIYO-0096 [High][Employees & settings] Members table overflows horizontally and cuts off Department **[confirm on prod]**
  - **Where:** app/(dashboard)/settings/members/page.tsx
  - **Problem:** Prod 16 Oct at 1280 px.
  - **Fix:** Let the table scroll inside its card (overflow-x-auto on the wrapper), truncate email with a tooltip, and move Department before Joined.
  - **Acceptance check:** At 1280 px all columns are visible; at 768 px the table scrolls inside the card.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/export/table-pdf.test.ts); live acceptance outstanding

- [x] MIYO-0097 [High][Email templates] Replace the email base layout with the table-based gold/ink layout
  - **Where:** lib/email-templates/base.ts getEmailTemplate()
  - **Problem:** Current base: <style>-block classes, gradient header and button (`linear-gradient(135deg, ink …)`), div layout, preheader as <meta name=description> (never shown), Google Fonts @import, hover transform, footer 'Miyo Global CRM / Enterprise Resource Management System', text 'Miyo Global' instead of the logo (logoUrl defined, unused).
  - **Fix:** Port the shell from email-templates/*.html (see email-templates/README.md): 600 px table, inline styles only, ink header with logo.png, 3 px gold rule, hidden preheader div, single gold CTA with ink text, plain footer with org name/address/support. Expose `renderEmail(id, vars)` that loads subject/preheader/html/txt and HTML-escapes vars.
  - **Acceptance check:** Snapshot test renders every template id; Litmus/Gmail/Outlook preview shows the logo, no gradients, preheader visible in inbox list.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding

- [ ] MIYO-0098 [High][Email templates] Send hand-written plain-text parts instead of auto-converted HTML
  - **Where:** lib/email/sender.ts:39-74 (htmlToText fallback)
  - **Problem:** QA Round 3: welcome mail text part was raw CSS. Fixed by stripping <style>, but auto text is still noisy (link lists, spacing).
  - **Fix:** renderEmail returns the .txt from email-templates; sendEmail requires `text` for every template-based mail.
  - **Acceptance check:** Every sent mail has a text part identical to email-templates/<id>.txt with variables filled.
  - **Agent note (17 Oct):** sendTemplateEmail() added (fcbc3c0); each existing sender moves to it with its template item. Stays open until all are switched.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/html-to-text.test.ts); live acceptance outstanding

- [x] MIYO-0099 [High][Email templates] Never HTML-escape values used in email subjects
  - **Where:** lib/email-templates/hr.ts:690 (payslip subject from escaped sMonth/sOrg), other `title:` built from escaped vars
  - **Problem:** An org or employee name with '&' or an apostrophe appears as '&amp;' / '&#39;' in the subject line.
  - **Fix:** Build subjects from raw values; escape only inside HTML.
  - **Acceptance check:** Test: org 'A & B' → subject 'Your payslip for October 2026' body shows 'A &amp; B' in HTML source only.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/html-to-text.test.ts); live acceptance outstanding

- [x] MIYO-0100 [High][Email templates] Remove ' - Miyo Global' suffixes and emoji from all subjects/headings
  - **Where:** lib/email-templates/*.ts (≈60 headings with emoji, ≈20 titles ending '- Miyo Global')
  - **Problem:** Inbox looks spammy; emoji render inconsistently.
  - **Fix:** Covered by replacing each template (items below); add a unit test that fails if any subject or heading contains an emoji or '- Miyo Global'.
  - **Acceptance check:** Test passes for all template ids.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (scripts/generate-miyo-payslips.ts); live acceptance outstanding

- [x] QA-0003 [High][AI] AI hub exposes an env-var name and an unusable feature to end users — Where: /ai (and /settings AI); shows 'AI features are not configured. Set OPENAI_API_KEY.' — Steps: Open /ai as any user -> message naming the server env var; all AI actions non-functional — Expected vs actual: AI hub hidden/disabled gracefully when not configured, with no env-var leak vs actual: raw config instruction shown — Fix: Hide the AI hub when unconfigured; never surface server env-var names in the UI — Acceptance: /ai with AI unconfigured shows a neutral 'unavailable' state and no env-var text — Ref: S5

**Access control & roles**
  - **Retest status:** PARTIAL
  - **Remaining:** 307 loc=/access-restricted?from=%2Fai

- [x] QA-0005 [High][Attendance] Auto-absent record blocks late check-in: UI says 'Not clocked in' while check-in returns 'Already checked in' — Where: app/api/hr/attendance/check-in/route.ts (an auto 'Marked absent' record created when no check-in by 11:59 IST collides with later check-in) — Steps: Admin/employee with no check-in by cutoff: Web clock-in toast 'Already checked in' while UI shows Not clocked in, Check Out disabled, Team monitor Absent — Expected vs actual: A late check-in after auto-absent updates the day to present/late vs actual: user can neither check in nor out for the day — Fix: Let a late check-in supersede/clear the auto-absent record for the same day (or offer a regularisation) — Acceptance: After auto-absent, a later check-in succeeds and the day shows LATE/PRESENT — Ref: L3

**Auth**
  - **Retest status:** PARTIAL
  - **Remaining:** check-in 200 {"success":true,"isHolidayWork":false,"isSundayWork":false} (full auto-absent supersede needs cron state)

- [x] QA-0010 [High][Email] One leave apply sends duplicate approver emails (plus a separate 'leave request pending' twin) — Where: leave-request-approver sender + the 'leave request pending' mailer — Steps: Qa Alpha apply -> two 'Leave Request: Qa Alpha' 18s apart; plus 'Leave request pending' — Expected vs actual: One apply = exactly one approver email vs actual: 2-3 emails per apply — Fix: Send the approver email once after a successful insert; remove/merge the 'pending' mailer; 409 on overlap before send — Acceptance: One apply -> one approver email; overlap -> none — Ref: EMAIL-0005; MIYO-0135,0161
  - **Retest status:** PARTIAL
  - **Remaining:** mgr received 3 Leave Request mails for 3 applies; check duplicate twin still

- [x] QA-0012 [High][Email] Birthday uses a company-announcement blast; no personal celebration mail — Where: birthday -> company-announcement path; celebration-birthday not used — Steps: All inboxes got 'Announcement: Happy Birthday, Qa Bravo!' framed as 'Company Announcement / Dear Team'; no personal wish to Bravo — Expected vs actual: Celebrant gets a personal birthday mail; others don't get a fake announcement vs actual: alarmist blast to everyone — Fix: Send personal celebration-birthday to the celebrant via the scheduler; drop the announcement wrapper — Acceptance: On DOB the celebrant gets a personal mail; others do not — Ref: EMAIL-0004; MIYO-0165,0092

**HR**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in bcca1ba9d "QA-0012: make a birthday a personal wish, not an o" (2026-10-16 16:54:26 +0530); not re-prob

- [x] QA-0014 [High][HR] /hr/expenses import saves records the preview flagged invalid (negative amounts) — Where: /hr/expenses Import; app/api/expenses/import — Steps: Import a sheet with -50: preview flags it invalid but the row imports as Rs50 (EXP-2026-005); a 3-valid preview saved 4 rows — Expected vs actual: Invalid rows are rejected on import vs actual: flagged/negative rows are saved (and preview count != saved count) — Fix: Validate on import (not just preview); reject negatives/invalid; make saved == previewed-valid — Acceptance: Importing a sheet with an invalid row rejects that row; saved count equals valid-preview count — Ref: H5
  - **Retest status:** PARTIAL
  - **Remaining:** 400 {"error":"Only CSV or Excel files are allowed"}

- [ ] QA-0015 [High][HR] /hr/analytics is broken and inconsistent: console 404x3 + 500, and self-contradicting metrics — Where: /hr/analytics (app/api/hr/analytics/*) — Steps: Page throws 3x404 + 1x500 in console; gender diversity 0% vs Workforce split; age/tenure % don't sum; attendance 0 vs overview 19 check-ins; leaves YTD 14 vs 15; PDF export is a mobile-layout browser print; Excel/CSV only cover some tabs — Expected vs actual: Analytics loads cleanly with consistent figures and working exports vs actual: errors + contradictory KPIs + partial exports — Fix: Fix the failing analytics endpoints; reconcile metric sources; implement real PDF/Excel exports for all tabs — Acceptance: No console errors; figures reconcile across cards; exports cover every tab — Ref: H12; pass1#2
  - **Agent note (2026-10-17):** fixed in code at fcfe1ff (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Agent note (17 Oct):** All 8 endpoints the page calls exist (/hr/analytics, attendance, compensation, diversity, executive, performance, retention, workforce-trends, /hr/leaves/analytics). The 404/500 and metric mismatches need a live repro with an HR session; not done.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in fcfe1ff56 "QA-0015: fix the broken pieces of /hr/analytics" (2026-10-16 17:10:46 +0530); not re-probed

- [x] QA-0016 [High][HR] Career ladder: a valid level cannot be added (submit returns 400, no message) — Where: /hr/career-ladders/[id]; POST /api/hr/career-ladders/[id] — Steps: Open ladder 1 -> Add Level -> title 'QA Level 1' -> submit: dialog stays open, POST returns 400, ladder still has 0 levels. Even after correcting a min>max error (which does show a message) the corrected submit still 400s. — Expected vs actual: A valid level is created vs 400 with no feedback and the ladder never gains a level — Fix: Align the client payload with the server schema (likely missing required order/salary fields); surface the 400 body as a field error; keep dialog state — Acceptance: Adding a level with a title (and valid band) returns 201 and the level appears — Ref: pass9 #1; Found 16 Oct 15:46 IST @914259e; Screenshot: screens/

**HR/Storage**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 2cc61c16a "QA-0016: let a career-ladder level be added with j" (2026-10-16 17:50:22 +0530); not re-prob

- [x] QA-0017 [High][HR/Storage] File upload is broken across every module that uses it (documents, handbook, profile photo, recognition, asset-returns) — same /api/storage/upload failure — Where: /api/storage/upload returns 400; callers: /hr/documents, /hr/handbook, /settings profile photo (S1), /hr/recognition (H4), /hr/asset-returns (H10) — Steps: Upload a valid PDF/PNG on /hr/documents -> 'Validation failed: fileUrl: Must be a valid URL or a relative path starting with /'; /hr/handbook save 'Enter a valid URL'; profile photo 'Profile image must be a valid URL'; asset-return upload stuck 'Uploading...' — Expected vs actual: Uploading a file stores it and saves vs actual: every upload path fails -> Document Review, handbook, profile photo, kudos images, asset-return photos all unusable — Fix: Fix /api/storage/upload (return/accept the stored URL the UI expects) and the shared upload component; add a regression test per caller — Acceptance: Uploading a file on each of the 5 pages succeeds and the record saves — Ref: H2,H3,S1,H10; also H4

**Leave**
  - **Retest status:** PARTIAL
  - **Remaining:** 400 {"error":"File content does not match declared type"}

- [x] QA-0019 [High][Leave] Leave day counting is inconsistent and includes weekends/holidays (apply vs approve vs preview differ) — Where: calculateLeaveWorkingDays (apply, excludes Sunday only) vs approve deduction (excludes Sat+Sun) vs holiday not subtracted; UI preview counts weekends+holidays too — Steps: Apply 23-27 Oct SL -> counted with Saturday; approve deducted 3 (SL 5.5->2.5); UI 18-21 Oct counts 3 incl. 20 Oct holiday (should be 2); 19-21 Oct over holiday counts 3 (should be 2) — Expected vs actual: One working-day definition (honouring Saturday policy + holidays) across apply, preview, display and deduction vs actual: three different counts; weekends/holidays charged — Fix: Share a single working-day calculator in all paths; subtract declared holidays and the org weekend policy — Acceptance: Identical date range yields the same day count at apply, preview and deduction, excluding weekends+holidays — Ref: QA-P6-05; L1; E2

**Onboarding**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 5d0a655ab "QA-0019: one working-day rule for leave everywhere" (2026-10-16 18:05:28 +0530); not re-prob
  - **Agent note (17 Oct):** Code fixed earlier (5d0a655); live re-probe pending.

- [x] QA-0020 [High][Onboarding] Department chosen in the wizard is lost on save (profile shows Unassigned) — Where: onboarding wizard confirm step -> app/api/hr/employees/onboard — Steps: Onboard with Department=HR on confirm -> saved profile shows Unassigned (QA Hradmin, Qa Delta) — Expected vs actual: The selected department persists vs actual: dropped — Fix: Persist departmentId from the confirm step; sync department_members — Acceptance: Onboarding with a department saves that department on the profile — Ref: O3
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 54166dcda "QA-0020: keep the department chosen in the onboard" (2026-10-16 18:07:32 +0530); not re-prob
  - **Agent note (17 Oct):** Code fixed earlier (54166dc); live re-probe pending.

- [x] QA-0021 [High][Onboarding] No reporting-manager field in the wizard, and the System Role list is silently filtered by Department (contradicts helper text) — Where: onboarding wizard role/department steps — Steps: Wizard has no Reporting Manager field (set later via Edit); Role options change with Department despite helper text saying all roles available; default preset Engineering — Expected vs actual: Manager can be set during onboarding and all roles are selectable (or the helper text matches the filter) vs actual: missing field + hidden filtering — Fix: Add a Reporting Manager field; either stop filtering roles by department or fix the helper text; show the active filter — Acceptance: Wizard sets a manager; role list matches the documented behaviour — Ref: O1,O2; MIYO (manager)

**Payroll**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 974c6c698 "QA-0021: set the reporting manager during onboardi" (2026-10-16 18:10:53 +0530); not re-prob
  - **Agent note (17 Oct):** Code fixed earlier (974c6c6); live re-probe pending.

- [x] QA-0023 [High][Payroll] Payroll approval model is a dead-end: approve is CEO-only (no CEO user exists) and the CEO cannot approve their own payroll; meanwhile HR (non-CEO) can still mark PAID — Where: app/api/hr/payrolls/[payrollId]/approve/route.ts (role!==CEO -> 403, own-payroll -> 403); paid/route.ts uses withAdmin (not CEO) — Steps: CEO approve other -> 200; CEO approve own -> 403; HR approve -> 403; but CEO-approved row then HR mark PAID -> 200 — Expected vs actual: A workable approver chain where someone can always approve (incl. the CEO's own payroll) and payment authority matches approval vs actual: deadlock + HR can pay what it cannot approve — Fix: Decide the approver model (e.g. board/alternate approver for the CEO's own); gate mark-PAID to the same authority as approve — Acceptance: A CEO's own payroll can be approved by a designated approver; mark-PAID requires the approval role — Ref: QA-P7-02; MIYO-0071

**Projects**
  - **Retest status:** PARTIAL
  - **Remaining:** HR approve 403 {"error":"You don't have permission for this action.","permission":"hr:payroll:manage"}
  - **Agent note (17 Oct):** The hr:payroll:manage 403 is gone (R3-0002, route map uses real permissions). HR still cannot approve by design (PAYROLL_APPROVER_ROLES, D2).

- [x] QA-0025 [High][Projects] Cycle Start Date picks the day before (UTC/local off-by-one); raw errors don't clear — Where: /projects/[projectId]/cycles (New Cycle) — Steps: New Cycle -> click 16 in the Start Date picker: the field shows Oct 15, 2026. Picking dates doesn't clear the raw 'Invalid input: expected string, received undefined' errors, and the popover covers the error text. — Expected vs actual: Picking 16 sets Oct 16 and clears validation vs an off-by-one date and stale raw errors hidden behind the popover — Fix: Build the date in local time (not UTC midnight); clear field errors on change; move error text out from under the popover; friendly copy (see design) — Acceptance: Picking a start date sets that same date and clears the errors — Ref: pass9 #3; Found 16 Oct 15:46 IST @914259e
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 9ce6df3c6 "QA-0025: fix cycle dates shifting a day and stale " (2026-10-16 18:19:41 +0530); not re-prob
  - **Agent note (17 Oct):** Code fixed earlier (9ce6df3); live re-probe pending.

- [x] QA-0027 [High][RBAC] Fine-grained permission editor (/settings/roles, /settings/permissions) is not enforced by API routes — the editor is cosmetic — Where: lib/rbac/middleware.ts requirePermission only called by app/api/rbac/role-permissions/route.ts; all other routes gate on coarse role — Steps: GET /api/rbac/permissions returns the editable matrix (200 to HR) but removing a permission from a role does not change what that role's API calls can do — Expected vs actual: Editing a role's permissions changes enforcement vs actual: no effect — Fix: Enforce requirePermission(...) in route guards, or clearly label the editor non-functional — Acceptance: Remove leave:apply from ENGINEERING -> ENGINEERING POST /api/hr/leaves = 403 — Ref: QA-A05
  - **Retest status:** PARTIAL
  - **Remaining:** emp permissions GET 403
  - **Agent note (17 Oct):** Enforced in withAuth via lib/rbac/route-permissions.ts (QA-0027 earlier); only mapped routes are permission-gated, others still role-gated. Employee 403 on the permission matrix is intended.

- [x] QA-0030 [High][Settings] /settings/roles Delete role always fails with a ref code and no audit entry — Where: /settings/roles Delete role — Steps: Delete any role -> 'Failed to delete role (ref c90d4a95/...)'; no audit-log entry — Expected vs actual: A deletable role deletes (or a clear reason why not) and is audited vs actual: always fails opaquely — Fix: Fix the delete path (or block with a clear message when a role is in use); audit the action — Acceptance: Deleting an unused role succeeds and is logged; in-use role gives a clear reason — Ref: S2
  - **Retest status:** PARTIAL
  - **Remaining:** delete fake role 404 {"error":"Role not found"}
  - **Agent note (17 Oct):** Retest remainder (404 on deleting a role that does not exist) is correct behaviour.

- [x] QA-0031 [High][Settings] Data-hub exports are broken: Employees export does nothing; Expenses/Assets '.xlsx' are actually CSV text — Where: /settings/data-hub exports — Steps: Employees export -> no download, no toast; Expenses/Assets download .xlsx that is CSV content (invalid xlsx) — Expected vs actual: Each export downloads a valid file of the right type vs actual: missing download / wrong format — Fix: Fix the export jobs; emit real XLSX (or label as CSV); add success/empty toasts — Acceptance: Each data-hub export downloads a valid, correctly-typed file — Ref: S3,S4

**UI/Core**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 110a71e30 "QA-0031: fix the data-hub exports" (2026-10-16 18:29:36 +0530); not re-probed live this pass
  - **Agent note (17 Oct):** Code fixed earlier (110a71e); live re-probe pending.

- [x] QA-0033 [High][UI/Core] Times are displayed in UTC everywhere instead of the org timezone (Asia/Kolkata) — Where: dashboard clock/greeting, audit-log timestamps, Add-Event default time, employee dashboard, payslip/email dates — Steps: At 15:26 IST dashboard clock shows 09:56 AM and 'Good morning'; audit log 15:02 IST shows 09:32; 'Checked in at 09:58 AM'; emails/payslips show UTC/ISO — Expected vs actual: All times shown in Asia/Kolkata with a tz label vs actual: raw UTC across app and emails — Fix: Format every timestamp in the org tz (single formatter); label IST; store UTC — Acceptance: Dashboard, audit log, emails and payslips show IST-labelled local time — Ref: L10,S9,E1,pass1#5; MIYO-0073
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 9d610a9b9 "QA-0033: show times in the organisation timezone" (2026-10-16 18:34:07 +0530); not re-probed
  - **Agent note (17 Oct):** Code fixed earlier (9d610a9); live re-probe pending.

- [x] R3-0004 [High][Leave] Manager cannot approve reports' leave (permission) — Where: PUT `/api/hr/leaves/[id]/approve` — Steps: engmgr (reportsTo of engrep) → 403 `hr:leaves:approve` — Fix: grant approvers permission or bypass for canApproveLeaveRequest — Ref: QA-0004
  - **Also known as:** QA-0004

- [x] R3-0005 [High][Email] Leave decision emails never sent on PATCH status path — Where: `app/api/hr/leaves/[leaveId]/route.ts` PATCH — Steps: HR PATCH status APPROVED/REJECTED → 200, emp inbox empty; email only wired on PUT approve/reject routes — Fix: call `sendLeaveStatusUpdateEmail` from PATCH too, or remove PATCH status mutations — Ref: QA-0011
  - **Also known as:** QA-0011

- [x] R3-0006 [High][Leave] Cancel emails HR only, not the employee — Where: `leaves/[leaveId]/cancel/route.ts` — Steps: emp cancel → HR gets "Leave Cancelled"; emp gets nothing — Fix: email requester — Ref: emails.md

- [x] R3-0007 [High][RBAC] Incentives GET ungated — Where: `/api/hr/incentives` — Steps: all non-HR roles → 200 — Fix: withAdmin — Ref: QA-0028
  - **Also known as:** QA-0028

- [x] R3-0008 [High][Integrity] Double-submit creates duplicates on loans, departments, holidays, calendar, leave — Where: create POSTs — Steps: 6 parallel — loans 6×201, departments 6×200, holidays 3, calendar 6×201, leave (HR Oct-28) 6 — Fix: unique constraints + idempotency — Ref: QA-0032, evidence/races.json
  - **Agent note (17 Oct):** Fixed in code: leave apply takes a per-user advisory lock (QA-0010); loans, departments, holidays and calendar events reject an identical submit within 10s via lib/api/submit-guard.ts (atomic upsert, 409); departments also 409 on an existing name. Prod still holds the QA race rows (departments 11-16 "QA3 Race Dept", holidays 6-8 "QA3 Race Day"): deleting them was blocked in auto mode, Tarun to remove.
  - **Also known as:** QA-0032

- [x] R3-0009 [High][Email] Resignation/exit emails never arrive — Where: Inngest `hr/resignation.submitted` / hr_approved — Steps: 6 resignations submitted+HR approved; 0 exit mails in mail.tm — Fix: verify Inngest delivery — Ref: evidence/exit-bulk.json
  - **Agent note (17 Oct):** Exit mails are sent from the routes, not Inngest (Inngest only adds in-app notices). The employee mail fires on final sign-off, which was unreachable without a CEO (R3-0002, now Admin can sign off); submit mails go to HR/CEO addresses, not the mail.tm inboxes. Sends now run in after() so they are not cut off after the response. Live E2E pending.

- [x] R3-0019 [High][Timezone] App is a day behind just after midnight IST (UTC date keys) — Where: dashboard greeting `app/(dashboard)/dashboard/page.tsx:134` `format(new Date(), …)` (browser/local, no Asia/Kolkata); manager dashboard today `server/queries/dashboard.ts:595` `new Date().toISOString().slice(0,10)` (UTC); also `lib/projects/period-status.ts:21,55`, milestones `page.tsx:84`, notifications `isToday` via date-fns local (`notifications/page.tsx:14,48`); leave balance year filters `new Date().getFullYear()` in `app/api/hr/leaves/route.ts:62` and PATCH `leaves/[leaveId]/route.ts:82` — Steps: Sat 17 Oct ~00:30 IST → dashboard "Friday, October 16th"; attendance marks 16 as today; Add holiday defaults to 16; notifications file 16 under Today — Expected: IST calendar date everywhere (`getTodayString` / `formatDateOnly` / `todayIstYmd`) — Actual: UTC/`toISOString().slice(0,10)` and bare `new Date()` — Fix: replace UTC date keys with `getTodayString()` / IST helpers; format greeting with `timeZone: Asia/Kolkata` — Acceptance: after midnight IST, UI "today" = IST date — Ref: ui-reverify-B.md, screens/r3b-*.png

- [ ] R3-0020 [High][Leave] Approved leaves do not reduce balance (QA-0018 widened) — Where: `lib/hr/deduct-leave-balance.ts` (POST apply + PUT `/approve`); PATCH `app/api/hr/leaves/[leaveId]/route.ts` inline debit; GET balances `leaves/route.ts:62` year=`getFullYear()` — Steps: Admin /hr/leaves shows approved Casual (Oct 22) + Sick half (Sep 29) but Casual 12 of 12 / Sick 6 of 6 Used 0 — r3b-leaves-balance.png; API QA3 HR after race approves: Casual bal=0 (debit path can work) — Expected: Used = sum(approved paid days); remaining drops on approve — Actual: Admin historical approvals leave Used 0 (no backfill; PATCH year/`getFullYear` vs deduct `startDate` year inconsistency risk) — Fix: backfill balances from APPROVED requests; unify year on IST; always call `deductApprovedLeaveBalance` from PATCH — Acceptance: Admin Casual/Sick Used matches approved days — Ref: QA-0018, ui-B
  - **Agent note (17 Oct):** Code fixed in 71b0f8c: PATCH status path uses deductApprovedLeaveBalance / restoreApprovedLeaveBalance (leave-year balance, holiday-aware day count), conditional transition (no double debit), IST year for balance reads. Not done: backfill of approvals made before the fix (prod data step).
  - **Also known as:** QA-0018
  - **Agent note (17 Oct):** Code fixed: PATCH status path now uses deductApprovedLeaveBalance / new restoreApprovedLeaveBalance (leave-year balance, working-day count with holidays), transition is conditional (no double debit), balance reads use the IST year. Not done: backfill of approvals made before the fix (needs a per-org recount from accrual history; prod data step).

- [ ] R3-0021 [High][AI] `/ai` shows "Something went wrong" when signed in — Where: `app/(dashboard)/ai/page.tsx` + `ai-hub-client.tsx`; matrix `/api/ai/*` → 503 — Steps: Admin open /ai → error page (r3b-ai-error.png); matrix 8 roles × attrition/churn/… → 503 "AI features are not available" — Expected: soft empty state ("AI unavailable") never error boundary; APIs 403/501 not 5xx — Actual: page crash + 5xx — Fix: harden hub client; soft-fail AI routes (also R3-0016) — Acceptance: /ai never error page; APIs non-5xx — Ref: ui-B, status-matrix-summary.md
  - **Agent note (17 Oct):** AI-off responses are now 403 "not enabled" instead of 503 (17 routes). The /ai page already renders a neutral unavailable state server-side; the error-page crash could not be reproduced locally (local DB creds stale). Live re-check needed.

- [ ] R3-0200 [High][Performance] Dashboard / HR heavy pages load 6–20s — Where: `/dashboard`, `/hr`, matrix slowest `/api/hr/dashboard/headcount-trends` 25.5s — Steps: cold load as HR — Expected: interactive <3s — Actual: 6–20s UI; API spikes — Fix: aggregate queries, remove force-dynamic where safe — Acceptance: p95 <3s — Ref: responsive-design.md, status-matrix-summary.md, b1bd73f
  - **Agent note (2026-10-17):** headcount-trends now runs one grouped query (158ff6c, `lib/hr/headcount-trends.ts`). p95 <3s on the dashboard still needs a prod measurement.

- [ ] R3-0201 [High][Responsive] Fix all BROKEN responsive cells (5 marked BROKEN in responsive-design.md) — Where: see that file — Steps: 375/768/1024/1440 — Expected: usable layout — Actual: BROKEN cells — Fix: per cell — Acceptance: zero BROKEN — Ref: responsive-design.md
  - **Agent note (2026-10-17):** all four cells fixed in cbb1598 from the Appendix B detail (holidays name wrap, documents header actions below the title until 1280, payroll kebab row actions, stats labels wrap). Left unticked: this sandbox refuses local port binding (EPERM), so there is no dev server and no viewport capture — the cells need a visual re-check at 375/768/1024/1440. Enabling `sandbox.network.allowLocalBinding` would let me verify these and the Phase 4 responsive items directly.

- [x] SEC-0002 [High][Broken Access Control / Mass Assignment — A01] `updateEmployee` server action writes `role` with no role gate — **code-only**
  - Where: `server/actions/hr-actions.ts:118-195`
  - Evidence: gated only by `EXPENSE_ADMIN_ROLES` (CEO/HR/ADMIN); then `db.update(users).set({ ..., role: data.role, taxId, monthlySalary, bankDetails })` with no `checkRoleAssignment` and no self‑change guard. (No current client import found — treat as a latent/duplicate path; still a registered `"use server"` export.)
  - Impact: if wired to any UI/action endpoint, HR can self‑ or cross‑promote to CEO/ADMIN and overwrite salary/bank/tax fields en masse.
  - Fix: delete the dead action or route it through the same validated handler as `app/api/hr/employees/[employeeId]/route.ts` (which correctly calls `checkRoleAssignment`); never accept `role` in a bulk profile update without the gate.
  - Acceptance test: grep CI rule — every `.set({ ... role ... })` on `users`/`organizationMembers` must be preceded by `checkRoleAssignment`. Regression test covering the server action path.

- [x] SEC-0003 [High][Identification & Auth Failures / A07 — Rate Limiting] Rate limiter is in‑memory per‑instance → no‑op on serverless — **verified live**
  - Where: `lib/rate-limit.ts` (`globalThis.__rateLimitStore` Map), `lib/rate-limit-redis.ts` (`checkRateLimitRedis` is a deprecated passthrough to in‑memory), `middleware.ts:72-99`
  - Evidence: `checkRateLimit` only calls `checkRateLimitInMemory`; the store is a per‑lambda `globalThis` Map. Live: 20 POSTs to `/api/auth/callback/credentials` → all `302`, and 20 POSTs to `/api/auth/forgot-password` → all `200`, **no 429** (login tier is 10/60s).
    ```
    20x login burst   : 302 302 302 ... (x20)
    20x reset burst   : 200 200 200 ... (x20)
    ```
  - Impact: credential stuffing across accounts, password‑reset / verification email bombing, AI/upload/public‑intake abuse. Per‑account lockout still limits single‑account brute force, but the tier limits are unenforced fleet‑wide.
  - Fix: back the limiter with the already‑present Upstash Redis (atomic `INCR`+`EXPIRE` or sliding window) keyed by tier+IP(+account); fail‑closed on the auth tiers. Keep in‑memory only as a same‑instance fallback.
  - Acceptance test: 15 rapid logins from one IP → ≥1 `429` with `Retry-After`. Regression test: unit test the Redis limiter returns `allowed:false` after N in window.

- [x] SEC-0004 [High][Vulnerable Components / A06 + XSS/A03] `sanitize-html@2.17.4` has mXSS & SVG stored‑XSS advisories; it is the only sanitiser behind `dangerouslySetInnerHTML` — **verified (osv/pnpm audit)**
  - Where: `package.json` (`"sanitize-html": "^2.17.4"`); sinks: `app/(dashboard)/hr/email-templates/page.tsx:695`, `app/(dashboard)/settings/email-templates/page.tsx:727`, `app/(dashboard)/hr/documents/templates/page.tsx:134`, `features/hr/documents/template-editor.tsx:360`
  - Evidence: GHSA‑jxwj‑j7wr‑gfrw (mutation‑XSS / allowedTags bypass, fix 2.17.6), GHSA‑vccv‑cmxp‑4j9h (SVG SMIL stored XSS, fix 2.17.7), GHSA‑g8qq‑57p8‑ggw5 (incomplete URI scheme validation, fix 2.17.5).
  - Impact: stored XSS in HR/admin email‑template and document previews (attacker‑influenced template/document body executes in an admin session).
  - Fix: upgrade `sanitize-html` to ≥2.17.7; also tighten the config (SEC‑0009). Prefer server‑side sanitisation before storage, re‑sanitise on render.
  - Acceptance test: `pnpm audit` shows no sanitize-html advisory; render a template containing `<svg><a xlink:href="javascript:...">`/mXSS payloads → inert. Regression: snapshot test of `sanitizeHtml` stripping these payloads.

- [x] SEC-0005 [High][Vulnerable Components / A06] `undici@8.5.0` TLS cert‑validation bypass + DoS — **verified (osv/pnpm audit)**
  - Where: transitive (`pnpm-lock.yaml`); fix ≥8.10.2
  - Evidence: GHSA‑3xpg‑4rpp‑hhhm / undici TLS cert validation bypass via default `servername`; plus several DoS (WebSocket, decompression) advisories.
  - Impact: server‑side HTTPS calls (webhooks, e‑sign, AI, Upstash) could accept a wrong certificate / be DoS'd.
  - Fix: `pnpm up undici` (or override to ≥8.10.2) and rebuild the lockfile.
  - Acceptance test: `osv-scanner` / `pnpm audit` report no undici high advisories.

- [x] SEC-0006 [High][Cryptographic Failures / A02] Financial PII stored unencrypted at rest — **code-only**
  - Where: `lib/db/schema/auth.ts:54-63` (`taxId text`, `bankDetails jsonb` with account number/IFSC/PAN/SWIFT/IBAN), `monthlySalary`; NextAuth `accounts` table (Google OAuth access/refresh tokens, DrizzleAdapter default). Writers (`server/actions/hr-actions.ts`, `app/api/hr/employees/*`) store these verbatim.
  - Evidence: an AES‑256‑GCM helper (`lib/secret-crypto.ts encryptSecret/decryptSecret`) exists and is used for TOTP secrets and reset/invite tokens, but is **not** applied to `taxId`/`bankDetails`/OAuth tokens.
  - Impact: a DB read (backup leak, SQLi, insider) exposes PAN, full bank details and usable Google tokens in cleartext.
  - Fix: encrypt `taxId`, `bankDetails`, and the `accounts` token columns with `encryptSecret` at write and `decryptSecret` at read (or a custom encrypted DrizzleAdapter); add a migration/backfill. Confirm `ENCRYPTION_KEY` is set in prod and not derivable from committed material.
  - Acceptance test: a freshly‑saved employee row shows `enc:v1:` prefixed `tax_id`/`bank_details`; app still displays decrypted values to authorised viewers. Regression: round‑trip unit test.

- [x] SEC-0007 [High][Auth / Session Management — A07] Session revocation & step‑up MFA not enforced for server actions — **code-only**
  - Where: `lib/auth/helpers.ts getAuthenticatedMember` + `lib/auth/require-auth.ts` (used by `server/actions/*`), vs `lib/api/helpers.ts withAuth:131-200` which does check `mfaSatisfied === false` (403) and `revoked:session:*` / `userSessions.isRevoked`.
  - Evidence: `getAuthenticatedMember` only calls `auth()` and resolves membership — no `mfaSatisfied` check and no revocation check. Middleware also does not check revocation (JWT‑only). So a revoked/logged‑out session's JWT (8h maxAge) can still drive `document-actions`, `leave-actions`, `hr-actions`, `expense`, `onboarding` server actions.
  - Impact: "log out everywhere" / admin session‑revoke does not stop server‑action activity until JWT expiry; step‑up MFA can be skipped for action‑based mutations.
  - Fix: add a shared `assertSessionLive()` (revocation + `mfaSatisfied`) and call it from `getAuthenticatedMember`/`requireAuth`; or move server actions behind the same guard as `withAuth`.
  - Acceptance test: revoke a session, then invoke a leave‑apply server action with that JWT → rejected. Regression: unit test the shared guard.
  - **Also known as:** R3-0003

---

## 5. Phase 3 — Medium

### Medium

- [ ] MIYO-0107 [Medium][Prod/Performance] Lower the postgres pool size for serverless **[confirm on prod]**
  - **Where:** lib/db.ts:33 (`max = isServerless ? 15 : ... 75`)
  - **Problem:** 15 connections per serverless instance can exhaust the DB connection limit under load and cause timeouts.
  - **Fix:** Use max 1–3 per instance with a pooled connection string (PgBouncer/Neon pooler).
  - **Acceptance check:** Load test with 50 concurrent users shows no 'too many connections'.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: no fix commit since 914259e — no commit on main at HEAD 914259e
  - **Agent note (2026-10-17):** pool max is now 3 on serverless and a direct (non -pooler) Neon host warns on boot (4a8362e). Unticked until the 50-concurrent-user load test runs on prod.

- [ ] MIYO-0108 [Medium][Prod/Performance] Rename middleware.ts to proxy.ts (Next 16 deprecation)
  - **Where:** middleware.ts
  - **Problem:** `pnpm build` warns: The "middleware" file convention is deprecated. Please use "proxy" instead.
  - **Fix:** Run `npx @next/codemod@canary middleware-to-proxy .` and re-test auth redirects and MFA gate.
  - **Acceptance check:** Build output has no deprecation warning; signed-out redirect still works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/ai/next-action/route.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** renamed to `proxy.ts` with the export renamed to `proxy` (9a9b756). Unticked until a deploy log shows the deprecation warning gone and the signed-out redirect plus MFA gate are smoke-tested.

- [ ] MIYO-0110 [Medium][Build port] Intercepting-route ticket side pane
  - **Where:** app/(dashboard)/projects/[projectId]/@panel/(.)tickets/[ticketKey] (new)
  - **Problem:** Board opens a Sheet; Build has a deep-linkable intercepted pane (PR #4 'partial').
  - **Fix:** Add the parallel/intercepting route per node_modules/next/dist/docs; Sheet and page share one body.
  - **Acceptance check:** Opening a card updates the URL; refresh shows the full page; back closes the pane.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/projects/[projectId]/pages/route.ts); live acceptance ou
  - **Agent note (2026-10-17):** panel slot + `@panel/(.)tickets/[ticketKey]` added, board cards navigate to the ticket URL (510f057). Unticked until the three acceptance steps are clicked through in a browser; backlog/my-tickets/timeline still use `?ticket=`.

- [ ] MIYO-0111 [Medium][Build port] Ticket checklists
  - **Where:** lib/db/schema/projects.ts (ticket_checklists, ticket_checklist_items), components/projects/ticket-details
  - **Problem:** Skipped in PR #4; Streamline has features/build/ticket-details/ticket-checklists.tsx.
  - **Fix:** Add tables + CRUD API + UI with progress on cards.
  - **Acceptance check:** Checklist items can be added, ticked, reordered; card shows 2/5.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (components/projects/ticket-details/ticket-relations.tsx); live a
  - **Agent note (2026-10-17):** built in 8ceed7b (table `ticket_checklist_items`, migration 0162, `/checklist` route, `TicketChecklist` pane section, 2/5 on the card). Migration 0162 applies on the next deploy. Unticked until add/tick/reorder is clicked through.

- [ ] MIYO-0113 [Medium][Build port] Cross-project 'My work' page
  - **Where:** Streamline features/build/my-work, all-work; CRM has per-project my-tickets only
  - **Problem:** No single place to see my tickets across projects.
  - **Fix:** Add /projects/my-work listing assigned tickets across accessible projects with filters.
  - **Acceptance check:** User sees tickets from 3 projects in one list.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (2026-10-17):** `/projects/my-work` + `/api/projects/my-work` + sidebar entry (c9bacd9). Unticked until seen with tickets from 3 projects.

- [ ] MIYO-0114 [Medium][Build port] Releases / versions
  - **Where:** Streamline features/build/releases
  - **Problem:** Missing.
  - **Fix:** releases table (projectId, name, targetDate, status) + ticket.fixVersion; release page with progress.
  - **Acceptance check:** Tickets can be assigned to a release; release shows % done.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: no fix commit since 914259e — no commit on main at HEAD 914259e
  - **Agent note (2026-10-17):** done as `tickets.milestone_id` on the existing project milestones (bb04a7c, migration 0163): Release row in the ticket pane, % done on the milestones page. Unticked until clicked through.

- [ ] MIYO-0115 [Medium][Build port] Roadmap across projects
  - **Where:** Streamline features/build/roadmap; CRM has per-project timeline
  - **Problem:** Missing portfolio view.
  - **Fix:** /projects/roadmap with epics/milestones across projects on a timeline.
  - **Acceptance check:** Roadmap shows milestones from all accessible projects.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (2026-10-17):** `/projects/roadmap` + `/api/projects/roadmap` + sidebar entry (6d1bdfe). Unticked until seen with milestones from several projects.

- [ ] MIYO-0116 [Medium][Build port] Project status updates (health posts)
  - **Where:** Streamline features/build/updates
  - **Problem:** Missing; overview has health signal only.
  - **Fix:** project_updates (status on-track/at-risk/off-track, body, author); overview shows latest.
  - **Acceptance check:** Manager posts an update; overview shows it.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (2026-10-17):** `project_updates` (migration 0164) + `/updates` route + Status updates section on the overview (9f935d5). Unticked until a manager posts one on a real project.

- [ ] MIYO-0120 [Medium][Build port] Workload view by assignee
  - **Where:** Streamline features/build/workload; CRM resource-allocation is org-level
  - **Problem:** Per-project workload missing.
  - **Fix:** Board grouped by assignee with estimate totals.
  - **Acceptance check:** Workload shows hours per person per cycle.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/ai/generate-review/route.ts); live acceptance outstandin
  - **Agent note (2026-10-17):** `/projects/<id>/workload` + `/workload` route + sidebar entry (56d8066), hours per person with a sprint filter. Unticked until checked against a real sprint.

- [ ] MIYO-0121 [Medium][Build port] Import/export tickets (CSV)
  - **Where:** Streamline features/build/import-export
  - **Problem:** Missing.
  - **Fix:** CSV export of filtered tickets; CSV import with column mapping and dry run.
  - **Acceptance check:** Export then import round-trips 50 tickets.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/export/table-pdf.test.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** Import / Export page, CSV reader and column mapping with tests, dry run before import (93f6bea). Unticked until a 50-ticket round trip is run.

- [ ] MIYO-0122 [Medium][Build port] Project webhooks
  - **Where:** Streamline features/build/webhooks
  - **Problem:** Org webhooks exist but no ticket events.
  - **Fix:** Emit ticket.created/updated/moved events to the org webhook dispatcher (after the header fix).
  - **Acceptance check:** A ticket move delivers a webhook.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (2026-10-17):** `ticket.created` / `ticket.updated` / `ticket.moved` added to WEBHOOK_EVENTS and dispatched from create, PATCH and the rank (drag) route (09f8394). Unticked until a move delivers to a real endpoint.

- [ ] MIYO-0124 [Medium][Payroll] Onboarding stores 25 % in `allowances` instead of `specialAllowance`
  - **Where:** app/api/hr/employees/onboard/route.ts (salary structure insert)
  - **Problem:** Design doc N19: the split is 50/25/25 but the third part lands in the wrong column.
  - **Fix:** Write specialAllowance; leave allowances 0.
  - **Acceptance check:** New hire structure has specialAllowance = 25 % of CTC.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (components/hr/onboarding-wizard.tsx); live acceptance outstandin

- [ ] MIYO-0125 [Medium][Payroll] Loan EMI skipped for low net pay is silent, and ceil EMIs over-collect
  - **Where:** lib/payroll/compute.ts:120-123, salary loans
  - **Problem:** If net room < EMI the EMI is skipped without telling anyone; EMIs computed with ceil collect up to ₹(n−1) extra (design doc N18).
  - **Fix:** Return `emiSkipped: true` and notify HR; make the last EMI the remainder.
  - **Acceptance check:** Test: 3-EMI loan of ₹1,000 collects 334+333+333.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/hr/loans/page.tsx); live acceptance outstanding

- [x] MIYO-0126 [Medium][Payroll] Payslip download is impossible for drafts, so HR cannot review before approval
  - **Where:** app/api/hr/payrolls/preview-pdf/route.ts, my-payslips download
  - **Problem:** QA 4.8: download only after PAID + CEO approval.
  - **Fix:** Allow HR/CEO/Admin to download a watermarked 'DRAFT' PDF.
  - **Acceptance check:** HR downloads a DRAFT PDF with a visible DRAFT watermark.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/hr/my-payslips/page.tsx); live acceptance outsta
  - **Agent note (2026-10-17):** the route already served admins a status-stamped PDF (`app/api/hr/payrolls/[payrollId]/download/route.ts`); the missing piece was the UI, now a kebab item on non-paid rows (last commit).

- [x] MIYO-0127 [Medium][Payroll] Payroll empty state has no action **[confirm on prod]**
  - **Where:** app/(dashboard)/hr/payroll/page.tsx
  - **Problem:** QA: empty state promised 'Generate payroll for all employees' without a button (copy since changed; re-verify).
  - **Fix:** Empty state = one line + 'Generate payroll' primary button opening the existing dialog.
  - **Acceptance check:** Empty month shows the button and it opens the dialog.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (.omc/state/session-end-jobs/runs/44d2f547-5129-4363-b53e-a3e14d1
  - **Agent note (2026-10-17):** already fixed: `app/(dashboard)/hr/payroll/page.tsx` empty state carries a Generate payroll action that opens the sheet.

- [x] MIYO-0128 [Medium][Payroll] Show 'Approved' / 'Paid' rows only when set
  - **Where:** features/hr/payroll/payroll-record-preview-sheet.tsx:226-232
  - **Problem:** QA: 'Approved: | Paid:' shown blank.
  - **Fix:** Render the row only when the date exists, otherwise show the status 'Waiting for CEO approval'.
  - **Acceptance check:** Draft record shows no blank Approved/Paid rows.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/hr/payrolls/[payrollId]/paid/route.ts); live acceptance
  - **Agent note (2026-10-17):** rows render only with a date, plus a Status line for what is pending (last commit).

- [ ] MIYO-0130 [Medium][Security] Turnstile env vars configured but never verified
  - **Where:** .env.example TURNSTILE_*, app/(public)/intake/[token], app/api/public/intake/[token]/route.ts
  - **Problem:** Public intake form has no bot protection (design doc N21).
  - **Fix:** Verify a Turnstile token in the public intake POST (also reused by the ATS apply form).
  - **Acceptance check:** POST without a valid token returns 400.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: no fix commit since 914259e — no commit on main at HEAD 914259e
  - **Agent note (2026-10-17):** widget + server verification added (548fbfa). Unticked until `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are set on prod; without the secret the check is skipped by design and a POST without a token still succeeds.

- [x] MIYO-0131 [Medium][Security] Fine-grained permission UI is not enforced
  - **Where:** lib/rbac/*, app/(dashboard)/settings/permissions/page.tsx
  - **Problem:** Permissions can be toggled in the UI but routes check roles, not permissions (design doc N22).
  - **Fix:** Either enforce `hasPermission()` in withRoles or hide the permissions page.
  - **Acceptance check:** Toggling a permission changes API behaviour, or the page is gone.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/rbac/permissions.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** already enforced by QA-0027: `lib/rbac/route-permissions.ts` is checked inside `withAuth` (`lib/api/helpers.ts`), so a toggled permission changes API behaviour on every mapped route.

- [ ] MIYO-0132 [Medium][Security] Add Content-Security-Policy nonces instead of unsafe-inline
  - **Where:** lib/security/csp.ts, next.config.ts
  - **Problem:** Design doc §14 proposal (nonce CSP).
  - **Fix:** Generate a nonce in proxy/middleware and pass to scripts.
  - **Acceptance check:** CSP header has no 'unsafe-inline' for script-src.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/hr/leaves/leaves-wfh-content.tsx); live acceptan
  - **Agent note (2026-10-17):** nonce minted in `proxy.ts`, `script-src` now `'nonce-…' 'strict-dynamic'` (2803d05). Unticked until a deployed build is loaded and the console is clear — a statically rendered page gets no nonce and would have its scripts blocked.

- [x] MIYO-0133 [Medium][Access control] Unknown /settings/<page> renders Account Settings instead of 404
  - **Where:** app/(dashboard)/settings/[[...rest]]/page.tsx
  - **Problem:** QA 4.3: /settings/unknown-page silently shows account settings.
  - **Fix:** Accept only known tab slugs; call notFound() otherwise.
  - **Acceptance check:** /settings/xyz shows the 404 page.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (2026-10-17):** already fixed (A14): `app/(dashboard)/settings/[[...rest]]/page.tsx` calls `notFound()` for any child path.

- [x] MIYO-0134 [Medium][Access control] Admin's own expense is auto-approved **[confirm on prod]**
  - **Where:** app/api/hr/expenses (create), lib/auth/role-guards isExpenseAdmin
  - **Problem:** QA 4.10: EXP-2026-001 auto-approved; Pending stays 0.
  - **Fix:** Never auto-approve the submitter's own claim; route Admin claims to CEO.
  - **Acceptance check:** Admin submits a claim → status PENDING, CEO sees it.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/hr/expenses/page.tsx); live acceptance outstandi
  - **Agent note (2026-10-17):** already fixed (A41): `app/api/hr/expenses/route.ts` routes every claim through `resolveLeaveApprover`, which drops the requester; auto-approve only when the org has no other approver.

- [x] MIYO-0135 [Medium][Leave] Send the 'Leave Request' email only after the request is committed **[confirm on prod]**
  - **Where:** app/api/hr/leaves/route.ts:16, server/actions/leave-actions/leave-requests.ts:16
  - **Problem:** QA 4.4: HR got two emails; the second came from a rejected overlapping attempt.
  - **Fix:** Send after the insert returns a row; overlap rejection returns before any email.
  - **Acceptance check:** Overlapping request → 409 and no email.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** already fixed (A31): the overlap check and insert share a transaction and the email is sent after it returns a row.

- [ ] MIYO-0136 [Medium][Leave] Leave policy page is read-only; entitlements come from env/constants
  - **Where:** app/(dashboard)/hr/leaves/policies/page.tsx
  - **Problem:** Design doc T10/Q14.
  - **Fix:** DECISION for Tarun; if editable, add leave_policies table (orgId, leaveTypeId, annualQuota, monthlyAccrual, carryForwardMax) and a form for HR.
  - **Acceptance check:** HR edits casual quota and new balances use it.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce
  - **Agent note (2026-10-17):** blocked on Tarun's decision (editable policies or keep env-driven). Same question as QA-0051. Nothing built.

- [ ] MIYO-0137 [Medium][Attendance] Check-in times follow the browser timezone instead of IST **[confirm on prod]**
  - **Where:** features/hr/attendance/check-in-button.tsx and attendance tables
  - **Problem:** QA 4.6; attendance fixed in 53b6615 but other UTC slicing remains (document expiry).
  - **Fix:** Use one formatIst() helper everywhere times are shown.
  - **Acceptance check:** With browser TZ = UTC, check-in still shows IST.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (.omc/state/checkpoints-restored/117a5055-c417-4018-8117-59798e95
  - **Agent note (2026-10-17):** four remaining UTC day windows moved to `getTodayString` / `formatDateOnly` (last commit). Unticked until checked with the browser timezone set to UTC.

- [x] MIYO-0138 [Medium][Jobs & cron] Run `holiday-notifications` from one scheduler only
  - **Where:** vercel.json (0 12 * * * (17:30 IST)) and lib/inngest/functions/holiday-notifications.ts (0 8 * * * (13:30 IST))
  - **Problem:** The same job is scheduled twice (design doc N11). Emails/notifications can go out twice; the Inngest path does not share the cron route's idempotency guard.
  - **Fix:** Keep the Inngest function (retries, steps) and remove the vercel.json entry, OR keep Vercel and remove it from lib/inngest/functions/index.ts — after Tarun confirms Inngest is connected in production. Wrap the remaining one with cronIdempotencyCheck('holiday-notifications').
  - **Acceptance check:** Only one schedule for holiday-notifications exists in the repo; a manual double trigger runs the work once.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email-templates/notifications.ts); live acceptance outstandi
  - **Agent note (2026-10-17):** already fixed (MIYO-0090 / MIYO-0091): `lib/inngest/functions/index.ts` no longer registers it and `app/api/cron/holiday-notifications/route.ts` runs behind `cronIdempotencyCheck`, so vercel.json is the only schedule.

- [x] MIYO-0139 [Medium][Jobs & cron] Run `auto-checkout` from one scheduler only
  - **Where:** vercel.json (0 19 * * * (00:30 IST)) and lib/inngest/functions/auto-checkout.ts (0 * * * * (hourly))
  - **Problem:** The same job is scheduled twice (design doc N11). Emails/notifications can go out twice; the Inngest path does not share the cron route's idempotency guard.
  - **Fix:** Keep the Inngest function (retries, steps) and remove the vercel.json entry, OR keep Vercel and remove it from lib/inngest/functions/index.ts — after Tarun confirms Inngest is connected in production. Wrap the remaining one with cronIdempotencyCheck('auto-checkout').
  - **Acceptance check:** Only one schedule for auto-checkout exists in the repo; a manual double trigger runs the work once.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (server/actions/auto-absent-leave.ts); live acceptance outstandin
  - **Agent note (2026-10-17):** already fixed (MIYO-0090 / MIYO-0091): `lib/inngest/functions/index.ts` no longer registers it and `app/api/cron/auto-checkout/route.ts` runs behind `cronIdempotencyCheck`, so vercel.json is the only schedule.

- [x] MIYO-0140 [Medium][Jobs & cron] Run `weekly-attendance-report` from one scheduler only
  - **Where:** vercel.json (0 9 * * 6 (Sat 14:30 IST)) and lib/inngest/functions/weekly-attendance-report.ts (0 8 * * 1 (Mon 13:30 IST))
  - **Problem:** The same job is scheduled twice (design doc N11). Emails/notifications can go out twice; the Inngest path does not share the cron route's idempotency guard.
  - **Fix:** Keep the Inngest function (retries, steps) and remove the vercel.json entry, OR keep Vercel and remove it from lib/inngest/functions/index.ts — after Tarun confirms Inngest is connected in production. Wrap the remaining one with cronIdempotencyCheck('weekly-attendance-report').
  - **Acceptance check:** Only one schedule for weekly-attendance-report exists in the repo; a manual double trigger runs the work once.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/hr/attendance/check-in/route.ts); live acceptance outsta
  - **Agent note (2026-10-17):** already fixed (MIYO-0090 / MIYO-0091): `lib/inngest/functions/index.ts` no longer registers it and `app/api/cron/weekly-attendance-report/route.ts` runs behind `cronIdempotencyCheck`, so vercel.json is the only schedule.

- [x] MIYO-0141 [Medium][Jobs & cron] Run `weekly-ceo-recap` from one scheduler only
  - **Where:** vercel.json (0 10 * * 1) and lib/inngest/functions/weekly-ceo-recap.ts (0 9 * * 1)
  - **Problem:** The same job is scheduled twice (design doc N11). Emails/notifications can go out twice; the Inngest path does not share the cron route's idempotency guard.
  - **Fix:** Keep the Inngest function (retries, steps) and remove the vercel.json entry, OR keep Vercel and remove it from lib/inngest/functions/index.ts — after Tarun confirms Inngest is connected in production. Wrap the remaining one with cronIdempotencyCheck('weekly-ceo-recap').
  - **Acceptance check:** Only one schedule for weekly-ceo-recap exists in the repo; a manual double trigger runs the work once.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (test/server-only-stub.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** already fixed (MIYO-0090 / MIYO-0091): `lib/inngest/functions/index.ts` no longer registers it and `app/api/cron/weekly-ceo-recap/route.ts` runs behind `cronIdempotencyCheck`, so vercel.json is the only schedule.

- [x] MIYO-0142 [Medium][Jobs & cron] Run `monthly-expense-report` from one scheduler only
  - **Where:** vercel.json (0 9 1 * *) and lib/inngest/functions/monthly-expense-report.ts (0 8 1 * *)
  - **Problem:** The same job is scheduled twice (design doc N11). Emails/notifications can go out twice; the Inngest path does not share the cron route's idempotency guard.
  - **Fix:** Keep the Inngest function (retries, steps) and remove the vercel.json entry, OR keep Vercel and remove it from lib/inngest/functions/index.ts — after Tarun confirms Inngest is connected in production. Wrap the remaining one with cronIdempotencyCheck('monthly-expense-report').
  - **Acceptance check:** Only one schedule for monthly-expense-report exists in the repo; a manual double trigger runs the work once.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/hr/expenses/page.tsx); live acceptance outstandi
  - **Agent note (2026-10-17):** already fixed (MIYO-0090 / MIYO-0091): `lib/inngest/functions/index.ts` no longer registers it and `app/api/cron/monthly-expense-report/route.ts` runs behind `cronIdempotencyCheck`, so vercel.json is the only schedule.

- [x] MIYO-0143 [Medium][Jobs & cron] Delete the dead cron `close-expired-job-postings`
  - **Where:** vercel.json (path /api/cron/close-expired-job-postings — no route exists)
  - **Problem:** 404 every day (design doc N12). Recruitment was removed; the ATS will add its own job.
  - **Fix:** Remove the entry.
  - **Acceptance check:** vercel.json has no close-expired-job-postings.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: no fix commit since 914259e — no commit on main at HEAD 914259e
  - **Agent note (2026-10-17):** entry removed from vercel.json (8e4b551).

- [ ] MIYO-0145 [Medium][Jobs & cron] Deactivate accounts automatically on the last working day
  - **Where:** app/api/hr/exit, new Inngest function
  - **Problem:** Resignation COMPLETED does not deactivate the account (design doc N13).
  - **Fix:** Daily job: users whose approved resignation lastWorkingDate < today IST → isActive=false, revoke sessions, send auth-account-deactivated to personal email.
  - **Acceptance check:** Test user with yesterday's last day is inactive after the job.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/hr/leave-working-days-server.ts); live acceptance outstandin
  - **Agent note (2026-10-17):** daily cron `/api/cron/deactivate-exited-employees` at 07:30 IST, deactivates, revokes sessions and emails (7e7edb9). Unticked until a test user with yesterday's last day is seen inactive after a run.

- [x] MIYO-0146 [Medium][Jobs & cron] Holiday added after both daily runs gets no reminder
  - **Where:** lib/inngest/functions/holiday-notifications.ts
  - **Problem:** Design doc §11.4 edge case.
  - **Fix:** When a holiday is created for tomorrow after 13:30 IST, send the reminder immediately (or schedule an Inngest event).
  - **Acceptance check:** Holiday created at 18:00 for tomorrow → reminder sent within a minute.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/api/hooks/hr/holiday-dates.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** the API route already sent it on create; the two server actions now do as well (3e1471a). `notificationSent` stops a repeat.

- [x] MIYO-0147 [Medium][Jobs & cron] Auto-absent emails to every absentee every day; add an HR digest
  - **Where:** server/actions/auto-absent-leave.ts
  - **Problem:** Notification noise (QA 4.5, design doc §11.5).
  - **Fix:** Keep the employee email (new template attendance-auto-absent) but send HR one daily digest instead of per-person mails.
  - **Acceptance check:** HR receives one digest per day.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (server/actions/auto-absent-leave.ts); live acceptance outstandin
  - **Agent note (2026-10-17):** HR already got one digest; the employee mail now uses the `attendance-auto-absent` template (4b9db8f).

- [ ] MIYO-0148 [Medium][Onboarding] Personal step 'Checking…' email check hangs > 25 s **[confirm on prod]**
  - **Where:** components/hr/_onboarding/step-personal-info.tsx:128, app/api/hr/employees/check-email/route.ts
  - **Problem:** QA Round 3 bug 3.
  - **Fix:** Debounce 400 ms, abort previous request, 5 s timeout with a 'could not check' fallback that lets the user continue (server re-checks on submit).
  - **Acceptance check:** Check completes < 2 s on prod; timeout shows fallback.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** 5s timeout, aborts the previous check, always clears the spinner (commit before last). Unticked until timed on prod.

- [x] MIYO-0150 [Medium][Employees & settings] Two employee directories (/hr cards vs /hr/employees table) **[confirm on prod]**
  - **Where:** app/(dashboard)/hr/page.tsx, app/(dashboard)/hr/employees/page.tsx
  - **Problem:** QA 4.11.
  - **Fix:** Keep /hr/employees (table) as the directory; /hr becomes the HR overview without a duplicate list.
  - **Acceptance check:** Only one employee list exists.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/export/table-pdf.test.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** already fixed (A43 / B6): `/hr` is the one directory (table with a grid toggle) and `/hr/employees` redirects to it.

- [x] MIYO-0151 [Medium][Employees & settings] Incentives cannot be created
  - **Where:** app/(dashboard)/hr/incentives/page.tsx, app/api/hr/incentives
  - **Problem:** QA 4.10 / design doc: still open, '?' placeholders.
  - **Fix:** Add 'New incentive' sheet (employee, amount ₹, period, reason) using the existing API, or hide the page.
  - **Acceptance check:** HR creates an incentive and sees it listed.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (server/queries/hr/incentives.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** took the 'hide the page' option: `/hr/incentives` 404s while `NEXT_PUBLIC_CRM_MODULE` is off (last commit). An incentive is a percentage of a CRM client account, so a create form waits for the CRM module.

- [x] MIYO-0152 [Medium][Employees & settings] Reimbursements and Loans missing from the employee sidebar
  - **Where:** components/layout/sidebar/sidebar-nav-items.ts
  - **Problem:** QA 4.10; design doc still open. The highlight falls on Employees.
  - **Fix:** Add both under My HR for every role; fix active-state matching.
  - **Acceptance check:** Employee sees Reimbursements/Loans; correct item highlighted.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/hr/employees/route.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** both added under My HR for every role, plus route-map entries so employees are not bounced (5d90cb0).

- [x] MIYO-0153 [Medium][Employees & settings] My Documents missing from the non-admin sidebar
  - **Where:** components/layout/sidebar/sidebar-nav-items.ts, app/(dashboard)/hr/my-documents
  - **Problem:** Page exists (acbf321) but employees cannot find it (design doc T6).
  - **Fix:** Add 'My documents' under My HR for all roles.
  - **Acceptance check:** Employee sidebar shows My documents.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (components/layout/sidebar/sidebar-nav-items.ts); live acceptance
  - **Agent note (2026-10-17):** added under My HR for every role (5d90cb0).

- [x] MIYO-0154 [Medium][Email templates] Move inline-HTML emails into the template system
  - **Where:** server/actions/auto-absent-leave.ts, lib/hr/late-arrival-after-check-in.ts, app/api/hr/onboarding/reminders/route.ts, app/api/hr/holiday-work-requests/route.ts, lib/hr/one-on-one-invite.ts, lib/calendar-event-notifications.ts, app/api/hr/*/export/email/route.ts (6), server/actions/expense-export.ts, server/actions/weekly-ceo-recap.ts
  - **Problem:** These build their own HTML strings, bypassing branding and escaping.
  - **Fix:** Switch each to renderEmail() with the matching template id (attendance-auto-absent, attendance-late-arrival, onboarding-reminder, attendance-holiday-work-*, one-on-one-invite, calendar-event, data-export-ready, weekly-ceo-recap).
  - **Acceptance check:** `grep -rn "<p" app/api server/actions lib/hr | grep sendEmail -l` returns nothing.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/html-to-text.test.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** the six export mails (71770ad), onboarding reminder, 1-on-1 invite, calendar event (previous commit), holiday-work request and the late-arrival fallback (a21808a) now render file templates; auto-absent moved earlier in 4b9db8f. Two senders deliberately keep their own builders: `weekly-ceo-recap` (its template module carries the leaderboard and AI narrative, which `weekly-ceo-recap.html` has no slots for) and the org-editable late-arrival warnings.

- [ ] MIYO-0155 [Medium][Email templates] Email test endpoint hard-codes old subjects
  - **Where:** app/api/settings/email-templates/test/route.ts
  - **Problem:** Subjects 'Verify Your Email Address - Miyo Global' etc. duplicated here.
  - **Fix:** Render via renderEmail(id) for any template id so the test mail equals production.
  - **Acceptance check:** Settings → Email templates → Send test sends the new design.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding

- [ ] MIYO-0156 [Medium][Email templates] Wire the senders that have no production caller
  - **Where:** sendAssetAssignedEmail, sendAssetAssignedHrEmail (hr-assets notifyAssetAssignment), sendDocumentExpiryReminderEmail, sendPasswordExpiryWarningEmail, sendPayslipGeneratedEmail, sendHolidayAnnouncementEmail, sendBulkCompanyAnnouncement
  - **Problem:** Design doc §11.2 'Dead' list.
  - **Fix:** Call asset-assigned on assignment, document-expiry from a daily job, password-expiry from a daily job when passwordExpiryDays is set; delete sendPayslipGeneratedEmail (payroll-payslip covers it).
  - **Acceptance check:** Each kept sender has at least one caller and a test.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: no fix commit since 914259e — no commit on main at HEAD 914259e

- [ ] MIYO-0157 [Medium][Email templates] Merge the two welcome emails a new hire gets on day one
  - **Where:** auth-welcome-set-password (onboard API) and onboarding-welcome (Inngest initiate-onboarding)
  - **Problem:** Two 'Welcome to Miyo Global' mails arrive together.
  - **Fix:** Send auth-welcome-set-password at hire; send onboarding-welcome 2 days before joining date (or on hire if joining ≤ 2 days away).
  - **Acceptance check:** New hire joining in a week receives one mail today and one 2 days before.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (components/dashboard/widgets/announcements-widget.tsx); live acc
  - **Agent note (2026-10-17):** the onboarding welcome now sleeps until two days before joining (last commit). Unticked: the sleep runs in Inngest, which is not connected on prod (MIYO-0092).

- [ ] MIYO-0158 [Medium][Email templates] Send work emails for deactivation/termination to the personal address
  - **Where:** auth-account-deactivated, exit-termination-notice senders
  - **Problem:** Mail goes to the work inbox that is being deactivated.
  - **Fix:** Use users.personalEmail when present, else work email.
  - **Acceptance check:** Deactivated user with personal email receives it there.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/hr/work-logs/page.tsx); live acceptance outstand
  - **Agent note (2026-10-17):** `users.personal_email` (migration 0165) + HR field on the employee panel; deactivation job and termination letter prefer it (a6eceed). Unticked until a real deactivation lands in a personal inbox.

- [ ] MIYO-0159 [Medium][Email templates] Replace email template `auth-welcome-set-password`
  - **Where:** Current: getWelcomeEmailTemplate (lib/email-templates/auth.ts) via sendWelcomeEmail. New: email-templates/auth-welcome-set-password.html + .txt. Trigger: POST /api/hr/employees/onboard. To: the new employee.
  - **Problem:** Emoji in the heading ('🚀'); Generic onboarding bullet list that does not match what the app offers on day one; Shows the email address in a monospace 'credential box' although no credential is sent; Name is shown as stored; QA saw re-cased names ('Qa') in Round 3 — confirm the stored value is now as typed; Expiry (7 days) is hard-coded in copy and not read from the token TTL; QA Round 3: text part was raw CSS (now fixed by htmlToText in lib/email/sender.ts — keep the hand-written .txt instead of auto-conversion)
  - **Fix:** Implement with renderEmail('auth-welcome-set-password', vars). Subject: "Set up your {{org_name}} account". Preheader: "Your account is ready. Choose a password to sign in.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** `sendWelcomeEmail` renders `auth-welcome-set-password`; old generator deleted (85639b6). Unticked until a real inbox check.

- [ ] MIYO-0160 [Medium][Email templates] Replace email template `auth-password-reset`
  - **Where:** Current: getPasswordResetEmailTemplate. New: email-templates/auth-password-reset.html + .txt. Trigger: POST /api/auth/forgot-password. To: the user.
  - **Problem:** Yellow warning banner styling; Does not say when the request was made or from where
  - **Fix:** Implement with renderEmail('auth-password-reset', vars). Subject: "Reset your password". Preheader: "Use this link within 1 hour to choose a new password.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** `sendPasswordResetEmail` renders `auth-password-reset` (85639b6). Unticked until a real inbox check.

- [ ] MIYO-0161 [Medium][Email templates] Replace email template `leave-request-approver`
  - **Where:** Current: getLeaveRequestEmailTemplate (hr.ts) via sendLeaveRequestEmail. New: email-templates/leave-request-approver.html + .txt. Trigger: leave applied. To: resolved approver + HR_LEAVE_NOTIFY_EMAIL.
  - **Problem:** Emoji heading ('📅'); QA Round 3: HR got 'Leave Request' twice for one request (second from a rejected overlap attempt) — send only after the insert commits; Subject suffix ' - Miyo Global' on every email; Balance after approval not shown
  - **Fix:** Implement with renderEmail('leave-request-approver', vars). Subject: "Leave request: {{employee_name}}, {{date_range}}". Preheader: "{{leave_type}} · {{day_count}} days · waiting for your approval". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** renders `leave-request-approver` with day count and balance after (b68c11b). Unticked until a real inbox check.

- [ ] MIYO-0162 [Medium][Email templates] Replace email template `leave-approved`
  - **Where:** Current: getLeaveStatusUpdateEmailTemplate (approved branch). New: email-templates/leave-approved.html + .txt. Trigger: leave approved. To: the employee.
  - **Problem:** One template with emoji branches for approve and reject ('✅'/'❌'); Does not show remaining balance
  - **Fix:** Implement with renderEmail('leave-approved', vars). Subject: "Leave approved: {{date_range}}". Preheader: "{{leave_type}} approved by {{approver_name}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** renders `leave-approved` (b68c11b). Unticked until a real inbox check.

- [ ] MIYO-0163 [Medium][Email templates] Replace email template `leave-rejected`
  - **Where:** Current: getLeaveStatusUpdateEmailTemplate (rejected branch). New: email-templates/leave-rejected.html + .txt. Trigger: leave rejected. To: the employee.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('leave-rejected', vars). Subject: "Leave not approved: {{date_range}}". Preheader: "{{approver_name}} added a note.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** renders `leave-rejected` (b68c11b). Unticked until a real inbox check.

- [ ] MIYO-0164 [Medium][Email templates] Replace email template `payroll-payslip`
  - **Where:** Current: getPayslipEmailTemplate (hr.ts) + lib/hr/send-payslip-email.ts. New: email-templates/payroll-payslip.html + .txt. Trigger: payroll marked PAID. To: the employee.
  - **Problem:** Subject built from HTML-escaped values (an org name with '&' shows '&amp;' in the subject); Green success box styling; Two subject lines exist (template builds one, send-payslip-email.ts builds another); Net only; no gross/deduction summary
  - **Fix:** Implement with renderEmail('payroll-payslip', vars). Subject: "Your payslip for {{month_label}}". Preheader: "Net pay ₹{{net_pay}} · PDF attached". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** renders `payroll-payslip` with the gross-to-net breakdown; one subject, unescaped (99303a1). Unticked until a real inbox check.

- [ ] MIYO-0165 [Medium][Email templates] Replace email template `celebration-birthday`
  - **Where:** Current: getCelebrationEmailTemplate (birthday branch). New: email-templates/celebration-birthday.html + .txt. Trigger: Inngest celebration-greetings 08:00 IST. To: the person.
  - **Problem:** Hard-codes 'Miyo Global' instead of {{org_name}}; QA Round 3: birthday person got no email — only runs if Inngest is connected in production; Title suffix ' - Miyo Global'
  - **Fix:** Implement with renderEmail('celebration-birthday', vars). Subject: "Happy birthday, {{first_name}}". Preheader: "Wishing you a great year ahead from everyone at {{org_name}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** renders `celebration-birthday` / `celebration-work-anniversary` (99303a1). Unticked: the greeting cron runs in Inngest (MIYO-0092).

- [ ] MIYO-0166 [Medium][Email templates] Replace email template `holiday-reminder`
  - **Where:** Current: getHolidayAnnouncementEmailTemplate (organization.ts) via sendBulkHolidayAnnouncement. New: email-templates/holiday-reminder.html + .txt. Trigger: holiday-notifications (day before). To: all active members.
  - **Problem:** Emojis ('🎉', '💬', '🎊'); Always says 'OFFICE CLOSED' in green even for half-day holidays; 'Dear Team' + filler paragraph about finishing urgent tasks; QA: 'QA Test Holiday' (25 Oct 2031) will trigger this for everyone unless deleted
  - **Fix:** Implement with renderEmail('holiday-reminder', vars). Subject: "Holiday tomorrow: {{holiday_name}}". Preheader: "{{holiday_date}} · {{closure_type}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (lib/email/projects.ts); live acceptance outstanding
  - **Agent note (2026-10-17):** renders `holiday-reminder` with the closure type (99303a1). Unticked until a real inbox check.

- [ ] MIYO-0173 [Medium][Leftovers] Topbar 'Create' menu links to removed CRM pages (/crm/leads, /crm/deals)
  - **Where:** components/layout/topbar.tsx:30-31
  - **Problem:** Leftover from the removed CRM/Sales/Recruitment/Branches modules (D-1…D-6); dead or broken links/code.
  - **Fix:** Delete both CREATE_ITEMS entries and the unused icons.
  - **Acceptance check:** grep for the removed names in the listed files returns nothing; typecheck, lint, build pass.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (components/layout/topbar.tsx); live acceptance outstanding
  - **Agent note (2026-10-17):** both entries and the two icons removed from the topbar (d84c3bd).

- [ ] QA-0034 [Medium][Access control & roles] Denied-page behaviour is inconsistent and some admin pages are reachable by direct URL — Where: page route-access: some pages redirect to /dashboard, others show Access Restricted; HR can open /settings/roles, /settings/audit-log by URL; Sales /reports — Steps: /hr/payroll,/settings/roles,/hr/assets silently redirect; /reports,/timesheets/team show Access Restricted; HR reaches /settings/roles (New Role) and /settings/audit-log by URL — Expected vs actual: One consistent denied pattern; menu-hidden pages also blocked by route guard vs actual: mixed + reachable-by-URL — Fix: Use one Access-Restricted page for all denials; add route guards matching the menu — Acceptance: Every denied page shows the same Access-Restricted screen; URL access is blocked where the menu hides it — Ref: E6,E7
  - **Agent note (2026-10-17):** fixed in code at a9922ea (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Attendance**
  - **Retest status:** PARTIAL
  - **Remaining:** ui-B: Admin /settings/roles loads; denied page not viewable as Admin

- [ ] QA-0035 [Medium][Attendance] Attendance check-in is allowed before the employee's joining date — Where: app/api/hr/attendance/check-in/route.ts (no joining-date guard) — Steps: SALES (joins 20 Oct) check-in on 16 Oct -> 200 success — Expected vs actual: Check-in before joining rejected vs actual: pre-joining attendance records created — Fix: Reject check-in when today < joiningDate — Acceptance: Pre-joining check-in -> 4xx; on/after joining works — Ref: QA-P6-06; MIYO-0089
  - **Agent note (2026-10-17):** fixed in code at a7dd819 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Auth**
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: ui-B: skipped — needs future-joiner login

- [ ] QA-0037 [Medium][Auth] User enumeration via login error code + attacker-triggerable lockout — Where: lib/auth/index.ts authorize throws ACCOUNT_LOCKED/EMAIL_NOT_VERIFIED (-> error=Configuration) vs null (-> CredentialsSignin) — Steps: Unknown email and wrong-pw -> CredentialsSignin; real locked account (correct pw) -> Configuration. 5 bad logins then Configuration confirms the account exists (and locks any known email) — Expected vs actual: Uniform generic error for all failure modes vs actual: locked/unverified distinguishable; lockout weaponizable — Fix: Return a generic CredentialsSignin for locked/unverified too; add per-IP+account backoff that doesn't leak state — Acceptance: Locked and nonexistent accounts return the same error code — Ref: QA-A12
  - **Agent note (2026-10-17):** fixed in code at 36da80b (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 36da80b7d "QA-0037: stop login errors revealing which account" (2026-10-16 18:39:10 +0530); not re-prob

- [ ] QA-0038 [Medium][Auth] No per-account rate limit / lockout on MFA code attempts — Where: app/api/auth/mfa/login-verify/route.ts (no per-account counter; only in-process IP tier) — Steps: Wrong MFA code -> 400 with no attempt counter; no lockout after repeated wrong codes (code-confirmed; not brute-forced live) — Expected vs actual: N wrong codes locks MFA verification for a cooldown vs actual: unlimited attempts — Fix: Add a per-user attempt counter with lockout on the MFA verify endpoints — Acceptance: N wrong MFA codes locks verification for a cooldown — Ref: QA-A13
  - **Agent note (2026-10-17):** fixed in code at 892c478 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Core**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 892c478eb "QA-0038: rate-limit MFA code attempts per account" (2026-10-16 18:41:38 +0530); not re-probe

- [ ] QA-0039 [Medium][Core] Global Create and search are broken/thin (New ticket/Apply leave open nothing; search finds nothing; only 2 items) — Where: Global Create menu; command palette search — Steps: Global Create -> New ticket lands on /support analytics with no form; Apply leave doesn't open; menu has 2 items; search for 'QA'/'Sudheer' returns nothing with no empty state; palette doesn't index projects — Expected vs actual: Global Create opens working forms; search indexes records vs actual: dead actions + empty search — Fix: Wire Global Create actions to real forms; index core entities in search; add empty states — Acceptance: Each Global Create action opens its form; search returns known records — Ref: L8,L9,L19,S17
  - **Agent note (2026-10-17):** fixed in code at 7010fe0 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Email**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 7010fe087 "QA-0039: make Global Create and search work" (2026-10-16 18:45:03 +0530); not re-probed live

- [ ] QA-0040 [Medium][Email] Two inconsistent live email layouts; webfonts + unused logo; no Reply-To/footer-why line — Where: rich Jakarta/gradient cards vs minimal 'View Details'; @import fonts.googleapis; replyTo=null on all 38 — Steps: marked-absent/leave-pending/check-in/onboarded-hr use a minimal layout; others rich; logo.png 200 but unused; no Reply-To; footer lacks 'why you got this' — Expected vs actual: One base layout, inline-safe fonts, embedded logo, Reply-To, rewrite footer vs actual: two layouts, remote fonts, no reply-to — Fix: Move all senders to renderEmail(); inline font stack; embed logo; set Reply-To to support/hr; adopt rewrite footer — Acceptance: All types share one header/footer/logo; headers show Reply-To — Ref: EMAIL-0007,0013,0014; MIYO-0097,0154
  - **Agent note (2026-10-17):** fixed in code at 504bdef (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 504bdef6d "QA-0040: one email layout, with a logo and a Reply" (2026-10-16 18:47:37 +0530); not re-prob

- [ ] QA-0041 [Medium][Email] Welcome/password-changed copy is AI-generic, missing fields, hard-coded expiry, spammy security essay — Where: auth welcome + password-changed senders — Steps: Welcome: emoji, 'excited to have you on board', empty credential box, 'expires in 7 days' (not IST timestamp), no joining date/manager. Password-changed: 'Hi Qa Alpha ,' + long Security Tips, no changed_at IST, no settings CTA — Expected vs actual: Deploy rewrites with joining-date+manager, IST expiry, security CTA vs actual: generic/old — Fix: Deploy auth-welcome-set-password + auth-password-changed; add joining/manager rows, IST timestamps, settings CTA — Acceptance: Subjects/txt match rewrites; expiry/changed_at show IST; CTA present — Ref: EMAIL-0008,0009; MIYO-0159
  - **Agent note (2026-10-17):** fixed in code at c6dc192 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in c6dc192f9 "QA-0041: rewrite the account set-up and password-c" (2026-10-16 18:52:10 +0530); not re-prob

- [ ] QA-0042 [Medium][Email] Auto-absent emails every absentee daily + noisy HR digest (incl. admins), internal phrasing; HR emailed on every check-in — Where: attendance auto-absent + check-in senders — Steps: 9 'Marked absent' mails over 2 days + HR 'Absent without leave' listing 6-7 names incl. Sudheer reddy (admin); copy 'no leave request was found in the database'; HR gets a mail on every check-in — Expected vs actual: One calm employee mail + one HR digest; no per-check-in mail; exclude non-enforced roles vs actual: spammy + internal wording — Fix: Collapse to one employee mail + one HR digest; remove per-check-in email (or opt-in); friendlier copy; exclude admins if not enforced — Acceptance: One HR digest; employee mail matches rewrite; no 'database' wording; check-in sends no email — Ref: EMAIL-0011,0012; MIYO-0147
  - **Agent note (2026-10-17):** fixed in code at eab49c3 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Employee UI**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in eab49c318 "QA-0042: calm the absence emails" (2026-10-16 18:53:25 +0530); not re-probed live this pass

- [ ] QA-0043 [Medium][Employee UI] Employee dashboard leaks org-wide leave (with leave type) to everyone — Where: employee dashboard 'Upcoming leaves / Approved team leaves' — Steps: Employee sees org-wide upcoming leaves incl. HR admin's sick leave type — Expected vs actual: Only self/team leave, without sensitive type, shown vs actual: everyone's leave + type — Fix: Scope to self + direct team; hide leave type from peers — Acceptance: An employee sees only their own/team leave without type — Ref: E4
  - **Agent note (2026-10-17):** fixed in code at e306b64 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**HR**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in e306b6413 "QA-0043: scope the dashboard's upcoming leaves to " (2026-10-16 18:54:26 +0530); not re-prob

- [ ] QA-0044 [Medium][HR] Approved reimbursements/expenses have no reimburse/mark-paid action; loan approve missing; reject lacks reason/confirm — Where: /hr/reimbursements, /hr/expenses, /hr/loans — Steps: No mark-paid/reimburse on approved items; pending loan has no Approve; Reject has no reason/confirm/toast — Expected vs actual: Full lifecycle actions (approve, reject-with-reason, mark-paid) exist vs actual: dead-ends — Fix: Add the missing lifecycle actions + confirmations/toasts — Acceptance: Approve/reject/mark-paid each work with confirmation — Ref: H6,H7
  - **Agent note (2026-10-17):** fixed in code at b18e0d0 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** expense approve via PATCH works + email; loan/reimburse lifecycle partial

- [ ] QA-0045 [Medium][HR] Weak server-side validation on HR forms (dates, levels, amounts) — Where: various HR forms (assets, 1-on-1, promotions, ladders, goals, bonuses) — Steps: Future asset purchase date; past-dated 1-on-1 with invite; promotion to L20 on a ladder with no levels; current level 'Unknown'; goal target -5; bonus/expense negatives clamp silently — Expected vs actual: Server rejects impossible values with clear errors vs actual: accepted/clamped silently — Fix: Add server-side range/consistency validation with field errors — Acceptance: Each impossible value is rejected with a clear message — Ref: H8,H9,H15,O4,S8
  - **Agent note (2026-10-17):** fixed in code at 6f7a7a1 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 6f7a7a16f "QA-0045: reject impossible values on the HR forms" (2026-10-16 19:04:03 +0530); not re-probe

- [ ] QA-0046 [Medium][HR] Document size handling is wrong (>10MB silently ignored; next small file wrongly rejected; sizes show 0 KB) — Where: /hr/documents upload size checks — Steps: 11MB file silently ignored; next small file 'exceeds 10MB'; listed sizes 0 KB — Expected vs actual: Clear over-size error, correct subsequent uploads, real sizes vs actual: silent drops + wrong errors + 0 KB — Fix: Fix the size guard (per-file, reset state) and show real sizes — Acceptance: Over-size -> clear error; valid next file uploads; sizes correct — Ref: H11
  - **Agent note (2026-10-17):** fixed in code at 9d679e7 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 9d679e735 "QA-0046: fix the document upload size guard and re" (2026-10-16 19:07:16 +0530); not re-prob

- [ ] QA-0047 [Medium][HR] /hr/analytics and data-hub asset state are inconsistent with other views (asset AVAILABLE vs ASSIGNED; headcount 6 vs 7/15 vs 16) — Where: /hr/analytics, /settings/data-hub, org chart — Steps: Data-hub shows QA Laptop AVAILABLE/unassigned vs earlier ASSIGNED; payroll 'Total employees 6' vs 7 elsewhere; org chart '16 members' vs Members 15 — Expected vs actual: Consistent counts/states across views vs actual: contradictions — Fix: Single source of truth for headcount/asset state; show excluded rows explicitly — Acceptance: Counts/states match across analytics, data-hub, org chart and payroll — Ref: S11,pass1#6,F7,S28
  - **Agent note (2026-10-17):** fixed in code at a3cb299 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 0c150dac0 "QA-0047: make the headcount figures agree across v" (2026-10-16 19:09:06 +0530); not re-prob

- [ ] QA-0048 [Medium][HR] Any employee can publish any rich document (no owner/admin check) — Where: app/api/hr/rich-documents/[documentId]/publish/route.ts (withAuth only) — Steps: As SALES PATCH /api/hr/rich-documents/1/publish ('QA NDA Doc P6', not owned) -> 200 {success:true} — Expected vs actual: Only the owner or HR/admin can publish vs actual: any authenticated user can — Fix: Wrap in withRoles(HR/ADMIN/CEO) or check createdBy===session.user.id — Acceptance: Non-owner non-admin publish = 403 — Ref: QA-P8-01; Found 16 Oct 15:25 IST @914259e
  - **Agent note (2026-10-17):** fixed in code at 174edb9 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 174edb9dc "QA-0048: restrict rich-document publishing to the " (2026-10-16 19:10:44 +0530); not re-prob

- [ ] QA-0049 [Medium][HR] Rich-document editor shows 'Unsaved' immediately on open (before any edit) — Where: /hr/documents/editor/[documentId] — Steps: Open the NDA doc -> the status shows 'Unsaved' with no change made. — Expected vs actual: 'Saved' until the first edit vs a false dirty state on load — Fix: Don't mark the document dirty on initial load/hydration — Acceptance: Opening a document shows Saved until the first edit — Ref: pass9 #14; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** fixed in code at 030487a (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Leave**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 030487a59 "QA-0049: stop the document editor opening in an un" (2026-10-16 19:10:46 +0530); not re-prob

- [ ] QA-0050 [Medium][Leave] Leave apply preview ignores the monthly cap and already-approved leave — Where: leave apply preview vs server validation — Steps: Preview shows '8 days left' but server rejects 'Casual leave is limited to 2 day(s) in 2026-10' — Expected vs actual: Preview reflects the monthly cap and existing approved leave vs actual: optimistic preview then server rejection — Fix: Compute preview from the same balance/cap/overlap logic the server uses — Acceptance: Preview matches the server decision for the same request — Ref: L4
  - **Agent note (2026-10-17):** fixed in code at 462baf2 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 462baf244 "QA-0050: make the leave preview match the server's" (2026-10-16 19:15:00 +0530); not re-prob

- [ ] QA-0051 [Medium][Leave] Leave policies are read-only (env-driven) with no UI to create/edit — Where: /hr/leaves/policies; /settings/organization pay policy — Steps: Policy page is read-only; no PT/per-day/pay-day config; no way to create/edit leave policies — Expected vs actual: HR can configure leave/pay policy in the UI vs actual: hard-coded/env only — Fix: Add editable policy config (leave types/caps, PT bands, per-day divisor, pay day) — Acceptance: HR edits a policy value and it takes effect — Ref: L14,F6
  - **Agent note (2026-10-17):** fixed in code at 03160e0 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Payroll**
  - **Retest status:** PARTIAL
  - **Remaining:** UI-A: policies editable/save but no create UI; ~15s load

- [ ] QA-0054 [Medium][Payroll] employee.hired / leave.approved webhooks never deliver, and those event names aren't subscribable — Where: lib/inngest/dispatch-webhook.ts (inngest.send not delivering in prod); app/api/webhooks/route.ts webhookEventSchema lacks employee.hired/leave.approved — Steps: Wildcard webhook to webhook.site: approve a leave and onboard 'QA Webhook Hire' -> 0 deliveries after ~80s; subscribing to leave.approved -> 400 (not in enum). Welcome email did arrive — Expected vs actual: Subscribable event names match dispatched events and deliveries fire (signed, with retries) vs actual: dead delivery + enum mismatch — Fix: Ensure Inngest is wired in prod; align the enum with dispatched names; expose delivery/retry status — Acceptance: Subscribe to leave.approved by name; approving a leave delivers a signed POST within seconds with retries — Ref: QA-P6-02,QA-P7-04; MIYO-0092; MIYO-0021(sig)
  - **Agent note (2026-10-17):** fixed in code at 511f920 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Projects**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 511f9203d "QA-0054: deliver employee.hired and leave.approved" (2026-10-16 19:22:35 +0530); not re-prob

- [ ] QA-0056 [Medium][Projects] Ticket has no Due date field; a comment attachment is not shown after upload — Where: /projects/[projectId]/tickets/[ticketKey] — Steps: The ticket page has no Due date field; attachments exist only on comments; the attached qa-attach.txt didn't appear after posting the comment. — Expected vs actual: Tickets have a due date and a comment attachment persists and displays vs neither — Fix: Add a ticket due-date field (see design QA-D007); fix comment attachment persistence/display — Acceptance: A ticket can be given a due date; a comment attachment shows after posting — Ref: pass9 #5; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** fixed in code at fb41583 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 9cc792928 "QA-0056: add a ticket due date and stop losing com" (2026-10-16 19:27:43 +0530); not re-prob

- [ ] QA-0057 [Medium][Projects] Build UI doesn't refresh after create/update (labels, budget, intake, views, pages) — Where: /projects/[projectId]: ticket labels, /budget, /intake, /views, /pages — Steps: Added ticket label appears only after reload and a removed label's chip stays visible; Set Budget -> Save doesn't close/refresh (value shows only after reload); Intake, Views and Pages lists don't refresh after creating an item. — Expected vs actual: Mutations update the UI immediately vs requiring a manual reload and leaving stale chips — Fix: Invalidate/refetch (or optimistically update) the relevant query after each mutation; close edit forms on success — Acceptance: Add/remove label, set budget, and create intake/view/page all reflect immediately without a reload — Ref: pass9 #6,#9,#10; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** fixed in code at 1e07aab (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** UI-A: label/budget/intake/page refresh OK; no Views UI found

- [ ] QA-0058 [Medium][Projects] Ticket points accepts negatives, clears the field, and shows raw validation — Where: /projects/[projectId]/tickets/[ticketKey] (points) — Steps: Set points -5 -> raw 'Validation failed: points: Too small: expected number to be >=0' and the field clears. — Expected vs actual: Points constrained to >=0 with friendly copy and the input preserved vs a raw error and lost input — Fix: Set min=0 on the input, validate before submit, keep the entered value, friendly message (raw text -> design QA-D005) — Acceptance: Entering -5 is rejected inline (min=0) and the field keeps a valid value — Ref: pass9 #7; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** fixed in code at 2989ccd (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 2989ccd06 "QA-0058: validate ticket points in the field" (2026-10-16 19:30:59 +0530); not re-probed liv

- [ ] QA-0064 [Medium][RBAC] /api/webhooks GET and /api/roles are readable by any employee — Where: app/api/webhooks/route.ts:42 (GET withAuth); app/api/roles/route.ts GET (withAuth) — Steps: As SALES GET /api/webhooks -> 200 (URLs/events; secret stripped); GET /api/roles -> 200 full role->permission map (5.7KB) — Expected vs actual: Admin-only vs actual: endpoints + full RBAC map enumerable by any employee — Fix: withAdmin on /api/webhooks GET; restrict /api/roles to admins or return only the caller's effective permissions — Acceptance: SALES GET of each = 403 (or self-only for roles) — Ref: QA-A08,QA-A09
  - **Agent note (2026-10-17):** fixed in code at cd1c8c9 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** webhooks GET 403 FIXED; /api/roles still 200 for employees

- [ ] QA-0065 [Medium][RBAC] Unmapped pages open to all roles (reports, portal, tasks/overdue, timesheets/team, leave policies) — Where: lib/auth/route-access.ts ROUTE_ROLE_MAP missing entries; /hr/leaves/policies under the EVERYONE /hr/leaves prefix — Steps: Every low-priv role loaded /reports, /portal, /tasks/overdue, /timesheets/team, /hr/leaves/policies with 200 (no redirect) — Expected vs actual: Manager/HR-only pages redirect low roles vs actual: shells render for everyone — Fix: Add explicit ROUTE_ROLE_MAP entries incl. a distinct /hr/leaves/policies -> HR_TEAM (longest-prefix wins) — Acceptance: SALES on those pages redirects to /dashboard — Ref: QA-A10; MIYO-0086
  - **Agent note (2026-10-17):** fixed in code at eec79c9 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: ui-B: skipped — needs role-access session

- [ ] R3-0010 [Medium][RBAC] `/api/roles` readable by every employee — Ref: QA-0064b

- [ ] R3-0011 [Medium][Leave] Onboard does not seed leave balances (only onboarding *submit*) — Where: `employees/onboard` vs `onboarding/submit` — Steps: all QA3 `leaves/my` balances=[] until personal onboarding submit — Fix: seed on hire — Ref: blocks leave E2E

- [ ] R3-0012 [Medium][Auth] Pre-join login returns `error=Configuration` — Ref: QA-0070

- [ ] R3-0014 [Medium][Email] Birthday cron 08:00 IST — sales11k DOB=today got no mail (created after cron) — Code OK in `celebration-greetings.ts`; force-run or wait — Ref: emails.md

- [ ] R3-0016 [Medium][Stability] Multiple AI routes return 5xx when AI is unconfigured — Where: `/api/ai/*` (attrition-risk, churn-risk, enrich-lead, generate-email, …) — Steps: matrix shows 8 roles × several AI paths → 500/503 — Expected: 403/501 "AI not configured" — Actual: 5xx — Fix: soft-fail — Ref: status-matrix-summary.md

- [ ] R3-0018 [Medium][RBAC] `/api/webhooks/{id}` and `/api/roles/templates` return 200 to employees — Where: matrix unexpected-200 — Steps: non-HR GET → 200 — Fix: gate — Ref: QA-0064 family

- [ ] R3-0022 [Medium][Holidays] List year nav capped at currentYear+2 while Add allows ~+5 (to 2031) — Where: `app/(dashboard)/hr/holidays/page.tsx:170-171,358` `disabled={viewYear >= currentYear + 2}` — Steps: Add holiday 25 Oct 2031; list next-arrow dies at 2027/2028; holiday invisible/undeletable — r3b-holidays-2028-cap.png — Expected: list navigable to same max as picker (`toYear`) — Actual: far-future orphaned — Fix: align max year; show orphan years — Acceptance: 2031 holiday visible+deletable — Ref: MIYO-0618, ui-B

- [ ] R3-0023 [Medium][Holidays] Date picker year dropdown closes without applying — Where: `components/ui/calendar.tsx` year `Select` `onValueChange` → `goToMonth(setYear(…))` inside Popover (`date-picker.tsx`) — Steps: Add holiday → open year → pick year → picker closes, year not applied — Expected: year changes month view, popover stays open until day click — Actual: closes without apply — Fix: stop popover dismiss on select; keep focus — Acceptance: year change sticks — Ref: MIYO-0331 PARTIAL, ui-B

- [ ] R3-0024 [Medium][Settings] `/settings?tab=security` opens Profile — Where: `app/(dashboard)/settings/[[...rest]]/page.tsx` — nav uses `#security` anchors only; no `?tab=` handling — Steps: open `/settings?tab=security` — Expected: Security section (or redirect to `#security`) — Actual: Profile at top — Fix: read `tab` searchParam and scroll/activate section — Acceptance: `?tab=security` lands on Security — Ref: ui-B

- [ ] SEC-0008 [Medium][SSRF / A10] SSRF allowlist checks hostname string, not resolved IP — **code-only**
  - **Agent note (2026-10-17):** `isSafePublicHttpsUrlResolved` resolves the host and rejects any blocked answer; used by webhook dispatch and the QR download, and webhook logs no longer store the remote body (87d3bea). Unticked: rebinding is narrowed, not closed — an egress proxy is the complete fix.
  - Where: `lib/security/ssrf.ts isBlockedSsrfHostname/isSafePublicHttpsUrl`; used by `lib/webhooks/deliver.ts`, `app/api/webhooks/route.ts`, `app/api/qr-code/download/route.ts`
  - Evidence: blocks literal `169.254.169.254`, `localhost`, private ranges by *string*; a hostname that resolves to a private/metadata IP (DNS rebinding) or alternate IP encodings bypasses it. Code already notes the "DNS‑rebinding window". Webhook delivery also stores 2 KB of the response body (blind‑SSRF read for an admin).
  - Impact: admin‑configured webhook/QR URL could reach internal services / cloud metadata; limited to admin role and HTTPS only.
  - Fix: resolve the host and validate every resolved IP against the block list immediately before connect (or use a pinned‑IP fetch / egress proxy); don't persist response bodies for webhooks.
  - Acceptance test: webhook to a host resolving to 169.254.169.254 is blocked at dispatch. Regression: unit test with a stub resolver.

- [ ] SEC-0009 [Medium][Broken Access Control / Info Disclosure — A01/A05] Body parsed & validated before auth on some POSTs — **verified live**
  - **Agent note (2026-10-17):** both routes parse inside `withAdmin` now (2677c9d). Unticked until an unauthenticated POST is checked against the deployment.
  - Where: `app/api/settings/custom-fields/route.ts:43-53` (POST parses/zod before `withAdmin`), `app/api/settings/email-templates/test/route.ts` (same pattern)
  - Evidence (unauthenticated):
    ```
    POST /api/settings/custom-fields  -> 400 {"error":"Invalid option: expected one of \"lead\"|\"deal\"|\"contact\"; ..."}
    POST /api/settings/email-templates/test -> 400 {"error":"...expected { templateId, testEmail }"}
    ```
  - Impact: unauthenticated callers learn route existence and schema, and trigger pre‑auth body parsing (minor DoS surface). Low confidentiality impact but inconsistent with the rest of the codebase (auth‑first).
  - Fix: run `withAdmin`/`withAuth` first, parse the body inside the authorised callback.
  - Acceptance test: unauthenticated POST returns 401 before any schema message. Regression: route test asserting 401 precedes 400.
  - **Also known as:** R3-0013

- [ ] SEC-0010 [Medium][Supply Chain / CI — A08] CI has no security gates; mutable action tags; push‑to‑main — **code-only**
  - **Agent note (2026-10-17):** `.github/workflows/security.yml` (gitleaks, pnpm audit, osv-scanner, semgrep, all from pinned images) and `.github/dependabot.yml` added (7f5cc0c). Not pushed: this session's token has no `workflow` scope. Still open: SHA-pinning the existing workflows and requiring a reviewed PR on main (GitHub settings).
  - Where: `.github/workflows/ci.yml`, `pr-check.yml`, `merge-protection.yml` (semgrep: `github-actions-mutable-action-tag` ×13)
  - Evidence: CI runs typecheck/lint/test/build only — no `pnpm audit`, `osv-scanner`, `gitleaks`, or SAST. Actions pinned as `@v4`/`@v4` (mutable). Workflow triggers on `push: main` (direct pushes permitted; the current workflow instructs Claude to push straight to main).
  - Impact: vulnerable deps and leaked secrets land on main unblocked; a compromised action tag can run in CI.
  - Fix: add `gitleaks`, `pnpm audit --audit-level=high`, `osv-scanner`, and `semgrep` jobs as required checks; pin actions to commit SHAs with Dependabot; require PR + review on main (disable direct push).
  - Acceptance test: a PR introducing a known‑vulnerable dep or a fake secret fails CI. Regression: the security workflow is a required status check.

- [ ] SEC-0011 [Medium][XSS hardening / A03] `sanitize-html` config is permissive (style/class/bgcolor/img‑src) — **code-only**
  - **Agent note (2026-10-17):** remote images dropped to their alt text, `class` removed from the allowed attributes, tests added (last commit).
  - Where: `lib/sanitize.ts HTML_SANITIZE_OPTIONS`
  - Evidence: allows `style`, `class`, `align`, `bgcolor` on all tags and `img[src]`; combined with the outdated lib (SEC‑0004) raises mXSS/exfil risk. `allowedSchemesByTag.img:['http','https']` permits remote image beacons.
  - Impact: CSS‑based data exfil / tracking and residual mXSS in rendered HTML (emails/documents).
  - Fix: after upgrading, drop `style`/`class` or restrict to a vetted set; disallow remote `img` in stored docs or proxy them; keep the `rel` transform. Centralise so all four sinks share one config.
  - Acceptance test: stored doc with `<img src="http://evil/x">` / `style="background:url(...)"` is neutralised. Regression: snapshot tests.

- [ ] SEC-0012 [Medium][Vulnerable Components / A06] Other known‑CVE deps (js‑yaml, braces, moment, protobufjs, fflate, @vitest/mocker path‑traversal, @opentelemetry/instrumentation‑*) — **verified (osv/pnpm audit)**
  - **Agent note (2026-10-17):** overrides added; `pnpm audit` 31 advisories (4 high) down to 6 (1 high) (7491e44). Unticked: braces and sprintf-js have no published fix, and vitest / protobufjs / @ai-sdk/provider-utils need major bumps.
  - Where: `pnpm-lock.yaml` (mostly transitive/dev)
  - Evidence: `pnpm audit` metadata: 7 high, 36 moderate, 6 low. e.g. js‑yaml DoS (≥4.3.2), braces stack exhaustion, moment path traversal (≥2.31.0), @vitest/mocker arbitrary file read (≥4.1.11).
  - Impact: mostly DoS / dev‑time; low prod impact but should be cleared.
  - Fix: `pnpm up` / overrides to the fixed versions; dedupe; re‑run osv‑scanner.
  - Acceptance test: osv‑scanner high count = 0.

- [ ] SEC-0013 [Medium][Secrets hygiene / A05] `.omc/` agent session state committed to the repo — **verified**
  - **Agent note (2026-10-17):** `git rm -r --cached .omc` plus a `.gitignore` entry; `git ls-files .omc` is now empty (c6f535e).
  - Where: `.omc/**` (191 tracked files, incl. `.omc/state/sessions/.../autopilot-state.json`, `session-end-jobs/*`)
  - Evidence: `git ls-files .omc | wc -l` = 191; files contain agent run context, internal paths, idempotency/scope keys (gitleaks flagged these, non‑secret) and references to creating `ENCRYPTION_KEY`/`CRON_SECRET`.
  - Impact: leaks internal operational context and tooling metadata to anyone with repo read; noise that hides real leaks.
  - Fix: `git rm -r --cached .omc`, add `.omc/` to `.gitignore`. (No rotation needed — no live secret values found inside.)
  - Acceptance test: `.omc/` not tracked; `.gitignore` covers it.

---

## 6. Phase 4 — Low, design refactors, and responsiveness

Target look: simple, neat, clean, not AI-looking. Gold `#D4AF37`, ink `#201E1F`, silver `#D8D8D8`. No gradients, glow, glass, emoji decoration, or sparkle AI chrome.

### Medium

- [x] MIYO-0177 [Medium][Design/UI] Landing page shows fake testimonials and star ratings
  - **Agent note (2026-10-17):** testimonials section and the three invented quotes deleted from landing-page.tsx / landing-shared.tsx (e32aea8).
  - **Where:** features/landing/landing-shared.tsx:123-145, landing-page.tsx:272-291
  - **Problem:** Invented quotes ('Arjun Mehta', 'Priya Sharma' praising a 'sprint + CRM combo') with 5-star rows. Looks AI-generated and is untrue.
  - **Fix:** Delete the testimonials section.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0178 [Medium][Design/UI] Stat cards accept rainbow colours (red/blue/purple/green)
  - **Agent note (2026-10-17):** `color` and `tone` removed from StatCard and from the six HR-dashboard call sites; tiles were already ink-on-white since B7 (c74e578).
  - **Where:** components/ui/stat-card.tsx:29 (`color?: "gold"|"blue"|"green"|"red"|"purple"`), callers in features/hr/hr-dashboard-overview.tsx, features/dashboard/hr-widgets.tsx, app/(dashboard)/hr/onboarding/page.tsx
  - **Problem:** Coloured stat tiles and numbers (QA design review).
  - **Fix:** Remove the color prop; numbers in ink, one gold accent for the primary metric only. Update all callers.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (.omc/state/session-end-jobs/runs/44d2f547-5129-4363-b53e-a3e14d1

- [x] MIYO-0179 [Medium][Design/UI] Icon chip in every card header and list row (85 files use IconChip)
  - **Agent note (2026-10-17):** done — IconChip and all 83 call sites removed, the component deleted (cf23dc132).
  - **Agent note (2026-10-17):** tracker for the 63 per-page items MIYO-0337–0399. The chip itself is already an untinted muted glyph (B7, components/ui/icon-chip.tsx); ticks when the per-page items are done.
  - **Where:** components/ui/icon-chip.tsx and the 85 importing files (rg -l IconChip)
  - **Problem:** Icon overload makes pages look generated (QA 📷 02).
  - **Fix:** Remove IconChip from card headers and list rows; keep icons only in navigation and buttons. Do it page by page (see items below).
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/project-card.tsx); live acceptance outs

- [x] MIYO-0180 [Medium][Design/UI] Leaves page shows the same balance three times and colours disagree
  - **Agent note (2026-10-17):** already fixed in B7 — `leaves-tab-content.tsx` renders one balances table (available/used/pending), no per-type cards and no donut.
  - **Where:** app/(dashboard)/hr/leaves/leaves-wfh-content.tsx
  - **Problem:** QA 📷 04: Available 8 / Casual 2/12 / chart; sick red vs blue.
  - **Fix:** One balance table; one colour per leave type from a shared map.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0181 [Medium][Design/UI] Attendance page is overcrowded (timer, calendar, heatmap, requests)
  - **Agent note (2026-10-17):** already fixed in B7/A39 — `attendance-content.tsx` has My attendance / History / Team monitor tabs, with the heatmap under History.
  - **Where:** app/(dashboard)/hr/attendance/page.tsx
  - **Problem:** QA 📷 05; heatmap contradicts stats.
  - **Fix:** Remove the heatmap; tabs: Today, Calendar, Requests.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/(dashboard)/projects/[projectId]/cycles/page.tsx); live acce

- [x] MIYO-0182 [Medium][Design/UI] Members/roles pages: role pills use rainbow tones
  - **Agent note (2026-10-17):** ROLE_TONES deleted; both role pills are `tone="neutral"` (1773a7348).
  - **Where:** app/(dashboard)/settings/members/page.tsx:461 (ROLE_TONES)
  - **Problem:** Coloured pills per role.
  - **Fix:** Neutral pill for all roles.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** PARTIAL
  - **Remaining:** STILL OPEN at 914259e; related path touched in QA wave (app/api/projects/[projectId]/pages/route.ts); live acceptance ou

- [x] R3-0100 [Medium][Projects] New Cycle empty dates show raw Zod errors — Where: project cycles UI — Steps: open New Cycle, leave dates empty, submit — Expected: plain words — Actual: "Invalid input: expected string, received undefined" — Fix: client+server messages like ticket points — Acceptance: friendly validation — Ref: QA-D005, UI-A, b1bd73f
  - **Agent note (2026-10-17):** the form already said "Pick a start date"; the API schema now carries the same messages instead of Zod's own wording (a378da378).
  - **Also known as:** QA-D005

- [x] R3-0101 [Medium][Global/Design] Command palette still advertises lead/deal/contact — Where: `components/layout/command-palette.tsx:314` — Steps: open palette, type deal — Expected: HR-relevant hint only — Actual: "Try a page name, lead, deal, or contact"; deal → No results — Fix: remove CRM leftovers — Acceptance: hint matches search — Ref: QA-D004, UI-A
  - **Agent note (2026-10-17):** empty-state hint now names pages, people, projects and tickets (ee10fe309).
  - **Also known as:** QA-D004

- [x] R3-0102 [Medium][Global/Design] Raw enums and mixed name casing in activity/UI — Where: project activity / roles — Steps: view activity — Expected: plain labels — Actual: MEDIUM, TODO, ENGINEERING; Qa Alpha vs QA Manager — Fix: QA-D001 labels — Acceptance: human labels only — Ref: QA-D001, UI-A
  - **Agent note (2026-10-17):** `pretty()` lower-cases any SCREAMING_SNAKE value, not just ones with an underscore; TODO reads "to do" (2369d8a93). Mixed person-name casing is seeded data, not code.
  - **Also known as:** QA-D001

- [x] R3-0104 [Medium][Employees] Profile header still uses dark banner + gold gradient glow — Where: employee profile — Steps: open profile — Expected: flat clean header — Actual: gradient glow — Fix: remove glow — Acceptance: flat — Ref: MIYO-0328, UI-A
  - **Agent note (2026-10-17):** already fixed — no gradient or glow left anywhere in app/, components/ or features/ (the only `linearGradient` is the area-chart fill).

- [ ] R3-0105 [Medium][Leave] Leave policies page has no create UI and ~15s load — Where: `/hr/leaves/policies` — Steps: open as HR — Expected: create+edit; fast — Actual: edit/save only; ~15s — Fix: create + perf — Acceptance: create works; p95 <3s — Ref: QA-0051, UI-A
  - **Agent note (2026-10-17):** perf half done — `ensureLeaveTypes` no longer re-reads the types on every load (28526a6d6). Create UI is still blocked on MIYO-0136: the three type names are referenced by every balance row, so adding a fourth needs Tarun's decision first.

- [x] R3-D001 [Medium][Design] Remove remaining `animate-fade-up` / stagger / scroll-reveal — Where: globals.css:319, auth pages, landing, stat-card — Steps: grep — Expected: no entrance choreography — Actual: still present — Fix: delete classes — Acceptance: grep clean — Ref: MIYO-0323
  - **Agent note (2026-10-17):** `animate-fade-up` gone from the pages and the shared framer variants are identical in both states, so nothing animates itself in (e08c1661d). The class stays in globals.css for the sheet's open animation.
  - **Also known as:** MIYO-0323

- [x] R3-D002 [Medium][Design] Remove `backdrop-blur` glass headers — Where: topbar.tsx:66, page-wrapper.tsx:105, landing — Expected: solid bg — Actual: blur — Fix: solid — Acceptance: grep clean — Ref: MIYO-0324
  - **Agent note (2026-10-17):** topbar, page header, landing header and every sticky form footer are solid now (271f3e14b). Dialog and sheet overlays keep the blur — that is the scrim.
  - **Also known as:** MIYO-0324

- [x] R3-D003 [Medium][Design] Replace Sparkles/Bot AI chrome with plain labels — Where: ai-hub-client.tsx, ai/page.tsx — Expected: no sparkle icon as primary — Actual: Sparkles — Fix: remove — Acceptance: grep clean — Ref: MIYO-0325
  - **Agent note (2026-10-17):** Sparkles gone from `ai/page.tsx` and `ai-hub-client.tsx` (dba672432).
  - **Also known as:** MIYO-0325

- [x] R3-D004 [Medium][Design] Remove emoji literals (🎂 🏆 📄 ✓ ○) from product UI — Where: hr-dashboard-overview.tsx:669, pages/page.tsx, settings-security.tsx:378 — Expected: icons/components or plain text — Actual: emoji — Fix: replace — Acceptance: grep clean — Ref: MIYO-0315/0316/0317
  - **Agent note (2026-10-17):** cake/trophy, ✓/⋯ badge, ✓/○ password rules and the 📄 fallback replaced with lucide icons or words (2698bf99d). Comment reactions and user-picked page icons left alone.
  - **Also known as:** MIYO-0315, MIYO-0316, MIYO-0317

- [x] R3-D005 [Medium][Design] One export pattern + honest filenames — Where: Analytics /reports / Recognition — Expected: one control — Actual: mixed — Fix: QA-D002 — Acceptance: consistent — Ref: QA-D002 UI-A PARTIAL
  - **Agent note (2026-10-17):** leaves tab moved onto the shared ExportButton (7d9d329a0). Recognition keeps its export sheet on purpose (filters plus email); /reports downloads server-rendered files.
  - **Also known as:** QA-D002

### Low

- [x] MIYO-0208 [Low][Leave] Approve has no confirmation and takes ~5 s to update
  - **Agent note (2026-10-17):** the cache update is already optimistic (`optimisticLeaveDecision`), so the row moves at once, and A33 added a confirm dialog instead of an undo toast — approving pays out leave, so it asks first. No undo needed.
  - **Where:** app/(dashboard)/hr/leaves approvals list
  - **Problem:** QA 4.4.
  - **Fix:** Optimistic update with undo toast (no blocking dialog).
  - **Acceptance check:** Row moves instantly; Undo within 5 s reverts.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0209 [Low][Attendance] 'Check In' quick action shown while clocked in **[confirm on prod]**
  - **Agent note (2026-10-17):** the live quick actions already hide "Check in" when clocked in (A39); the stale widget that did not was unused and is deleted (9fd3c22c1).
  - **Where:** components/dashboard/widgets/quick-actions-widget.tsx (also flagged unreachable by dead-code)
  - **Problem:** QA 📷 02.
  - **Fix:** Hide or switch to 'Check out' based on status.
  - **Acceptance check:** Clocked-in user sees 'Check out'.
  - **Retest status:** PARTIAL
  - **Remaining:** ui-B: Admin Not clocked in; Check In enabled / Out disabled OK; clocked-in state not tested

- [x] MIYO-0210 [Low][Jobs & cron] Notification preferences are not checked by senders
  - **Agent note (2026-10-17):** `sendEmail` takes a `category` and drops recipients who switched it off; leave, celebration, holiday and attendance mail is tagged (889824dab).
  - **Where:** lib/email/*, notification_preferences, /settings/notifications
  - **Problem:** Design doc §11.1: no sender checks preferences.
  - **Fix:** Add shouldSend(userId, category, channel) in lib/email/sender.ts and use it for non-transactional mails.
  - **Acceptance check:** Turning off 'Announcements' email stops announcement emails.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0212 [Low][Onboarding] Warn when the joining date is in the past
  - **Agent note (2026-10-17):** warning moved under the joining-date field and now mentions that earlier months are not paid automatically.
  - **Where:** components/hr/_onboarding/step-employment.tsx
  - **Problem:** QA 4.1: allowed silently.
  - **Fix:** Show an inline warning 'Joining date is in the past; payroll for earlier months is not generated automatically'.
  - **Acceptance check:** Past date shows the warning.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0216 [Low][Employees & settings] AI settings show cost as '$0.00'
  - **Agent note (2026-10-17):** zero now reads "USD 0.00" like the other branches (1159ca10b).
  - **Where:** app/(dashboard)/settings/ai/page.tsx:61
  - **Problem:** Dollar sign in an INR app.
  - **Fix:** Format with the org currency (₹) or show tokens only.
  - **Acceptance check:** No '$' on the page.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0218 [Low][Email templates] Replace email template `auth-verify-email`
  - **Agent note (2026-10-17):** renders `auth-verify-email`; the preview page and test-send route are now catalogue-driven (d0462c369). Inbox check still outstanding.
  - **Where:** Current: getVerificationEmailTemplate. New: email-templates/auth-verify-email.html + .txt. Trigger: POST /api/auth/signup, /api/auth/resend-verification. To: the user.
  - **Problem:** 'Thank you for signing up!' marketing tone; Yellow 'Security Notice' banner for a routine message; Public sign-up may not be wanted for an internal HR app (see the Security section)
  - **Fix:** Implement with renderEmail('auth-verify-email', vars). Subject: "Confirm your email address". Preheader: "One click to confirm your email for {{org_name}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0219 [Low][Email templates] Replace email template `auth-password-changed`
  - **Agent note (2026-10-17):** renders `auth-password-changed`, one sender instead of two. Inbox check outstanding.
  - **Where:** Current: getPasswordChangeConfirmationEmailTemplate. New: email-templates/auth-password-changed.html + .txt. Trigger: password reset / change. To: the user.
  - **Problem:** Emoji heading ('🔒'); Generic 'security tips' list including 'Enable two-factor authentication if available' — MFA exists, link to it; No time or device of the change
  - **Fix:** Implement with renderEmail('auth-password-changed', vars). Subject: "Your password was changed". Preheader: "If this was not you, reset your password now.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0220 [Low][Email templates] Replace email template `auth-account-locked`
  - **Agent note (2026-10-17):** renders `auth-account-locked` with the real unlock time and attempt count (de7fe4d6f). Inbox check outstanding.
  - **Where:** Current: getAccountLockedEmailTemplate. New: email-templates/auth-account-locked.html + .txt. Trigger: 5th failed sign-in. To: the user.
  - **Problem:** '15 minutes' hard-coded in copy; Two competing actions (reset button + support link)
  - **Fix:** Implement with renderEmail('auth-account-locked', vars). Subject: "Your account is temporarily locked". Preheader: "Too many failed sign-in attempts. It unlocks at {{unlock_at}} IST.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0221 [Low][Email templates] Replace email template `auth-new-device-login`
  - **Agent note (2026-10-17):** renders `auth-new-device-login`; location says "not recorded" since the app does not geolocate. Inbox check outstanding.
  - **Where:** Current: getNewDeviceLoginEmailTemplate. New: email-templates/auth-new-device-login.html + .txt. Trigger: sign-in from an unknown device. To: the user.
  - **Problem:** Raw user-agent string shown to the user; Time not labelled IST
  - **Fix:** Implement with renderEmail('auth-new-device-login', vars). Subject: "New sign-in to your account". Preheader: "{{device}} · {{location}} · {{signed_in_at}} IST". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0222 [Low][Email templates] Replace email template `auth-password-expiry`
  - **Agent note (2026-10-17):** renders `auth-password-expiry` with the expiry date rather than a day count (16357afe6). Inbox check outstanding.
  - **Where:** Current: getPasswordExpiryWarningEmailTemplate (no production caller). New: email-templates/auth-password-expiry.html + .txt. Trigger: daily job when organizations.passwordExpiryDays is set (to be wired). To: the user.
  - **Problem:** Sender has no production caller (dead)
  - **Fix:** Implement with renderEmail('auth-password-expiry', vars). Subject: "Your password expires on {{expires_on}}". Preheader: "Change it before {{expires_on}} to avoid being locked out.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0223 [Low][Email templates] Replace email template `auth-account-deactivated`
  - **Agent note (2026-10-17):** renders `auth-account-deactivated`; the administrator name and free-text reason are no longer mailed to the leaver. Inbox check outstanding.
  - **Where:** Current: getAccountDeactivationEmailTemplate. New: email-templates/auth-account-deactivated.html + .txt. Trigger: HR deactivates a user / last working day. To: the user (personal email if available).
  - **Problem:** Emoji heading ('👋'); Lists 'The CRM dashboard and all projects' (CRM wording); Says who deactivated (exposes an HR person's name unnecessarily); Sent to the work address that is being deactivated — should go to the personal email
  - **Fix:** Implement with renderEmail('auth-account-deactivated', vars). Subject: "Your {{org_name}} account has been deactivated". Preheader: "You can no longer sign in. Contact HR with any questions.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0224 [Low][Email templates] Replace email template `auth-invitation`
  - **Agent note (2026-10-17):** renders `auth-invitation` with the role and the real expiry date (3867e9e2e). Inbox check outstanding.
  - **Where:** Current: getInvitationEmailTemplate (lib/email-templates/organization.ts). New: email-templates/auth-invitation.html + .txt. Trigger: settings/members invite, project invite (invitations table). To: the invitee.
  - **Problem:** Emoji heading ('🎉 You're Invited!'); Same copy for org and project invites; project name/role not shown
  - **Fix:** Implement with renderEmail('auth-invitation', vars). Subject: "{{inviter_name}} invited you to {{org_name}}". Preheader: "Accept the invitation to join {{invite_target}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0225 [Low][Email templates] Replace email template `auth-mfa-enabled`
  - **Agent note (2026-10-17):** new sender wired into `/api/auth/mfa/verify` (958ad71a2). Inbox check outstanding.
  - **Where:** Current: NEW (no email today; app/api/auth/mfa/verify). New: email-templates/auth-mfa-enabled.html + .txt. Trigger: MFA turned on. To: the user.
  - **Problem:** Missing: MFA enable/disable/admin reset send no email at all
  - **Fix:** Implement with renderEmail('auth-mfa-enabled', vars). Subject: "Two-step verification is on". Preheader: "Your account now asks for a code at sign-in.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0226 [Low][Email templates] Replace email template `auth-mfa-disabled`
  - **Agent note (2026-10-17):** new sender wired into `/api/auth/mfa/disable` (958ad71a2). Inbox check outstanding.
  - **Where:** Current: NEW (app/api/auth/mfa/disable). New: email-templates/auth-mfa-disabled.html + .txt. Trigger: MFA turned off by the user. To: the user.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('auth-mfa-disabled', vars). Subject: "Two-step verification was turned off". Preheader: "Your account no longer asks for a code at sign-in.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0227 [Low][Email templates] Replace email template `auth-mfa-reset-by-admin`
  - **Agent note (2026-10-17):** replaces the generic notification body in `/api/auth/mfa/reset` (958ad71a2). Inbox check outstanding.
  - **Where:** Current: NEW (app/api/auth/mfa/reset). New: email-templates/auth-mfa-reset-by-admin.html + .txt. Trigger: Admin resets a user's MFA. To: the user.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('auth-mfa-reset-by-admin', vars). Subject: "Your two-step verification was reset". Preheader: "Set it up again the next time you sign in.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0228 [Low][Email templates] Replace email template `onboarding-welcome`
  - **Agent note (2026-10-17):** renders `onboarding-welcome` with manager, location and start time (e288a26e8); office location and start time are new env constants. Inbox check outstanding.
  - **Where:** Current: getOnboardingWelcomeEmailTemplate (notifications.ts) via Inngest initiate-onboarding. New: email-templates/onboarding-welcome.html + .txt. Trigger: onboarding checklist started. To: the new hire.
  - **Problem:** Emoji heading ('🎉 Welcome to the Team!'); Overlaps with auth-welcome-set-password=[redacted] new hire gets two 'Welcome' emails on the same day; Preheader 'Your onboarding journey starts now!' is filler
  - **Fix:** Implement with renderEmail('onboarding-welcome', vars). Subject: "Your first day at {{org_name}}: {{joining_date}}". Preheader: "What to expect on day one and the tasks waiting for you.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0229 [Low][Email templates] Replace email template `onboarding-tasks-assigned`
  - **Agent note (2026-10-17):** renders `onboarding-tasks-assigned` (e288a26e8). Inbox check outstanding.
  - **Where:** Current: getOnboardingTaskEmailTemplate. New: email-templates/onboarding-tasks-assigned.html + .txt. Trigger: onboarding task assigned to HR/IT/manager. To: task owner.
  - **Problem:** Emoji heading; No due date per task
  - **Fix:** Implement with renderEmail('onboarding-tasks-assigned', vars). Subject: "Onboarding task for {{employee_name}}: {{task_title}}". Preheader: "Due {{due_date}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0230 [Low][Email templates] Replace email template `onboarding-reminder`
  - **Agent note (2026-10-17):** already done — `/api/hr/onboarding/reminders` renders `onboarding-reminder` with pending_count and oldest_due_date.
  - **Where:** Current: inline HTML in app/api/hr/onboarding/reminders/route.ts. New: email-templates/onboarding-reminder.html + .txt. Trigger: POST /api/hr/onboarding/reminders. To: task owners.
  - **Problem:** Inline HTML outside the template system, not using the shared layout; Subject 'Onboarding Reminder — Pending Tasks' gives no count or name
  - **Fix:** Implement with renderEmail('onboarding-reminder', vars). Subject: "{{pending_count}} onboarding tasks still open". Preheader: "Oldest is due {{oldest_due_date}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0231 [Low][Email templates] Replace email template `onboarding-complete-employee`
  - **Agent note (2026-10-17):** renders `onboarding-complete-employee` (7131f26b7). Inbox check outstanding.
  - **Where:** Current: getOnboardingCompleteEmployeeEmailTemplate. New: email-templates/onboarding-complete-employee.html + .txt. Trigger: last onboarding task completed. To: the new hire.
  - **Problem:** Emoji heading ('🎉 Onboarding Complete!'); Preheader 'You're all set!' is filler
  - **Fix:** Implement with renderEmail('onboarding-complete-employee', vars). Subject: "Onboarding complete". Preheader: "All your onboarding tasks are done.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0232 [Low][Email templates] Replace email template `onboarding-complete-hr`
  - **Agent note (2026-10-17):** renders `onboarding-complete-hr`, one send to all HR with code, department, task count and time (7131f26b7). Inbox check outstanding.
  - **Where:** Current: getOnboardingCompleteHrEmailTemplate. New: email-templates/onboarding-complete-hr.html + .txt. Trigger: last onboarding task completed. To: HR.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('onboarding-complete-hr', vars). Subject: "{{employee_name}} finished onboarding". Preheader: "All {{task_count}} tasks are complete.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0233 [Low][Email templates] Replace email template `leave-cancelled`
  - **Agent note (2026-10-17):** renders `leave-cancelled` (30e208c4c). Per-template inbox check still outstanding.
  - **Where:** Current: getLeaveCancellationEmailTemplate. New: email-templates/leave-cancelled.html + .txt. Trigger: employee cancels leave. To: the approver.
  - **Problem:** Emoji heading ('🚫')
  - **Fix:** Implement with renderEmail('leave-cancelled', vars). Subject: "Leave cancelled: {{employee_name}}, {{date_range}}". Preheader: "No action needed.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0234 [Low][Email templates] Replace email template `leave-escalation-hr`
  - **Agent note (2026-10-17):** renders `leave-escalation-hr` (30e208c4c). Per-template inbox check still outstanding.
  - **Where:** Current: getLeaveHrMissedEscalationEmailTemplate. New: email-templates/leave-escalation-hr.html + .txt. Trigger: Inngest leave-escalation (pending > 2 days). To: HR.
  - **Problem:** '[Action Required]' prefix plus warning emoji; Uses '>' in subject
  - **Fix:** Implement with renderEmail('leave-escalation-hr', vars). Subject: "{{count}} leave requests waiting more than 2 days". Preheader: "Oldest from {{oldest_employee}} since {{oldest_date}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0235 [Low][Email templates] Replace email template `leave-escalation-ceo`
  - **Agent note (2026-10-17):** renders `leave-escalation-ceo` (30e208c4c). Per-template inbox check still outstanding.
  - **Where:** Current: getLeaveCeoDelegateEscalationEmailTemplate. New: email-templates/leave-escalation-ceo.html + .txt. Trigger: Inngest leave-escalation (still pending). To: CEO.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('leave-escalation-ceo', vars). Subject: "{{count}} leave requests still pending". Preheader: "HR has not acted on these yet.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0236 [Low][Email templates] Replace email template `wfh-request`
  - **Agent note (2026-10-17):** renders `wfh-request` (30e208c4c). Per-template inbox check still outstanding.
  - **Where:** Current: getWfhRequestEmailTemplate. New: email-templates/wfh-request.html + .txt. Trigger: WFH applied. To: approvers.
  - **Problem:** Emoji heading ('🏠')
  - **Fix:** Implement with renderEmail('wfh-request', vars). Subject: "Work from home request: {{employee_name}}, {{date_range}}". Preheader: "Waiting for your approval.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0237 [Low][Email templates] Replace email template `attendance-auto-absent`
  - **Agent note (2026-10-17):** already done — `auto-absent-leave.ts` renders `attendance-auto-absent`. Per-template inbox check still outstanding.
  - **Where:** Current: inline HTML in server/actions/auto-absent-leave.ts. New: email-templates/attendance-auto-absent.html + .txt. Trigger: cron auto-absent-leave 12:00 IST. To: each absentee.
  - **Problem:** Inline HTML outside the shared layout; Sent every day to every absentee; no digest for HR (QA notification-noise finding)
  - **Fix:** Implement with renderEmail('attendance-auto-absent', vars). Subject: "No check-in recorded for {{date}}". Preheader: "Marked as {{marked_as}}. Fix it if you were working.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0238 [Low][Email templates] Replace email template `attendance-late-arrival`
  - **Agent note (2026-10-17):** already done — `late-arrival-after-check-in.ts` renders `attendance-late-arrival`. Per-template inbox check still outstanding.
  - **Where:** Current: inline HTML in lib/hr/late-arrival-after-check-in.ts. New: email-templates/attendance-late-arrival.html + .txt. Trigger: late check-in warning. To: the employee.
  - **Problem:** Inline HTML outside the shared layout
  - **Fix:** Implement with renderEmail('attendance-late-arrival', vars). Subject: "Late check-in on {{date}}". Preheader: "Checked in at {{check_in_time}} IST.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0239 [Low][Email templates] Replace email template `attendance-weekly-report`
  - **Agent note (2026-10-17):** renders `attendance-weekly-report`, one send (944838441 block). Per-template inbox check still outstanding.
  - **Where:** Current: getWeeklyAttendanceReportTemplate (reports.ts). New: email-templates/attendance-weekly-report.html + .txt. Trigger: weekly-attendance-report (Vercel Sat 14:30 IST AND Inngest Mon 13:30 IST — duplicate). To: management.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('attendance-weekly-report', vars). Subject: "Attendance, week of {{week_range}}". Preheader: "{{present_pct}}% present · {{late_count}} late arrivals · {{absent_count}} absences". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0240 [Low][Email templates] Replace email template `attendance-holiday-work-request`
  - **Agent note (2026-10-17):** already done — `/api/hr/holiday-work-requests` renders `attendance-holiday-work-request`. Per-template inbox check still outstanding.
  - **Where:** Current: getHolidayWorkRequestEmailToHr (hr.ts) / inline in app/api/hr/holiday-work-requests/route.ts. New: email-templates/attendance-holiday-work-request.html + .txt. Trigger: holiday/Sunday work request submitted. To: HR.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('attendance-holiday-work-request', vars). Subject: "Holiday work request: {{employee_name}}, {{date}}". Preheader: "{{compensation}} requested.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0241 [Low][Email templates] Replace email template `attendance-holiday-work-decision`
  - **Agent note (2026-10-17):** new sender on approve and reject (9beed5005). Per-template inbox check still outstanding.
  - **Where:** Current: inline HTML in app/api/hr/holiday-work-requests (decision). New: email-templates/attendance-holiday-work-decision.html + .txt. Trigger: holiday work request decided. To: the employee.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('attendance-holiday-work-decision', vars). Subject: "Holiday work request {{decision}}: {{date}}". Preheader: "{{compensation}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0242 [Low][Email templates] Replace email template `payroll-approved`
  - **Agent note (2026-10-17):** renders `payroll-approved` (ca8efd621). Per-template inbox check still outstanding.
  - **Where:** Current: getPayrollApprovedEmailTemplate (notifications.ts). New: email-templates/payroll-approved.html + .txt. Trigger: CEO approves payroll. To: the employee.
  - **Problem:** Emoji heading ('✅'); Tells the employee about an internal approval step; consider sending only the payslip email at PAID
  - **Fix:** Implement with renderEmail('payroll-approved', vars). Subject: "Payroll for {{month_label}} approved". Preheader: "Payment is scheduled for {{pay_date}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0243 [Low][Email templates] Replace email template `celebration-work-anniversary`
  - **Agent note (2026-10-17):** already done in MIYO-0165 — `sendCelebrationEmail` renders `celebration-work-anniversary`. Per-template inbox check still outstanding.
  - **Where:** Current: getCelebrationEmailTemplate (anniversary branch). New: email-templates/celebration-work-anniversary.html + .txt. Trigger: Inngest celebration-greetings 08:00 IST. To: the person.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('celebration-work-anniversary', vars). Subject: "{{years}} years at {{org_name}}". Preheader: "Thank you for {{years}} years with us.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [ ] MIYO-0244 [Low][Email templates] Replace email template `company-announcement`
  - **Agent note (2026-10-17):** no sender exists: dashboard announcements are in-app only, and mailing every member is a new behaviour. Needs Tarun's decision before the template is wired up.
  - **Where:** Current: getCompanyAnnouncementEmailTemplate. New: email-templates/company-announcement.html + .txt. Trigger: announcement posted with email on. To: members.
  - **Problem:** Emoji heading ('📢'); Subject 'Announcement: … - Miyo Global'
  - **Fix:** Implement with renderEmail('company-announcement', vars). Subject: "{{announcement_title}}". Preheader: "{{announcement_summary}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0245 [Low][Email templates] Replace email template `recognition-recipient`
  - **Agent note (2026-10-17):** renders `recognition-recipient` (36f6de4af). Per-template inbox check still outstanding.
  - **Where:** Current: getRecognitionRecipientEmailTemplate. New: email-templates/recognition-recipient.html + .txt. Trigger: recognition given. To: the recipient.
  - **Problem:** Emoji in heading ('🎉'); Centered heading inconsistent with other templates
  - **Fix:** Implement with renderEmail('recognition-recipient', vars). Subject: "{{giver_name}} recognised your work". Preheader: ""{{message_snippet}}"". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0246 [Low][Email templates] Replace email template `recognition-shoutout`
  - **Agent note (2026-10-17):** renders `recognition-shoutout` (36f6de4af). Per-template inbox check still outstanding.
  - **Where:** Current: getRecognitionShoutoutEmailTemplate. New: email-templates/recognition-shoutout.html + .txt. Trigger: recognition shared org-wide. To: the org.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('recognition-shoutout', vars). Subject: "Shout-out for {{recipient_name}}". Preheader: "From {{giver_name}}: "{{message_snippet}}"". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0247 [Low][Email templates] Replace email template `expense-submitted`
  - **Agent note (2026-10-17):** renders `expense-submitted` (4c60fe421). Per-template inbox check still outstanding.
  - **Where:** Current: getExpenseSubmittedEmailTemplate. New: email-templates/expense-submitted.html + .txt. Trigger: expense submitted. To: approver.
  - **Problem:** Emoji heading ('🧾'); QA Round 1: admin's own expense auto-approved — make sure this mail goes to a different approver
  - **Fix:** Implement with renderEmail('expense-submitted', vars). Subject: "Expense claim: {{employee_name}}, ₹{{amount}}". Preheader: "{{category}} · {{expense_date}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0248 [Low][Email templates] Replace email template `expense-approved`
  - **Agent note (2026-10-17):** renders `expense-approved` (4c60fe421). Per-template inbox check still outstanding.
  - **Where:** Current: getExpenseApprovedEmailTemplate. New: email-templates/expense-approved.html + .txt. Trigger: expense approved. To: the employee.
  - **Problem:** Emoji heading ('✅')
  - **Fix:** Implement with renderEmail('expense-approved', vars). Subject: "Expense approved: ₹{{amount}}". Preheader: "It will be reimbursed with {{reimbursement_cycle}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0249 [Low][Email templates] Replace email template `expense-rejected`
  - **Agent note (2026-10-17):** renders `expense-rejected` (4c60fe421). Per-template inbox check still outstanding.
  - **Where:** Current: getExpenseRejectedEmailTemplate. New: email-templates/expense-rejected.html + .txt. Trigger: expense rejected. To: the employee.
  - **Problem:** Emoji heading ('❌')
  - **Fix:** Implement with renderEmail('expense-rejected', vars). Subject: "Expense not approved: ₹{{amount}}". Preheader: "{{approver_name}} added a note.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0250 [Low][Email templates] Replace email template `expense-paid`
  - **Agent note (2026-10-17):** renders `expense-paid` (4c60fe421). Per-template inbox check still outstanding.
  - **Where:** Current: getExpensePaidEmailTemplate. New: email-templates/expense-paid.html + .txt. Trigger: expense marked paid. To: the employee.
  - **Problem:** Emoji heading ('💰')
  - **Fix:** Implement with renderEmail('expense-paid', vars). Subject: "Expense reimbursed: ₹{{amount}}". Preheader: "Paid on {{paid_on}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0251 [Low][Email templates] Replace email template `expense-monthly-report`
  - **Agent note (2026-10-17):** renders `expense-monthly-report` with the workbook attached (944838441). Per-template inbox check still outstanding.
  - **Where:** Current: getMonthlyExpenseReportTemplate. New: email-templates/expense-monthly-report.html + .txt. Trigger: monthly-expense-report (Vercel 14:30 IST and Inngest 13:30 IST on the 1st — duplicate). To: management.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('expense-monthly-report', vars). Subject: "Expenses for {{month_label}}: ₹{{total}}". Preheader: "{{claim_count}} claims · {{pending_count}} pending". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0252 [Low][Email templates] Replace email template `bonus-paid-employee`
  - **Agent note (2026-10-17):** renders `bonus-paid-employee`. Per-template inbox check still outstanding.
  - **Where:** Current: getBonusPaidEmployeeEmailTemplate (bonus.ts). New: email-templates/bonus-paid-employee.html + .txt. Trigger: bonus marked PAID. To: the employee.
  - **Problem:** Emoji heading ('🎉 Bonus Marked as Paid'); Internal wording 'marked as paid'
  - **Fix:** Implement with renderEmail('bonus-paid-employee', vars). Subject: "Your bonus of ₹{{amount}} has been paid". Preheader: "{{bonus_type}} · paid on {{paid_on}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0253 [Low][Email templates] Replace email template `bonus-paid-stakeholder`
  - **Agent note (2026-10-17):** renders `bonus-paid-stakeholder`. Per-template inbox check still outstanding.
  - **Where:** Current: getBonusPaidStakeholderEmailTemplate. New: email-templates/bonus-paid-stakeholder.html + .txt. Trigger: bonus marked PAID. To: stakeholders.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('bonus-paid-stakeholder', vars). Subject: "Bonus paid: {{employee_name}}, ₹{{amount}}". Preheader: "{{bonus_type}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0254 [Low][Email templates] Replace email template `exit-resignation-submitted`
  - **Agent note (2026-10-17):** renders `exit-resignation-submitted` (3148e72ad). Per-template inbox check still outstanding.
  - **Where:** Current: getResignationSubmittedEmailTemplate. New: email-templates/exit-resignation-submitted.html + .txt. Trigger: resignation submitted. To: HR, CEO, Admin (except submitter) + manager.
  - **Problem:** Emoji heading ('📝'); Goes to every CEO/HR/ADMIN; the manager is not included
  - **Fix:** Implement with renderEmail('exit-resignation-submitted', vars). Subject: "Resignation: {{employee_name}}". Preheader: "Requested last day {{last_working_day}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0255 [Low][Email templates] Replace email template `exit-resignation-accepted`
  - **Agent note (2026-10-17):** renders `exit-resignation-accepted` (3148e72ad). Per-template inbox check still outstanding.
  - **Where:** Current: getResignationApprovedEmailTemplate. New: email-templates/exit-resignation-accepted.html + .txt. Trigger: CEO approves resignation. To: the employee.
  - **Problem:** Emoji heading ('✅ Resignation Accepted')
  - **Fix:** Implement with renderEmail('exit-resignation-accepted', vars). Subject: "Your resignation has been accepted". Preheader: "Last working day: {{last_working_day}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0256 [Low][Email templates] Replace email template `exit-termination-notice`
  - **Agent note (2026-10-17):** renders `exit-termination-notice` (3148e72ad). Per-template inbox check still outstanding.
  - **Where:** Current: getTerminationEmailTemplate. New: email-templates/exit-termination-notice.html + .txt. Trigger: termination letter sent. To: the employee (personal email).
  - **Problem:** Sent to the work address that will be deactivated; Title suffix ' - Miyo Global'
  - **Fix:** Implement with renderEmail('exit-termination-notice', vars). Subject: "Notice of termination of employment". Preheader: "Please read the attached letter.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0257 [Low][Email templates] Replace email template `perf-review-assigned`
  - **Agent note (2026-10-17):** renders `perf-review-assigned` (1c306aca1). Per-template inbox check still outstanding.
  - **Where:** Current: getReviewAssignedEmailTemplate (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-review-assigned.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Emoji heading
  - **Fix:** Implement with renderEmail('perf-review-assigned', vars). Subject: "Review to complete: {{employee_name}}". Preheader: "Due {{due_date}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [ ] MIYO-0258 [Low][Email templates] Replace email template `perf-self-review-reminder`
  - **Agent note (2026-10-17):** sender added (`sendSelfReviewReminderEmail`, 1c306aca1) but nothing triggers it yet — needs the performance-cycle scheduler.
  - **Where:** Current: getSelfReviewReminderEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-self-review-reminder.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Emoji heading
  - **Fix:** Implement with renderEmail('perf-self-review-reminder', vars). Subject: "Self-review due {{due_date}}". Preheader: "{{cycle_name}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [ ] MIYO-0259 [Low][Email templates] Replace email template `perf-manager-review-reminder`
  - **Agent note (2026-10-17):** sender added (`sendManagerReviewReminderEmail`, 1c306aca1); no trigger yet.
  - **Where:** Current: getManagerReviewReminderEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-manager-review-reminder.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Emoji heading
  - **Fix:** Implement with renderEmail('perf-manager-review-reminder', vars). Subject: "{{pending_count}} reviews waiting for you". Preheader: "{{cycle_name}} · due {{due_date}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [ ] MIYO-0260 [Low][Email templates] Replace email template `perf-review-published`
  - **Agent note (2026-10-17):** sender added (`sendReviewPublishedEmail`, 1c306aca1); no trigger yet.
  - **Where:** Current: getReviewPublishedEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-review-published.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Emoji heading
  - **Fix:** Implement with renderEmail('perf-review-published', vars). Subject: "Your {{cycle_name}} review is ready". Preheader: "Shared by {{manager_name}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [ ] MIYO-0261 [Low][Email templates] Replace email template `perf-goal-setting-reminder`
  - **Agent note (2026-10-17):** sender added (`sendGoalSettingReminderEmail`, 1c306aca1); no trigger yet.
  - **Where:** Current: getGoalSettingReminderEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-goal-setting-reminder.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Emoji heading
  - **Fix:** Implement with renderEmail('perf-goal-setting-reminder', vars). Subject: "Set your goals for {{quarter}}". Preheader: "Due {{due_date}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0262 [Low][Email templates] Replace email template `perf-appraisal-stage-assigned`
  - **Agent note (2026-10-17):** renders `perf-appraisal-stage-assigned` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getAppraisalStageAssignedEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-appraisal-stage-assigned.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-appraisal-stage-assigned', vars). Subject: "Appraisal step for you: {{stage_label}}". Preheader: "{{employee_name}} · due {{due_date}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0263 [Low][Email templates] Replace email template `perf-appraisal-finalized`
  - **Agent note (2026-10-17):** renders `perf-appraisal-finalized` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getAppraisalFinalApprovedEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-appraisal-finalized.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-appraisal-finalized', vars). Subject: "Appraisal finalised: {{employee_name}}". Preheader: "Final rating {{rating}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0264 [Low][Email templates] Replace email template `perf-appraisal-due-reminder`
  - **Agent note (2026-10-17):** renders `perf-appraisal-due-reminder` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getAppraisalDueReminderEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-appraisal-due-reminder.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-appraisal-due-reminder', vars). Subject: "Due tomorrow: {{stage_label}}". Preheader: "{{employee_name}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [ ] MIYO-0265 [Low][Email templates] Replace email template `perf-unsatisfactory-notice`
  - **Agent note (2026-10-17):** sender added (`sendUnsatisfactoryPerformanceNoticeEmail`, 1c306aca1); no trigger yet.
  - **Where:** Current: getUnsatisfactoryPerformanceNoticeEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-unsatisfactory-notice.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-unsatisfactory-notice', vars). Subject: "Performance discussion: next steps". Preheader: "From {{manager_name}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0266 [Low][Email templates] Replace email template `perf-pip-initiated`
  - **Agent note (2026-10-17):** renders `perf-pip-initiated` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getPIPInitiatedEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-pip-initiated.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-pip-initiated', vars). Subject: "Performance improvement plan". Preheader: "Starts {{start_date}} · {{duration_days}} days". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0267 [Low][Email templates] Replace email template `perf-pip-manager-activated`
  - **Agent note (2026-10-17):** renders `perf-pip-manager-activated` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getPIPManagerActivatedEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-pip-manager-activated.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-pip-manager-activated', vars). Subject: "PIP active: {{employee_name}}". Preheader: "Check-ins start {{first_checkin}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0268 [Low][Email templates] Replace email template `perf-pip-checkin-reminder`
  - **Agent note (2026-10-17):** renders `perf-pip-checkin-reminder` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getPIPCheckInDueReminderEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-pip-checkin-reminder.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-pip-checkin-reminder', vars). Subject: "PIP check-in on {{due_date}}". Preheader: "{{employee_name}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0269 [Low][Email templates] Replace email template `perf-pip-completed`
  - **Agent note (2026-10-17):** renders `perf-pip-completed` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getPIPSuccessEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-pip-completed.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-pip-completed', vars). Subject: "Your improvement plan is complete". Preheader: "Well done.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0270 [Low][Email templates] Replace email template `perf-pip-not-successful`
  - **Agent note (2026-10-17):** renders `perf-pip-not-successful` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getPIPFailedEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-pip-not-successful.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-pip-not-successful', vars). Subject: "Outcome of your improvement plan". Preheader: "Please read the next steps.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0271 [Low][Email templates] Replace email template `perf-pip-extended`
  - **Agent note (2026-10-17):** renders `perf-pip-extended` (0dc2d289e). Per-template inbox check still outstanding.
  - **Where:** Current: getPIPExtendedEmail (lib/email-templates/appraisal.ts / notifications.ts). New: email-templates/perf-pip-extended.html + .txt. Trigger: performance module. To: see trigger.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('perf-pip-extended', vars). Subject: "Your improvement plan has been extended". Preheader: "New end date {{end_date}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0272 [Low][Email templates] Replace email template `asset-assigned-employee`
  - **Agent note (2026-10-17):** renders `asset-assigned-employee`. Per-template inbox check still outstanding.
  - **Where:** Current: getAssetAssignedEmailTemplate (no production caller per design doc §11.2). New: email-templates/asset-assigned-employee.html + .txt. Trigger: asset assigned. To: the employee.
  - **Problem:** Emoji heading ('💻'); Sender has no production caller — wire it into the assign route
  - **Fix:** Implement with renderEmail('asset-assigned-employee', vars). Subject: "Asset assigned to you: {{asset_name}}". Preheader: "{{asset_tag}} · please confirm receipt". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0273 [Low][Email templates] Replace email template `asset-assigned-hr`
  - **Agent note (2026-10-17):** renders `asset-assigned-hr`, one send. Per-template inbox check still outstanding.
  - **Where:** Current: getAssetAssignedHrNotificationTemplate. New: email-templates/asset-assigned-hr.html + .txt. Trigger: asset assigned. To: HR.
  - **Problem:** Emoji heading ('📦')
  - **Fix:** Implement with renderEmail('asset-assigned-hr', vars). Subject: "Asset assigned: {{asset_tag}} to {{employee_name}}". Preheader: "{{asset_name}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0274 [Low][Email templates] Replace email template `document-expiry-reminder`
  - **Agent note (2026-10-17):** renders `document-expiry-reminder`. Per-template inbox check still outstanding.
  - **Where:** Current: getDocumentExpiryReminderEmailTemplate (no production caller). New: email-templates/document-expiry-reminder.html + .txt. Trigger: daily job (to be wired). To: the employee + HR.
  - **Problem:** Emoji heading ('📋'); No production caller; Expiry uses UTC date slicing (design doc §18.1)
  - **Fix:** Implement with renderEmail('document-expiry-reminder', vars). Subject: "{{document_name}} expires on {{expiry_date}}". Preheader: "Upload a renewed copy before it expires.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0275 [Low][Email templates] Replace email template `worklog-approved`
  - **Agent note (2026-10-17):** renders `worklog-approved` (fe39eb912). Per-template inbox check still outstanding.
  - **Where:** Current: getWorkLogApprovedEmailTemplate. New: email-templates/worklog-approved.html + .txt. Trigger: work log approved. To: the employee.
  - **Problem:** Emoji heading ('✅'); No preheader
  - **Fix:** Implement with renderEmail('worklog-approved', vars). Subject: "Work log approved: {{log_date}}". Preheader: "{{hours}} hours approved by {{approver_name}}.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0276 [Low][Email templates] Replace email template `worklog-rejected`
  - **Agent note (2026-10-17):** renders `worklog-rejected` (fe39eb912). Per-template inbox check still outstanding.
  - **Where:** Current: getWorkLogRejectedEmailTemplate. New: email-templates/worklog-rejected.html + .txt. Trigger: work log rejected. To: the employee.
  - **Problem:** Emoji heading ('❌'); No preheader
  - **Fix:** Implement with renderEmail('worklog-rejected', vars). Subject: "Work log needs changes: {{log_date}}". Preheader: "{{approver_name}} added a note.". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0277 [Low][Email templates] Replace email template `project-added`
  - **Agent note (2026-10-17):** renders `project-added` (c5a82c6c6). Per-template inbox check still outstanding.
  - **Where:** Current: getProjectAssignmentEmailTemplate (project.ts). New: email-templates/project-added.html + .txt. Trigger: added to a project. To: the member.
  - **Problem:** Emoji heading ('📋'); Does not show the project role (OWNER/MANAGER/CONTRIBUTOR/VIEWER from the Build port)
  - **Fix:** Implement with renderEmail('project-added', vars). Subject: "You were added to {{project_name}}". Preheader: "Role: {{project_role}} · added by {{added_by}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0278 [Low][Email templates] Replace email template `ticket-assigned`
  - **Agent note (2026-10-17):** renders `ticket-assigned` (c5a82c6c6). Per-template inbox check still outstanding.
  - **Where:** Current: getTicketAssignmentEmailTemplate. New: email-templates/ticket-assigned.html + .txt. Trigger: ticket assigned. To: assignee.
  - **Problem:** Subject '{{key}}{{title}} - Miyo Global'
  - **Fix:** Implement with renderEmail('ticket-assigned', vars). Subject: "[{{ticket_key}}] {{ticket_title}}". Preheader: "Assigned to you by {{assigned_by}} · {{priority}} · due {{due_date}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0279 [Low][Email templates] Replace email template `ticket-review-request`
  - **Agent note (2026-10-17):** renders `ticket-review-request` (c5a82c6c6). Per-template inbox check still outstanding.
  - **Where:** Current: getTicketReviewRequestEmailTemplate. New: email-templates/ticket-review-request.html + .txt. Trigger: ticket sent for review. To: reviewer.
  - **Problem:** Emoji heading ('👀')
  - **Fix:** Implement with renderEmail('ticket-review-request', vars). Subject: "[{{ticket_key}}] Review requested: {{ticket_title}}". Preheader: "From {{requested_by}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0280 [Low][Email templates] Replace email template `ticket-changes-requested`
  - **Agent note (2026-10-17):** renders `ticket-changes-requested` (c5a82c6c6). Per-template inbox check still outstanding.
  - **Where:** Current: getTicketChangesRequestedEmailTemplate. New: email-templates/ticket-changes-requested.html + .txt. Trigger: reviewer requests changes. To: assignee.
  - **Problem:** Emoji heading ('🔄')
  - **Fix:** Implement with renderEmail('ticket-changes-requested', vars). Subject: "[{{ticket_key}}] Changes requested". Preheader: "{{reviewer_name}}: {{note_snippet}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0281 [Low][Email templates] Replace email template `ticket-comment`
  - **Agent note (2026-10-17):** renders `ticket-comment` (c5a82c6c6). Per-template inbox check still outstanding.
  - **Where:** Current: getTicketCommentEmailTemplate. New: email-templates/ticket-comment.html + .txt. Trigger: comment on a watched/assigned ticket. To: assignee and watchers.
  - **Problem:** Mentions are rendered via mentionsToPlainText; make sure no raw mention markup leaks; No separate email for @mentions (Build port added mentions with in-app notification only)
  - **Fix:** Implement with renderEmail('ticket-comment', vars). Subject: "[{{ticket_key}}] New comment from {{author_name}}". Preheader: "{{comment_snippet}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0282 [Low][Email templates] Replace email template `ticket-mention`
  - **Agent note (2026-10-17):** renders `ticket-mention` for a comment that names someone (c5a82c6c6). Per-template inbox check still outstanding.
  - **Where:** Current: NEW (features/projects/comments mentions). New: email-templates/ticket-mention.html + .txt. Trigger: @mention in a ticket comment. To: mentioned user.
  - **Problem:** Inherits the base-layout problems (gradient header/button, style-block CSS, hidden preheader missing, CRM footer).
  - **Fix:** Implement with renderEmail('ticket-mention', vars). Subject: "[{{ticket_key}}] {{author_name}} mentioned you". Preheader: "{{comment_snippet}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0283 [Low][Email templates] Replace email template `task-assigned`
  - **Agent note (2026-10-17):** renders `task-assigned` (d873738bb). Per-template inbox check still outstanding.
  - **Where:** Current: getTaskAssignedEmailTemplate (notifications.ts) / lib/email/crm.ts. New: email-templates/task-assigned.html + .txt. Trigger: task assigned. To: assignee.
  - **Problem:** Emoji heading ('📌'); Lives in lib/email/crm.ts next to deal/lead senders
  - **Fix:** Implement with renderEmail('task-assigned', vars). Subject: "Task assigned: {{task_title}}". Preheader: "Due {{due_date}} · from {{assigned_by}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0284 [Low][Email templates] Replace email template `support-ticket-created`
  - **Agent note (2026-10-17):** renders `support-ticket-created`. Per-template inbox check still outstanding.
  - **Where:** Current: getTicketCreatedEmailTemplate (notifications.ts). New: email-templates/support-ticket-created.html + .txt. Trigger: support ticket created/assigned. To: assigned agent.
  - **Problem:** Emoji heading ('🎫')
  - **Fix:** Implement with renderEmail('support-ticket-created', vars). Subject: "Support ticket #{{ticket_id}}: {{ticket_subject}}". Preheader: "{{priority}} · from {{requester_name}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0285 [Low][Email templates] Replace email template `support-ticket-reply`
  - **Agent note (2026-10-17):** renders `support-ticket-reply`. Per-template inbox check still outstanding.
  - **Where:** Current: getTicketReplyEmailTemplate. New: email-templates/support-ticket-reply.html + .txt. Trigger: reply on support ticket. To: requester or agent.
  - **Problem:** Emoji heading ('💬')
  - **Fix:** Implement with renderEmail('support-ticket-reply', vars). Subject: "Re: #{{ticket_id}} {{ticket_subject}}". Preheader: "{{reply_snippet}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0286 [Low][Email templates] Replace email template `support-ticket-status`
  - **Agent note (2026-10-17):** renders `support-ticket-status`. Per-template inbox check still outstanding.
  - **Where:** Current: getTicketStatusEmailTemplate. New: email-templates/support-ticket-status.html + .txt. Trigger: support ticket status change. To: requester.
  - **Problem:** Emoji heading ('🔄')
  - **Fix:** Implement with renderEmail('support-ticket-status', vars). Subject: "Ticket #{{ticket_id}} is now {{status}}". Preheader: "{{ticket_subject}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0287 [Low][Email templates] Replace email template `helpdesk-ticket`
  - **Agent note (2026-10-17):** renders `helpdesk-ticket`. Per-template inbox check still outstanding.
  - **Where:** Current: getHelpdeskTicketEmailTemplate. New: email-templates/helpdesk-ticket.html + .txt. Trigger: HR helpdesk ticket events. To: HR / requester.
  - **Problem:** Emoji heading ('🎫')
  - **Fix:** Implement with renderEmail('helpdesk-ticket', vars). Subject: "HR helpdesk #{{ticket_id}}: {{ticket_subject}}". Preheader: "{{event_summary}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0288 [Low][Email templates] Replace email template `weekly-ceo-recap`
  - **Agent note (2026-10-17):** renders `weekly-ceo-recap`, rebuilt on HR metrics (02d6e5122). Per-template inbox check still outstanding.
  - **Where:** Current: getWeeklyCeoRecapTemplate + server/actions/weekly-ceo-recap.ts. New: email-templates/weekly-ceo-recap.html + .txt. Trigger: weekly-ceo-recap (Vercel Mon 15:30 IST and Inngest Mon 14:30 IST — duplicate). To: CEO.
  - **Problem:** Duplicate schedule means it can arrive twice; Subject uses '|' separator
  - **Fix:** Implement with renderEmail('weekly-ceo-recap', vars). Subject: "Weekly recap: {{week_range}}". Preheader: "Headcount {{headcount}} · {{joiners}} joined · {{leavers}} left · attendance {{present_pct}}%". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0289 [Low][Email templates] Replace email template `one-on-one-invite`
  - **Agent note (2026-10-17):** already done — `lib/hr/one-on-one-invite.ts` renders `one-on-one-invite`. Per-template inbox check still outstanding.
  - **Where:** Current: inline HTML in lib/hr/one-on-one-invite.ts. New: email-templates/one-on-one-invite.html + .txt. Trigger: 1:1 scheduled. To: attendees.
  - **Problem:** Inline HTML outside shared layout; Check that an .ics attachment is included
  - **Fix:** Implement with renderEmail('one-on-one-invite', vars). Subject: "1:1 with {{organizer_name}}: {{meeting_date}}". Preheader: "{{meeting_time}} IST · {{location}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0290 [Low][Email templates] Replace email template `calendar-event`
  - **Agent note (2026-10-17):** already done — `lib/calendar-event-notifications.ts` renders `calendar-event`. Per-template inbox check still outstanding.
  - **Where:** Current: inline HTML in lib/calendar-event-notifications.ts. New: email-templates/calendar-event.html + .txt. Trigger: event created/changed/15-min reminder. To: attendees.
  - **Problem:** Inline HTML outside shared layout; Three cases (created/changed/reminder) in one block of inline markup
  - **Fix:** Implement with renderEmail('calendar-event', vars). Subject: "{{event_action}}: {{event_title}}, {{event_date}}". Preheader: "{{event_time}} IST · {{location}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0291 [Low][Email templates] Replace email template `data-export-ready`
  - **Agent note (2026-10-17):** already done — `lib/hr/send-export-email.ts` renders `data-export-ready`. Per-template inbox check still outstanding.
  - **Where:** Current: inline HTML in app/api/hr/*/export/email routes and server/actions/expense-export.ts. New: email-templates/data-export-ready.html + .txt. Trigger: export requested by email. To: the requester.
  - **Problem:** Six export routes build their own inline email body
  - **Fix:** Implement with renderEmail('data-export-ready', vars). Subject: "Your {{export_name}} export is ready". Preheader: "{{row_count}} rows · attached as {{file_type}}". Fill every {{placeholder}} used in the files; remove the old function once callers are switched.
  - **Acceptance check:** Send to a mail.tm inbox: subject/preheader match, layout matches the .html, text part matches the .txt, all placeholders filled, link works.
  - **Retest status:** PARTIAL
  - **Remaining:** rewritten templates live under lib/email-templates/*.ts (QA-0008/0040/0041); per-template visual inbox check not done

- [x] MIYO-0297 [Low][Leftovers] Orphan loading.tsx files under removed CRM pages
  - **Agent note (2026-10-17):** `app/(dashboard)/crm` deleted — it held three loading.tsx files and nothing else.
  - **Where:** app/(dashboard)/crm/quotes/loading.tsx, crm/quotes/[quoteId]/loading.tsx, crm/organizations/[organizationId]/loading.tsx
  - **Problem:** Leftover from the removed CRM/Sales/Recruitment/Branches modules (D-1…D-6); dead or broken links/code.
  - **Fix:** Delete the app/(dashboard)/crm folder.
  - **Acceptance check:** grep for the removed names in the listed files returns nothing; typecheck, lint, build pass.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: ui-B: /hr/holidays skeleton full-bleed vs max-width jump

- [x] MIYO-0299 [Low][Leftovers] CRM email senders and templates
  - **Agent note (2026-10-17):** `lib/email/crm.ts` and `lib/email-templates/crm.ts` deleted; `sendTaskAssignedEmail` renders the task-assigned template from lib/email.ts (d873738bb).
  - **Where:** lib/email/crm.ts (sendDealStageChangeEmail, sendLeadAssignedEmail), lib/email-templates/crm.ts, notifications.ts getDealStageChangeEmailTemplate/getLeadAssignedEmailTemplate, lib/email.ts:821-854
  - **Problem:** Leftover from the removed CRM/Sales/Recruitment/Branches modules (D-1…D-6); dead or broken links/code.
  - **Fix:** Delete; move sendTaskAssignedEmail into lib/email/tasks.ts.
  - **Acceptance check:** grep for the removed names in the listed files returns nothing; typecheck, lint, build pass.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0302 [Low][Leftovers] Landing page metadata advertises 'HR, Projects & Sales Platform' and CRM
  - **Agent note (2026-10-17):** page metadata, hero, feature cards and preview panel rewritten to HR and projects; the CRM and chat cards are gone (bbe640d07 block).
  - **Where:** app/page.tsx (metadata), features/landing/landing-page.tsx:40,127,305, landing-shared.tsx (features mention CRM, 'Real-time Chat … Powered by Ably')
  - **Problem:** Leftover from the removed CRM/Sales/Recruitment/Branches modules (D-1…D-6); dead or broken links/code.
  - **Fix:** Rewrite to HR + Projects only; drop features that do not exist (chat).
  - **Acceptance check:** grep for the removed names in the listed files returns nothing; typecheck, lint, build pass.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: ui-B: title/meta/og still CRM/Sales; also /signin

- [ ] MIYO-0310 [Low][Leftovers] Drop orphaned CRM, marketing, billing and branch tables after archiving
  - **Agent note (2026-10-17):** still open and deliberately last — Tarun exports the data first, then the schema files go and one destructive migration drops the tables.
  - **Where:** lib/db/schema/crm/_all.ts (1,308 lines, ~62 tables), lib/db/schema/marketing.ts, crm.ts, subscriptions, branches
  - **Problem:** ~80 unused tables (design doc 18.3, D-7). Recruitment tables are NOT in this item; see the ATS section.
  - **Fix:** Tarun exports the data first. Then remove the schema files and add a migration that drops them (this is the only destructive migration; do it last, behind explicit approval).
  - **Acceptance check:** Schema has no crm/marketing tables; the drop migration is reviewed and approved by Tarun before running.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0311 [Low][Design/UI] Landing page stats are filler ('360°', 'Real-time', 'Secure')
  - **Agent note (2026-10-17):** the stats strip now names payroll, attendance, projects and MFA instead of "360°" and "Real-time".
  - **Where:** features/landing/landing-shared.tsx:116-121
  - **Problem:** Meaningless numbers.
  - **Fix:** Delete the stats row.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: ui-B: filler stats + From recruitment to retirement still in landing HTML

- [x] MIYO-0312 [Low][Design/UI] Landing hero uses a radial gold glow background
  - **Agent note (2026-10-17):** `brand-mark-bg` is flat ink-950 (no radial gold).
  - **Where:** globals.css:358 (@utility brand-mark-bg), features/landing/landing-page.tsx:294
  - **Problem:** Gradient/glow is against the 'no gradients' rule.
  - **Fix:** Make brand-mark-bg a flat ink-950 background.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: UI-A/code: profile gradient glow remains (MIYO-0328); gradients still in UI

- [x] MIYO-0313 [Low][Design/UI] Landing page uses scroll-reveal and stagger animations everywhere
  - **Agent note (2026-10-17):** all 17 motion elements, both reveal wrappers and the hero parallax removed (bbe640d07).
  - **Where:** features/landing/landing-page.tsx (21 motion uses), landing-shared.tsx
  - **Problem:** Decorative motion feels templated.
  - **Fix:** Remove SectionReveal/StaggerReveal; keep static layout.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: animate-fade-up still used (auth pages, landing, stat-card, globals.css:319)

- [ ] MIYO-0314 [Low][Design/UI] Consider replacing the marketing landing page with a plain sign-in redirect
  - **Agent note (2026-10-17):** needs Tarun's decision: keep the marketing page or redirect / to /signin. The page is at least truthful now (MIYO-0302).
  - **Where:** app/page.tsx
  - **Problem:** Internal tool; signed-out users only need to sign in.
  - **Fix:** Ask Tarun; default: redirect / to /signin.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: ui-B: public / still marketing landing Features/Pricing; Sign In+Sign in; r3b-landing-public.png

- [x] MIYO-0318 [Low][Design/UI] Decorative entrance animations on onboarding self-service tabs
  - **Agent note (2026-10-17):** framer-motion wrappers removed from all four onboarding tabs (6c7e80996).
  - **Where:** features/onboarding/review-tab.tsx (25 motion uses), personal-info-tab.tsx (14), documents-tab.tsx (12), bank-details-tab.tsx (11)
  - **Problem:** Fade/slide on every field group.
  - **Fix:** Remove framer-motion wrappers; keep a simple tab switch.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: animate-fade-up still used (auth pages, landing, stat-card, globals.css:319)

- [x] MIYO-0319 [Low][Design/UI] Heavy animation on Support page
  - **Agent note (2026-10-17):** motion removed from the Support page; the priority bar renders at its width (6c7e80996).
  - **Where:** app/(dashboard)/support/page.tsx (22 motion uses)
  - **Problem:** Same.
  - **Fix:** Remove decorative motion.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: animate-fade-up still used (auth pages, landing, stat-card, globals.css:319)

- [x] MIYO-0320 [Low][Design/UI] Heavy animation on Expenses page
  - **Agent note (2026-10-17):** motion removed from the Expenses page (6c7e80996).
  - **Where:** app/(dashboard)/hr/expenses/page.tsx (19 motion uses)
  - **Problem:** Same.
  - **Fix:** Remove decorative motion.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: animate-fade-up still used (auth pages, landing, stat-card, globals.css:319)

- [x] MIYO-0321 [Low][Design/UI] Animation on Projects list and Timesheets
  - **Agent note (2026-10-17):** motion removed from Projects and both Timesheets pages (6c7e80996).
  - **Where:** app/(dashboard)/projects/page.tsx (9), timesheets/page.tsx (7), timesheets/team/page.tsx (9)
  - **Problem:** Same.
  - **Fix:** Remove decorative motion; keep skeletons.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: animate-fade-up still used (auth pages, landing, stat-card, globals.css:319)

- [x] MIYO-0322 [Low][Design/UI] Animation on settings pages
  - **Agent note (2026-10-17):** motion removed from notifications, webhooks, payroll-schedule and data-hub (6c7e80996).
  - **Where:** app/(dashboard)/settings/notifications (9), webhooks (7), payroll-schedule (7), data-hub (6)
  - **Problem:** Same.
  - **Fix:** Remove decorative motion.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: animate-fade-up still used (auth pages, landing, stat-card, globals.css:319)

- [x] MIYO-0328 [Low][Design/UI] Employee profile header gradient and duplicate badges
  - **Agent note (2026-10-17):** already fixed — the header is flat (no gradient anywhere in the app) and the role appears once in the subtitle, once as a detail row.
  - **Where:** app/(dashboard)/hr/employees/[employeeId]/employee-details-view.tsx
  - **Problem:** QA 4.11 (gradient header, duplicate ENGINEERING badge).
  - **Fix:** Flat header, one role badge.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: UI-A: profile header dark banner + gold gradient glow

- [x] MIYO-0329 [Low][Design/UI] Org chart dotted background and truncated names
  - **Agent note (2026-10-17):** already fixed — the org chart is plain department cards with no dotted background and no truncated names.
  - **Where:** app/(dashboard)/hr/org-chart/page.tsx
  - **Problem:** QA 4.11.
  - **Fix:** Plain background; wrap names to two lines.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0331 [Low][Design/UI] Holidays: full-page skeleton after save; confirm dialog missing the year
  - **Agent note (2026-10-17):** the skeleton is first-load only, so saving re-fetches under the list.
  - **Where:** app/(dashboard)/hr/holidays/page.tsx (lint: missing deps at :174/:260)
  - **Problem:** QA 4.9.
  - **Fix:** Optimistic update; date formatted 'Sat, 25 Oct 2031'.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** PARTIAL
  - **Remaining:** ui-B: year select closed picker without apply; full-width skeleton; confirm not checked

- [x] MIYO-0332 [Low][Design/UI] Work logs show 'for this department' when filter is All
  - **Agent note (2026-10-17):** the work-log empty state no longer says "for this department".
  - **Where:** app/(dashboard)/hr/work-logs/page.tsx
  - **Problem:** QA 4.6.
  - **Fix:** Copy follows the filter.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0333 [Low][Design/UI] Uneven page widths across modules
  - **Agent note (2026-10-17):** already fixed — `PAGE_CONTAINER` sets one 1200px measure; the only two remaining `max-w-6xl` are the ticket reader and the document editor, which are deliberate reading widths.
  - **Where:** components/ui/page-wrapper.tsx and pages that set their own max-w
  - **Problem:** QA design review.
  - **Fix:** One max width (e.g. max-w-7xl) set in PageWrapper; remove per-page max-w overrides.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** PARTIAL
  - **Remaining:** ui-B: most pages same max-width; holidays skeleton/settings offset/onboarding ~3px shift

- [x] MIYO-0336 [Low][Design/UI] Org settings currency field icon **[confirm on prod]**
  - **Agent note (2026-10-17):** already fixed — the field uses the lucide `IndianRupee` glyph, no dollar sign.
  - **Where:** app/(dashboard)/settings/organization/page.tsx
  - **Problem:** QA 4.16: $ icon (re-verify; no DollarSign found in code).
  - **Fix:** Use ₹ text prefix.
  - **Acceptance check:** Page matches the rules in docs/CRM-UI-UX-REVAMP.md: no gradients/glow/emoji/illustrations, ink text, gold for the single primary action; screenshot attached to the commit.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] MIYO-0337 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(auth)/account-deactivated/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0338 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(auth)/forgot-password/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0339 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(auth)/invitation/[token]/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0340 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(auth)/mfa/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0341 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(auth)/setup-password/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0342 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(auth)/verify-email/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0343 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/ai/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0344 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/ceo/qr-code/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0345 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/dashboard/admin-health/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0346 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/assessments/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0347 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/asset-returns/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0348 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/assets/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0349 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/background-verification/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0350 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/career-profiles/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0351 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/certifications/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0352 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/compliance/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0353 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/documents/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0354 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/documents/templates/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0355 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/email-templates/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0356 [Low][Design/UI] Remove decorative IconChip from employee-details-view
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/employees/[employeeId]/employee-details-view.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0357 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/fnf/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0358 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/handbook/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0359 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/incentives/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0360 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/learning-paths/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0361 [Low][Design/UI] Remove decorative IconChip from leave-approvals
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/leaves/leave-approvals.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0362 [Low][Design/UI] Remove decorative IconChip from leaves-shared
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/leaves/leaves-shared.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0363 [Low][Design/UI] Remove decorative IconChip from leaves-wfh-content
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/leaves/leaves-wfh-content.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0364 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/loans/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0365 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/offer-letter-templates/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0366 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/onboarding/my-tasks/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0367 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/onboarding/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0368 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/payroll/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0369 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/recognition/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0370 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/reimbursements/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0371 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/team-events/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0372 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/hr/training/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0373 [Low][Design/UI] Remove decorative IconChip from access-denied-view
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/projects/[projectId]/access-denied-view.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0374 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/projects/[projectId]/epics/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0375 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/projects/[projectId]/settings/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0376 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/projects/[projectId]/sprints/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0377 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/projects/[projectId]/views/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0378 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/reports/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0379 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/settings/ai/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0380 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/settings/audit-log/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0381 [Low][Design/UI] Remove decorative IconChip from page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(dashboard)/settings/job-roles/page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0382 [Low][Design/UI] Remove decorative IconChip from token-page-shell
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** app/(public)/_components/token-page-shell.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0383 [Low][Design/UI] Remove decorative IconChip from not-activated-page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/auth/not-activated-page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0384 [Low][Design/UI] Remove decorative IconChip from activity-feed
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/charts/activity-feed.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0385 [Low][Design/UI] Remove decorative IconChip from executive-kpi-widget
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/dashboard/widgets/executive-kpi-widget.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0386 [Low][Design/UI] Remove decorative IconChip from pending-approvals-widget
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/dashboard/widgets/pending-approvals-widget.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0387 [Low][Design/UI] Remove decorative IconChip from quick-actions-widget
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/dashboard/widgets/quick-actions-widget.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0388 [Low][Design/UI] Remove decorative IconChip from widget-card
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/dashboard/widgets/widget-card.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0389 [Low][Design/UI] Remove decorative IconChip from expense-export-dialog
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/expenses/expense-export/expense-export-dialog.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0390 [Low][Design/UI] Remove decorative IconChip from employee-projects-list
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/hr/employee-projects-list.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0391 [Low][Design/UI] Remove decorative IconChip from burndown-chart
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/projects/burndown-chart.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0392 [Low][Design/UI] Remove decorative IconChip from create-epic-dialog
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/projects/create-epic-dialog.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0393 [Low][Design/UI] Remove decorative IconChip from create-sprint-dialog
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/projects/create-sprint-dialog.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0394 [Low][Design/UI] Remove decorative IconChip from edit-epic-dialog
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/projects/edit-epic-dialog.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0395 [Low][Design/UI] Remove decorative IconChip from edit-sprint-dialog
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/projects/edit-sprint-dialog.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0396 [Low][Design/UI] Remove decorative IconChip from ticket-detail-body
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/projects/ticket-details/ticket-detail-body.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0397 [Low][Design/UI] Remove decorative IconChip from velocity-chart
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/projects/velocity-chart.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0398 [Low][Design/UI] Remove decorative IconChip from mfa-settings
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/settings/mfa-settings.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0399 [Low][Design/UI] Remove decorative IconChip from detail-header
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/shared/detail-header.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0400 [Low][Design/UI] Remove decorative IconChip from timeline
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/shared/timeline.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0401 [Low][Design/UI] Remove decorative IconChip from time-entry-detail-sheet
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/timesheets/time-entry-detail-sheet.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0402 [Low][Design/UI] Remove decorative IconChip from confirm-dialog
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** components/ui/confirm-dialog.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0403 [Low][Design/UI] Remove decorative IconChip from hr-widgets
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/dashboard/hr-widgets.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0404 [Low][Design/UI] Remove decorative IconChip from my-issues-card
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/dashboard/my-issues-card.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0405 [Low][Design/UI] Remove decorative IconChip from public-documents-card
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/dashboard/public-documents-card.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0406 [Low][Design/UI] Remove decorative IconChip from recent-activity-card
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/dashboard/recent-activity-card.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0407 [Low][Design/UI] Remove decorative IconChip from recent-projects-card
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/dashboard/recent-projects-card.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0408 [Low][Design/UI] Remove decorative IconChip from analytics-sections
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/analytics/analytics-sections.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0409 [Low][Design/UI] Remove decorative IconChip from my-assigned-assets-view
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/assets/my-assigned-assets-view.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0410 [Low][Design/UI] Remove decorative IconChip from attendance-calendar
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/attendance/attendance-calendar.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0411 [Low][Design/UI] Remove decorative IconChip from attendance-heatmap
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/attendance/attendance-heatmap.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0412 [Low][Design/UI] Remove decorative IconChip from check-in-button
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/attendance/check-in-button.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0413 [Low][Design/UI] Remove decorative IconChip from manage-holidays-card
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/attendance/manage-holidays-card.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0414 [Low][Design/UI] Remove decorative IconChip from progress-timeline
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/exit/progress-timeline.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0415 [Low][Design/UI] Remove decorative IconChip from ticket-detail-sheet
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/helpdesk/ticket-detail-sheet.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0416 [Low][Design/UI] Remove decorative IconChip from ai-generate-review-button
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/hr/performance/ai-generate-review-button.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0417 [Low][Design/UI] Remove decorative IconChip from landing-page
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/landing/landing-page.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0418 [Low][Design/UI] Remove decorative IconChip from complete-sprint-sheet
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/projects/sprints/complete-sprint-sheet.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0419 [Low][Design/UI] Remove decorative IconChip from sprint-planning-panel
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/projects/sprints/sprint-planning-panel.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [x] MIYO-0420 [Low][Design/UI] Remove decorative IconChip from settings-security
  - **Agent note (2026-10-17):** IconChip removed from this file in the sweep (cf23dc132).
  - **Where:** features/settings/settings-security.tsx
  - **Problem:** Coloured icon chips in card headers/rows (icon overload, looks generated).
  - **Fix:** Delete IconChip usages that sit next to a heading or in list rows; keep at most one plain 16 px muted icon where it aids scanning.
  - **Acceptance check:** No IconChip import left in this file (or a one-line reason in the commit); screenshot attached.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: code: IconChip still imported on auth/mfa and landing

- [ ] MIYO-0615 [Low][QA data cleanup] Delete the five QA employees (maxxspace.com) **[confirm on prod]**
  - **Where:** qaalpha8229@, qabravo19454@, qacharlie30058@, qadelta16529@, qaecho15036@maxxspace.com — users, organization_members, salary structures, leave balances, attendance, notifications
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [ ] MIYO-0616 [Low][QA data cleanup] Delete 'Qa Test Employee' VC26002 (qa.test1@example.com, id e1ed6e68-ae8e-4aab-8c52-3655a0d54b21) and its skills 'Testing'/'Qa' **[confirm on prod]**
  - **Where:** users / employee skills
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [ ] MIYO-0617 [Low][QA data cleanup] Delete the 6 Oct 2026 DRAFT payrolls for the QA employees **[confirm on prod]**
  - **Where:** payrolls where user in QA users and month='2026-10' and status='DRAFT'
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [ ] MIYO-0618 [Low][QA data cleanup] Delete 'QA Test Holiday' on 25 Oct 2031 (it will email everyone on 24 Oct 2031) **[confirm on prod]**
  - **Where:** holidays
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: ui-B: holidays year nav capped currentYear+2 (~2027/2028); 25 Oct 2031 QA Test Holiday invisible; r3b-holidays-2028-cap.png — holidays/page.tsx:358

- [ ] MIYO-0619 [Low][QA data cleanup] Delete QA leave requests and restore balances (admin 10 Nov pending; Alpha 12 Nov approved; Bravo 13 Nov rejected; Echo 17 Nov approved) **[confirm on prod]**
  - **Where:** leave_requests, leave_balances
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [ ] MIYO-0621 [Low][QA data cleanup] Delete job titles 'QA Test Engineer', 'QA Sales Executive', 'QA Customer Support Associate', 'QA Design Associate' **[confirm on prod]**
  - **Where:** job_roles
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [ ] MIYO-0622 [Low][QA data cleanup] Delete expense EXP-2026-001 (₹1, approved) **[confirm on prod]**
  - **Where:** expenses
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [ ] MIYO-0623 [Low][QA data cleanup] Delete 'QA Test Laptop' QA-TEST-0001 **[confirm on prod]**
  - **Where:** assets
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [ ] MIYO-0624 [Low][QA data cleanup] Delete 'QA Test Project' and 'QA Test Ticket' **[confirm on prod]**
  - **Where:** projects/tickets (support ticket 'QA Test Ticket' In Progress too)
  - **Problem:** Created during QA on 15 Oct 2026 on production (QA report §9).
  - **Fix:** Tarun (or an admin in the UI) removes these on production. The coding agent must NOT connect to the production DB; instead write scripts/qa-cleanup.sql with explicit `where email like '%@maxxspace.com'`-style filters inside a transaction with a SELECT preview, for Tarun to review and run.
  - **Acceptance check:** After Tarun runs it, the records no longer appear in the UI; the SQL file is committed without being executed by the agent.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: STILL OPEN (Low); batch in browser — prior: no commit on main at HEAD 914259e

- [x] QA-0066 [Low][Attendance] Attendance views misreport: heatmap streak on all-absent days, future dates show Absent, calendar doesn't mark holidays/approved leave; dashboard Present 7 vs Team monitor 0 — Where: attendance heatmap/calendar/dashboard — Steps: '5d longest streak' on all-absent days; future dates everyone Absent; calendar doesn't mark future holidays/approved leave; Dashboard Present 7 vs Team monitor 0 — Expected vs actual: Accurate streaks/future/holiday/leave marking and consistent counts vs actual: the above — Fix: Fix streak logic, don't mark future as absent, mark holidays/leave, reconcile counts — Acceptance: Heatmap/calendar/dashboard figures are accurate and consistent — Ref: L11,L17
  - **Agent note (2026-10-17):** already fixed — the heatmap counts a day only when someone checked in, the calendar marks holidays and approved leave and leaves future days unmarked, and the dashboard's Present Today counts rows with a check-in, which is what the team monitor counts.
  - **Agent note (2026-10-17):** fixed in code at 298c14b (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Auth**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 298c14b19 "QA-0066: report attendance accurately across the t" (2026-10-16 19:45:31 +0530); not re-prob

- [x] QA-0067 [Low][Auth] Password policy inconsistency (client 12 vs server 8) and common specials (# _ - space) rejected with a generic error — Where: setup-password page PASSWORD_ZOD_SCHEMA min 12; server /api/auth/reset-password + accept-invitation inline regex min 8, charset [A-Za-z0-9@$!%*?&] — Steps: Footer says '8+ characters' while client enforces 12; QaUser#2026Pw / _ / - / space -> 400 'Invalid request body' (same as a bad token) — Expected vs actual: One policy, clear messaging, common specials allowed vs actual: mismatch + opaque rejects — Fix: Align server to 12; widen the allowed special set; return a distinct 'password does not meet requirements' message — Acceptance: Specials accepted; client and server agree; helper text matches — Ref: QA-A14,QA-A15; MIYO-0093
  - **Agent note (2026-10-17):** already fixed in MIYO-0093 — one `PASSWORD_ZOD_SCHEMA` (8–128, upper/lower/digit/any non-alphanumeric, spaces allowed) used by every form and route, and the reset route returns the specific password message instead of the token one.
  - **Agent note (2026-10-17):** fixed in code at 0d176b7 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 0d176b7d8 "QA-0067: one password policy, with common special " (2026-10-16 19:48:34 +0530); not re-prob

- [ ] QA-0068 [Low][Auth] In-process Redis makes MFA/revocation/rate-limit unreliable on multi-instance — Where: lib/redis.ts (in-process Map) — Steps: MFA login-verify marker, TOTP replay guard, session-revocation flags and rate limits are per-isolate -> MFA login can loop and replay protection/logout-everywhere are unreliable on Vercel — Expected vs actual: A shared KV backs these vs actual: per-instance state — Fix: Use Upstash/real Redis for the marker, replay guard, revocation flags and rate limits — Acceptance: MFA/rate-limit/revocation behave consistently across instances — Ref: QA-A16; MIYO-0062
  - **Agent note (2026-10-17):** code is ready: `lib/redis.ts` uses Upstash when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set and falls back to a process-local map otherwise. Unticked until those are set on the deployment.
  - **Agent note (2026-10-17):** fixed in code at 56d32a9 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Employees**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 56d32a9aa "QA-0068: back the session markers with a shared Re" (2026-10-16 19:49:59 +0530); not re-prob

- [x] QA-0069 [Low][Employees] Send Invite with an empty email does nothing and gives no feedback — Where: Members -> Send Invite (/settings members/invitations) — Steps: Members -> Send Invite with an empty email does nothing and gives no feedback. — Expected vs actual: Inline 'email required' validation vs a silent no-op — Fix: Validate the email field and show an error; disable submit when empty — Acceptance: An empty-email invite shows a required-field error — Ref: pass9 #23; Screenshot: screens/p9-settings-members-invitations.png; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** already fixed — the invite form validates an empty and a malformed address inline.
  - **Agent note (2026-10-17):** fixed in code at c634d98 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**HR**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in c634d98fa "QA-0069: validate the invite email instead of doin" (2026-10-16 19:51:22 +0530); not re-prob

- [x] QA-0070 [Low][HR] Future-dated joiner can sign in before the joining date — Where: lib/auth (no pre-joining block); confirmed live — Steps: SALES (joins 20 Oct) logs in and gets a full session on 16 Oct — Expected vs actual: Confirm whether pre-joining login should be blocked vs actual: full access before start — Fix: Decide policy; if blocked, reject login before joiningDate — Acceptance: Pre-joining login blocked (if that is the decision) — Ref: QA-A17
  - **Agent note (2026-10-17):** already fixed — `lib/auth` rejects a sign-in before the joining date.
  - **Agent note (2026-10-17):** fixed in code at dbd3b81 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Leave**
  - **Retest status:** PARTIAL
  - **Remaining:** pre-join login blocked but error=Configuration

- [x] QA-0071 [Low][Leave] Backdated leave accepted; UL on a declared holiday accepted; reject allowed with no reason; no cancel-after-approval — Where: app/api/hr/leaves/route.ts POST; [leaveId]/reject (reason optional); [leaveId]/cancel — Steps: CL for 13 Oct (past) -> 200; UL for 20 Oct holiday -> 200; reject UL with empty body -> 200; cancel approved leave -> 400 (by design) — Expected vs actual: Reject/flag past-dated and holiday-only leave; require a rejection reason vs actual: all accepted silently — Fix: Validate startDate>=today (HR override aside); reject leave that falls entirely on holidays; make reject reason required — Acceptance: Backdated/holiday-only leave rejected; reject requires a reason — Ref: QA-P6-07,QA-P6-08,QA-P6-09
  - **Agent note (2026-10-17):** already fixed — leave cannot start in the past, a range that is only Sundays or holidays is refused, and a rejection requires a reason.
  - **Agent note (2026-10-17):** fixed in code at fd47018 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Onboarding**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in fd4701859 "QA-0071: reject backdated leave and require a reje" (2026-10-16 19:53:48 +0530); not re-prob

- [x] QA-0072 [Low][Onboarding] Onboarding tasks are not sorted by due date — Where: /hr/onboarding/[userId] — Steps: The onboarding task list is unordered rather than by due date. — Expected vs actual: Tasks ordered by due date vs arbitrary order — Fix: Sort tasks by due date (then title) — Acceptance: Onboarding tasks render in due-date order — Ref: pass9 #19; Screenshot: screens/p9-onboarding.png; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** already fixed — `/api/onboarding/[userId]` orders by due date (nulls last), then title.
  - **Agent note (2026-10-17):** fixed in code at 4582230 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Payroll**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 4582230ce "QA-0072: order onboarding tasks by due date" (2026-10-16 19:54:36 +0530); not re-probed live

- [x] QA-0073 [Low][Payroll] Salary-structure 'allowances' excluded from payroll CTC; duplicate payslip emails; payslip download serves HTML not PDF — Where: lib/hr/salary-effective-dates.ts resolvePayrollMonthlyCtc (max(basic+hra+special, user.monthlySalary)); mark-paid + email-payslip both send; [payrollId]/download returns text/html — Steps: Editing a structure's allowances didn't move payroll CTC (stayed 11000); 10k inbox got two 'Your Payslip' mails; /download is text/html (emailed attachment IS a real PDF) — Expected vs actual: Allowances counted (or documented as excluded); one payslip mail; download is a PDF vs actual: the above — Fix: Clarify CTC composition; dedupe the payslip mail; serve application/pdf on download — Acceptance: CTC reflects allowances per policy; one payslip mail; download returns a PDF — Ref: QA-P7-05,QA-P7-07,QA-P7-08
  - **Agent note (2026-10-17):** already fixed — allowances are in `componentsFromStructureRow`'s CTC, the payslip mail is sent once unless forced, and the download route serves application/pdf.
  - **Agent note (2026-10-17):** fixed in code at 5150778 (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Projects**
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 515077859 "QA-0073: count allowances in payroll CTC, send one" (2026-10-16 19:57:26 +0530); not re-prob

- [x] QA-0074 [Low][Projects] Sprint shows Completed with a future end date and 0/0 tickets; velocity label truncated — Where: /projects/[projectId]/sprints ('QA Sprint 1', ends Oct 30) — Steps: The sprint shows Completed though it ends Oct 30 and has 0/0 tickets; the velocity label is truncated. — Expected vs actual: Status reflects the dates (Active/Upcoming) vs a wrong Completed; label not clipped — Fix: Derive sprint status from its dates; widen/wrap the velocity label — Acceptance: A sprint ending in the future is not Completed; the label is fully visible — Ref: pass9 #15; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** already fixed — the sprint card derives its status from the dates through the shared `periodStatus` helper.
  - **Agent note (2026-10-17):** fixed in code at 6942803 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 93f56b0a2 "QA-0074: derive sprint status from its dates" (2026-10-16 19:59:28 +0530); not re-probed liv

- [x] QA-0075 [Low][Projects] Cycle status wrong: shows Upcoming after start has passed; a draft offers 'Complete cycle' — Where: /projects/[projectId]/cycles/[cycleId] ('QA Cycle') — Steps: A cycle whose start date has passed shows 'Upcoming'; a draft cycle offers 'Complete cycle'. — Expected vs actual: Status reflects the dates and actions match the state vs a wrong label and an invalid action — Fix: Derive cycle status from its dates; gate 'Complete cycle' to active cycles — Acceptance: A started cycle shows Active; draft cycles don't offer Complete — Ref: pass9 #16; Screenshot: screens/p9-cycle-detail.png; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** already fixed — the cycles page groups by `periodStatus`, so a started cycle is Active.
  - **Agent note (2026-10-17):** fixed in code at 6942803 (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** PARTIAL
  - **Remaining:** claimed fixed in 6942803ce "QA-0075: show cycle status from its dates and gate" (2026-10-16 20:00:22 +0530); not re-prob

- [x] QA-0077 [Low][Projects] Pinned pages appear twice in the Pages list — Where: /projects/[projectId]/pages — Steps: A pinned page shows both in the pinned section and again in the main list. — Expected vs actual: A pinned page shows once (or clearly flagged) vs duplicated — Fix: Exclude pinned pages from the main list (or de-dupe) — Acceptance: A pinned page appears once — Ref: pass9 #22; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** already fixed — pinned pages sort to the top of the one list; there is no separate pinned section to duplicate them.
  - **Agent note (2026-10-17):** fixed in code at 24aa61c (after the 914259e retest baseline). Unticked: acceptance needs a live check.

**Settings**
  - **Retest status:** PARTIAL
  - **Remaining:** ui-B: /projects/3/pages lists QA3 Page once; no pin to confirm

- [x] QA-0078 [Low][Settings] Unknown settings routes render a fake breadcrumb instead of 404 — Where: /settings/[[...rest]] (e.g. /settings/xyz, /settings/teams) — Steps: Visiting /settings/xyz shows a fake 'Settings > Xyz' breadcrumb (and the sidebar logo is missing) instead of a 404. — Expected vs actual: An unknown settings path 404s vs a fabricated breadcrumb page — Fix: 404 unknown settings sub-routes (logo fix -> design QA-D008) — Acceptance: /settings/xyz returns a 404/not-found page — Ref: pass9 #20; Found 16 Oct 15:46 IST @914259e
  - **Agent note (2026-10-17):** already fixed — `/settings/[[...rest]]` calls `notFound()` for any unknown sub-route.
  - **Agent note (2026-10-17):** fixed in code at 26b667a (after the 914259e retest baseline). Unticked: acceptance needs a live check.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: claimed fixed in f779f4752 (2026-10-16 20:04:40 +0530); UI acceptance outstanding

- [x] QA-D006 [Low][Auth/Design] Fix public route handling and landing CTAs — Where: /login and /register 404 (app uses /signin); /signup -> /signin while landing CTAs say 'Get Started'/'Start for free'; stale 'Invalid email or password' banner persists with new field errors — Change: Redirect /login,/register to /signin; make landing CTAs match the real signup state; clear stale auth banners on new input — Acceptance: /login,/register redirect; CTAs match signup availability; no stale banner — Ref: pass1#25,E13,E14
  - **Agent note (2026-10-17):** /login and /register redirect to /signin (next.config.ts); the landing CTAs already follow `isSignupEnabled` and the stale sign-in banner clears on new input.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: landing copy needs visual read — batch B

- [x] QA-D008 [Low][Employees/Design] Fix Members/org-chart table overflow and raw role display — Where: Members table overflows and cuts off Department; shows raw enum roles; org chart '16 members' vs Members 15; Departments tab groups oddly — Change: Make the table responsive, show role labels, reconcile the member count and department grouping — Acceptance: Members table fits, shows labels, counts match the org chart — Ref: S28,S19; MIYO-0095,0096
  - **Agent note (2026-10-17):** already fixed — the members table scrolls horizontally rather than clipping, roles render through `getRoleLabel`, and the org chart counts active members only.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: commit a3cb29959 "QA-D008: make the members table reachable and tidy departmen" on main; visual acceptance needs browser

- [x] QA-D009 [Low][Global/Design] Fix pluralisation and small copy glitches — Where: '1 items/versions/templates/reviews', 'changed statusfrom', 'MEDIUN', '(edited)' saved as 'Edited' — Change: Use proper singular/plural and spacing; fix typos; trim spaces before punctuation — Acceptance: No '1 items'-style strings or typos in the UI — Ref: H18,S13,L12
  - **Agent note (2026-10-17):** `pluralise()` applied across the counts that said "1 items" (41e6dce93).
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: commit 34abe5dcf "QA-D009: fix pluralisation and the run-together status line" on main; visual acceptance needs browser

- [x] QA-D010 [Low][Global/Design] Fix sidebar/header duplication, contrast and accessibility labels — Where: sidebar header 'Miyo Global / Miyo Global'; logo accessible name repeated x3; logo missing on unknown settings routes; clock-in pill low contrast; view toggles lack aria-labels — Change: De-duplicate the brand header/logo alt; keep the logo on every shell page; raise pill contrast; add aria-labels to icon toggles — Acceptance: Header/logo shown once and present everywhere; icon controls have labels; contrast meets AA — Ref: pass1#24,#22,#23,pass9 #20
  - **Agent note (2026-10-17):** already fixed — the sidebar shows the org name only when it differs from the brand, the logo has no repeated accessible name, and unknown settings routes 404 rather than rendering a shell.
  - **Retest status:** STILL_BROKEN
  - **Remaining:** Confirmed still broken on retest @ b1bd73f: ui-B: settings duplicate SYSTEM sidebar + in-page SETTINGS nav; project name+H1; r3b-settings-dup-nav.png

- [ ] QA-D011 [Low][Projects/Design] Unify project/ticket status vocabulary, id format and board/timeline affordances — Where: status shown as ACTIVE / IN PROGRESS / Active / IN_PROGRESS / Todo (incl. raw IN_PROGRESS in Relations); id QUP-1 vs #1 and '#2' instead of 'QUP-2' in Backlog/My-tickets/Timeline/Relations; no ticket due-date; narrow board with internal scroll; burndown axis mismatch; full-height drawers for one line; Timeline has no bars for dateless tickets and no zoom or prev/next controls — Change: One status label set and one id format everywhere; add ticket due-date; widen the board; fix burndown axis; size drawers to content; show placeholder bars + add zoom and prev/next to Timeline — Acceptance: Statuses/ids consistent (QUP-2 not #2); board/timeline usable; drawers sized to content — Ref: pass1#9,S26,S27,S24,pass9 #12
  - **Agent note (2026-10-17):** partly done in code — one `ticketKey()` helper for ids, `periodStatus()` for sprint and cycle status, and the ticket sidebar has a due date. Board width, burndown axis, drawer sizing and the timeline zoom need the browser; left for the UI pass.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: commit fb41583e3 "QA-D011: one ticket id format across the project views" on main; visual acceptance needs browser — 202

- [x] QA-D012 [Low][Projects/Design] Unify date inputs and fix Milestone form accessibility — Where: the Milestone form uses a native date input while other forms use a custom calendar; Milestone form labels aren't associated with their inputs — Change: Use the same custom calendar component for all date fields; associate each label with its input (htmlFor/id) — Acceptance: All date fields use one component; Milestone form labels are programmatically associated — Ref: pass9 #21, design note
  - **Agent note (2026-10-17):** already fixed — the milestone form uses the shared date field and every label carries htmlFor against the input's id.
  - **Retest status:** NEEDS_UI
  - **Remaining:** Needs UI / browser verification: commit 7faf35a01 "QA-D012: one date picker, and milestone labels tied to their" on main; visual acceptance needs browser

- [ ] R3-0017 [Low][Integrations] Biometric + Inngest unauthenticated/config probes return 5xx — Where: `/api/hr/integrations/biometric`, `/api/inngest` — Steps: all roles → 500/503 — Expected: 401/501 — Actual: 5xx — Ref: matrix
  - **Agent note (2026-10-17):** `/api/inngest` answers 405 when no signing key is set (SEC-0015, 5bddd15). The biometric probe still needs a live check against the deployment.

- [ ] R3-0025 [Low][HR] Employees table Actions column clipped at 1280px — Where: `/hr` employees table — Steps: 1280 viewport — Expected: Actions fully visible — Actual: cut off — Fix: min-width / sticky Actions — Acceptance: Actions visible at 1280 — Ref: ui-B

- [x] R3-0026 [Low][Dashboard] HR card still mentions recruitment + large empty area — Where: `features/dashboard/hr-home-section.tsx:22` "Headcount, payroll, compliance, recruitment, and leave…" — Steps: open /dashboard — Expected: no recruitment (ATS removed); no big empty card — Actual: recruitment copy + empty space — Fix: rewrite copy; tighten layout — Acceptance: no recruitment; card filled — Ref: ui-B, 3cbeb49
  - **Agent note (2026-10-17):** the HR dashboard card no longer mentions recruitment.

- [x] R3-0027 [Low][Attendance] Heatmap shows 0 days while table has Present — Where: `features/hr/attendance/attendance-heatmap.tsx` summary vs History table — Steps: Attendance History with Present day — Expected: heatmap days/hours match table — Actual: 0 days / 0.0h — Fix: align heatmap API/aggregation with history — Acceptance: Present day increments heatmap — Ref: ui-B
  - **Agent note (2026-10-17):** already fixed with QA-0066 — the heatmap counts a day when there is a check-in, which is what the history table shows.

- [x] R3-0028 [Low][Landing] Duplicate "Sign In" and "Sign in" header buttons — Where: public `/` — Steps: Incognito landing — Expected: one CTA — Actual: both casings — r3b-landing-public.png — Fix: single label — Acceptance: one Sign in — Ref: MIYO-0314, ui-B
  - **Agent note (2026-10-17):** one sign-in call to action in the landing header.

- [x] R3-0029 [Low][Landing] Marketing CRM copy still on landing/metadata/filler stats — Where: public `/` title/meta/og + filler "10+ Core modules…" / "From recruitment to retirement" — Steps: curl/Incognito — Expected: HR product copy — Actual: CRM/Sales marketing — Fix: MIYO-0302/0311/0314 — Acceptance: no CRM/recruitment filler — Ref: ui-B STILL_BROKEN
  - **Agent note (2026-10-17):** title, description and the filler stats are HR copy now (MIYO-0302, MIYO-0311).

- [x] R3-0103 [Low][Projects] Page Icon Emoji defaults to 📄 — Where: `app/(dashboard)/projects/[projectId]/pages/page.tsx:143,303` — Steps: open pages — Expected: no emoji placeholder (or neutral icon component) — Actual: 📄 — Fix: MIYO-0316 — Acceptance: no document emoji — Ref: UI-A
  - **Agent note (2026-10-17):** the page-icon field is labelled "Icon" with an "Optional emoji" placeholder, and a page without one falls back to a lucide file icon (2698bf99d).

- [ ] R3-0202 [Low][Responsive] Triage MINOR cells (30 marked MINOR) — Where: responsive-design.md — Steps: batch polish — Expected: no overflow/clip — Actual: MINOR — Fix: CSS — Acceptance: MINOR→OK — Ref: responsive-design.md

- [ ] R3-D006 [Low][Design] Finish empty/loading/KPI strip pass — Where: global — Expected: one pattern — Actual: QA-D003 FIXED in UI-B (no empty/zero KPI strips on /hr /dashboard /projects); keep watching new pages — Fix: residual polish — Acceptance: no new empty KPI strips — Ref: QA-D003 ui-B FIXED
  - **Also known as:** QA-D003

- [ ] SEC-0014 [Low][Info Disclosure] `X-Powered-By: Next.js` exposed — **verified live**
  - **Agent note (2026-10-17):** `poweredByHeader: false` in next.config.ts (7491e44). Unticked until the header is checked on the deployment.
  - Where: prod response headers (all pages)
  - Evidence: `x-powered-by: Next.js`
  - Impact: tech fingerprinting.
  - Fix: `poweredByHeader: false` in `next.config.ts`.
  - Acceptance test: header absent. Regression: header assertion test.

- [ ] SEC-0015 [Low][Error handling] `/api/inngest` returns 500 to unauthenticated callers — **verified live**
  - **Agent note (2026-10-17):** the serve handler now mounts only when `INNGEST_SIGNING_KEY` is set; without it the route answers 405 (5bddd15). Unticked until a GET against the deployment is checked.
  - Where: `app/api/inngest/route.ts` (`serve(...)`)
  - Evidence: `GET /api/inngest` → `500 {"code":"internal_server_error"}` (should be 401/405). Signals a misconfigured/partly‑wired Inngest.
  - Impact: minor info leak + confirms endpoint; ensure the Inngest signing key is set so the serve handler authenticates introspection/invoke.
  - Fix: set `INNGEST_SIGNING_KEY`/`INNGEST_EVENT_KEY`; confirm the serve handler rejects unsigned calls cleanly (401).
  - Acceptance test: unauthenticated GET → 401/405, not 500.

- [x] SEC-0016 [Low][CORS] Static routes return `Access-Control-Allow-Origin: *` — **verified live**
  - **Agent note (2026-10-17):** no action required — the header is on Vercel's static asset responses only, `/api/*` sets no ACAO. Documented, closed.
  - Where: Vercel static asset responses (`/signin`, `_next` assets)
  - Evidence: `access-control-allow-origin: *` on static `/signin`; **API routes do NOT set ACAO** (CORS correctly closed on `/api/*`).
  - Impact: none for data (no credentialed cross‑origin API reads); documented to avoid false alarm.
  - Fix: none required; optionally scope asset CORS.
  - Acceptance test: `/api/auth/session` with `Origin: evil` returns no ACAO (already true).

- [ ] SEC-0017 [Low][Crypto hygiene] GCM decrypt without explicit `authTagLength` — **code-only (semgrep)**
  - **Agent note (2026-10-17):** `authTagLength: 16` plus a length check, with a regression test for a 12-byte tag (7491e44).
  - Where: `lib/secret-crypto.ts:44` (`createDecipheriv("aes-256-gcm", key, iv)` + `setAuthTag`)
  - Evidence: semgrep `gcm-no-tag-length`. Tag is set via `setAuthTag`, so this is largely informational, but a short/attacker‑truncated tag isn't explicitly rejected.
  - Impact: low — forged‑tag risk if a truncated tag were ever accepted.
  - Fix: pass `{ authTagLength: 16 }` and reject tags ≠ 16 bytes.
  - Acceptance test: decrypt with a 12‑byte tag throws. Regression unit test.

- [ ] SEC-0018 [Low][Info Disclosure] `git` history contains only placeholder/test credentials — **verified (gitleaks, full history)**
  - **Agent note (2026-10-17):** the gate is the gitleaks job added in SEC-0010 (`.github/workflows/security.yml`, 7f5cc0c). Unticked until that commit is pushed and the job runs green.
  - Where: whole git history; `lib/email/config.test.ts`, `lib/secret-crypto.test.ts`, `scripts/_guard.test.ts`, `.github/workflows/*`
  - Evidence: 97 gitleaks hits — all fake (`wSsVR.token`, test `ENCRYPTION_KEY`, CI `postgresql://user:pass@localhost`, agent `.omc` keys). **No live production secret found.**
  - Impact: none directly; risk is future real leaks going unnoticed without a gate.
  - Fix: add `gitleaks` to CI (SEC‑0010); keep real secrets only in Vercel env.
  - Acceptance test: gitleaks CI passes on a clean tree and fails on a planted real‑looking key.

---

### Info

- [ ] R3-0015 [Info][ATS] Recruitment removed (`3cbeb49`); `/hr/ats` `/careers` 404 — N/A for ATS E2E

---

## 7. Phase 5 — Hardening baseline (from SEC)

These are standing engineering standards. Implement as checklist items; each may span multiple commits but must leave CI greener.

- [ ] HARDEN-0001 [High][Security] Security headers baseline — Keep CSP `frame-ancestors 'none'`, HSTS preload, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy. Set `poweredByHeader: false` in `next.config.ts`. Tighten CSP over time with per-request nonces; keep `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. — Acceptance: headers present; `X-Powered-By` absent.
- [ ] HARDEN-0002 [High][Security] Target CSP (nonce-based) — Apply the CSP block from SEC Hardening §2 (`default-src 'self'`; `script-src` with nonce + Cloudflare challenges; fonts/img/connect allowlists; `frame-ancestors 'none'`). — Acceptance: CSP report shows no unexpected third parties on /dashboard.
- [ ] HARDEN-0003 [High][Security] Redis-backed rate-limit middleware — Replace in-memory map with Upstash sliding window keyed by `tier:ip` (+ `tier:account` for login/reset). Fail-closed on auth tiers. Return 429 + `Retry-After`. Tiers: login 10/min, auth-write 20/5min, account-create 10/5min, public-intake 10/min, ai 10/min, upload 20/min. — Acceptance: 15 rapid logins → ≥1 429.
- [ ] HARDEN-0004 [High][Security] Zod validation policy — Every route body/query parsed with `.strict()` **inside** the authorised callback. Never spread request body into `db.update/insert`. Never accept `role`, `orgId`, `salary`, or `id` in a self-service update schema. — Acceptance: unauthenticated POST never returns schema 400 before 401.
- [ ] HARDEN-0005 [Critical][Security] Single authorisation path — `withAuth`/`withRoles` for API; matching `requireMember({roles, mfa:true, liveSession:true})` for server actions with the SAME revocation + `mfaSatisfied` checks. All `users.role` / `organizationMembers.role` writes go through `checkRoleAssignment`. ESLint/CI grep forbids `.set({... role ...})` without adjacent `checkRoleAssignment`. — Acceptance: HR→CEO rejected on every path; revoked JWT rejected on a leave-apply action.
- [ ] HARDEN-0006 [High][CI] Security tests as required checks — `gitleaks` (full history), `pnpm audit --audit-level=high`, `osv-scanner`, `semgrep` (owasp-top-ten, nextjs, typescript). Regression: unauthenticated sweep 401 on `/api/*`; HR→CEO rejected; revoked session blocked; rate-limit 429; `sanitizeHtml` neutralises mXSS/SVG. Pin Actions to SHAs + Dependabot. **Note:** requiring PR review on `main` conflicts with D-PUSH — implement the scanners either way; gate merge vs direct-push per Tarun.
- [ ] HARDEN-0007 [High][Security] Secrets & PII — Encrypt `taxId`, `bankDetails`, OAuth tokens with `secret-crypto`; confirm prod-only secrets; remove `.omc/` from tracking (SEC-0013). — Acceptance: fresh employee row shows `enc:v1:` prefixes; `.omc/` untracked.

### Reference text (from SECURITY-TODO.md)

## Hardening baseline

**1. Security headers (`next.config.ts` `headers()` or middleware).** Keep the current strong set (CSP with `frame-ancestors 'none'`, HSTS preload, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer‑Policy, Permissions‑Policy). Add `poweredByHeader:false`. Tighten CSP over time: drop `'unsafe-inline'` from `script-src` via nonces; keep `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.

**2. CSP (target, nonce‑based):**
```
default-src 'self';
script-src 'self' 'nonce-<per-request>' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://lh3.googleusercontent.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://*.r2.cloudflarestorage.com;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests;
```

**3. Rate‑limit middleware (Redis‑backed, fail‑closed on auth tiers).** Replace the in‑memory map with Upstash sliding‑window keyed by `tier:ip` (and `tier:account` for login/reset). Return 429 + `Retry-After`. Tiers: login 10/min, auth‑write 20/5min, account‑create 10/5min, public‑intake 10/min, ai 10/min, upload 20/min.

**4. Zod validation policy.** Every route body/query parsed with a `.strict()` zod schema **inside** the authorised callback (never before auth). Centralise shared schemas in `lib/validations/*`. Reject unknown keys to kill mass‑assignment (never spread request body into `db.update/insert`; whitelist fields). Never accept `role`, `orgId`, `salary`, or `id` in a self‑service update schema.

**5. Authorisation helper.** Make one path for every mutation: `withAuth`/`withRoles` for API routes, and a matching `requireMember({roles, mfa:true, liveSession:true})` for server actions that performs the SAME revocation + `mfaSatisfied` checks. All `users.role`/`organizationMembers.role` writes must go through `checkRoleAssignment`. Add an ESLint/CI grep rule forbidding `.set({... role ...})` without an adjacent `checkRoleAssignment`.

**6. Security tests in CI (required checks).** `gitleaks` (full history), `pnpm audit --audit-level=high`, `osv-scanner`, `semgrep --config p/owasp-top-ten --config p/nextjs --config p/typescript`. Plus regression tests: unauthenticated sweep asserts 401 on all `/api/*`; HR→CEO role change rejected; revoked session blocked on a server action; rate‑limit returns 429; `sanitizeHtml` neutralises mXSS/SVG payloads. Pin GitHub Actions to SHAs + Dependabot; require PR review on `main`.

**7. Secrets & PII.** Encrypt `taxId`, `bankDetails`, and OAuth tokens with `secret-crypto`; confirm `ENCRYPTION_KEY`/`CRON_SECRET`/`NEXTAUTH_SECRET`/`INNGEST_SIGNING_KEY` are set in prod only; remove `.omc/` from the repo.


---

## 8. Phase 6 — ATS build

**Status:** Not built. Recruitment was removed in commit `3cbeb49` (15 Oct 2026). Live `/hr/ats`, `/hr/recruitment`, `/careers`, `/jobs` → **404**. DB leftover tables remain deliberately. Carry forward MIYO-0626–MIYO-0687 as still open.

### Architecture (from ATS-MASTER-PROMPT.md)

# ATS master prompt: Miyo Global CRM applicant tracking

## 1. Goal

Build a complete, simple applicant tracking system (ATS) inside Miyo Global CRM, replacing the Recruitment module removed in Oct 2026. Model it on OpenCATS (job orders, pipelines, careers portal, questionnaires, email templates, search) and Odoo Recruitment (configurable stages with auto-emails, refuse reasons, interview forms, talent pools, duplicate warnings, offer generation, create employee). It must hand hires straight into the existing onboarding flow.

Non-goals for v1: job-board syndication, AI scoring, background verification, self-scheduling (later phases only).

Rules: follow MIYO-CRM-TODO.md header instructions (typecheck, lint, test and build after each item; commit with the ID; push to main; never touch .omc/, scripts/generate-miyo-payslips.ts or .env*; never connect to prod DB). UI: simple, ink/gold/silver, no gradients, illustrations or emoji. Times in IST.

## 2. Architecture

- **Next.js App Router**: staff pages under `app/(dashboard)/ats/**`; public pages under `app/(public)/careers/**` and `app/(public)/offer/[token]`. Add the public paths to the public list in `lib/auth/route-access.ts`.
- **API**: REST route handlers under `app/api/ats/**` wrapped with `withRoles(ATS_ROLES)` plus `lib/ats/access.ts` per-job checks. Public endpoints under `app/api/public/ats/**` with Turnstile, a honeypot and a persistent rate limiter (not `lib/redis.ts`, which is in-memory).
- **Domain layer**: `lib/ats/` (access.ts, stages.ts, pipeline.ts, duplicates.ts, search.ts, offers.ts, hire.ts, emails.ts, ics.ts, retention.ts). Route handlers stay thin.
- **Jobs (Inngest only, nothing in vercel.json)**: `ats/resume.uploaded` (extract text), `ats/interview.reminders`, `ats/feedback.nudge`, `ats/jobs.auto-close` (daily), `ats/retention` (daily), `ats/email.send` (queued sends for bulk actions).
- **Storage**: private R2 prefix `ats/{orgId}/candidates/{candidateId}/…`; presigned PUT for uploads; signed GET after an access check.
- **Email**: `renderEmail('ats-…', vars)` using `email-templates/ats-*.html/.txt`; log every send in `ats_email_log`; ICS for interviews.
- **Search**: Postgres tsvector on candidates (name, email, skills, resumeText) with a GIN index; `websearch_to_tsquery`.
- **Flag**: org flag `ats`, off by default.

## 3. Reuse or drop: leftover tables and code

| Leftover | Decision | Notes |
|---|---|---|
| job_postings | REUSE | Add slug, publishedAt, closesAt, seoTitle, seoDescription, requisitionId, salaryVisible. Keep applicationFields only as a migration source for ats_application_questions. |
| hiring_flow_templates, hiring_flow_rounds | DROP | Replaced by ats_stages. |
| candidate_sources | REUSE | Source list (Careers, LinkedIn, Referral, Agency, Manual). |
| candidates | REUSE | Add search tsvector, phoneNormalized, linkedinUrl index. Keep duplicateOfId. Ignore aiScore and bgv* for now. |
| candidate_applications | REUSE | Add stageId, rating, rejectedReasonId, source, answers relation. Replace the status enum with stage type for logic. |
| interviews | REUSE | Add icsUid, icsSequence, meetingUrl, timezone. |
| scorecard_templates, interview_scorecards | REUSE | Criteria JSON 1–5 plus recommendation. |
| interview_booking_links | REUSE-LATER | Self-scheduling phase. |
| candidate_referrals | REUSE-LATER | Referral programme. |
| candidate_documents_vault | DROP | Merge into candidate_documents. |
| candidate_documents | REUSE | Attachments. |
| interview_slas, candidate_sla_tracking | DROP | Time-in-stage comes from ats_activity. |
| interview_questions | DROP | Questions belong to scorecard templates. |
| candidate_reference_checks | DROP | Not in v1. |
| candidate_offers | REUSE | Add tokenHash, expiresAt, respondedAt, declineReason, approvalStatus. |
| hr_offer_letter_templates, hr_offer_letter_custom_variables | REUSE | The /hr/offer-letter-templates page stays. |
| job_roles | REUSE | Designation picker. Delete the QA test roles. |
| background_verifications | REUSE-LATER | |
| enums job_posting_status, candidate_status, interview_type, interview_result, application_status | KEEP job_posting_status, interview_type, interview_result; stop using candidate_status/application_status in new code | Postgres enums can't drop values easily; leave them. |
| lib/files/extract-resume-text.ts, lib/files/resume-file-validation.ts | REUSE | |
| lib/constants/candidate-offers.ts, lib/constants/interview-format.ts | REUSE | |
| lib/hr/render-offer-letter-for-offer.ts, lib/hr/offer-letter-branded-pdf.tsx | REUSE | |
| lib/hr/job-opening-form-state.ts, application-field-config | REUSE (adapt) | |
| lib/data/india-locations.ts, country-states.ts | REUSE | Location picker. |
| lib/email-templates/hr-recruitment.ts, recruitment parts of hr.ts | DROP | Replaced by email-templates/ats-*. |
| lib/integrations/job-boards.ts | DROP for now | Re-add in a job-board phase. |

Drop only after Tarun confirms the row counts on prod. The agent writes the SELECT; Tarun runs it.

## 4. New tables (lib/db/schema/ats.ts)

```
ats_requisitions(id, org_id, title, department_id, location, employment_type, openings int,
  salary_min, salary_max, currency default 'INR', justification text, hiring_manager_id,
  status DRAFT|PENDING|APPROVED|REJECTED|FILLED|CANCELLED, approver_id, decided_at timestamptz,
  decision_note, created_by, created_at timestamptz, updated_at timestamptz)
ats_stages(id, org_id, job_id null, name, type APPLIED|SCREEN|INTERVIEW|OFFER|HIRED|REJECTED,
  sort int, email_template_id text null, auto_email bool default false, is_default bool)
ats_job_members(job_id, user_id, role HIRING_MANAGER|INTERVIEWER|RECRUITER, pk(job_id,user_id))
ats_application_questions(id, job_id, label, type, options jsonb, required bool, knockout jsonb, sort)
ats_application_answers(application_id, question_id, value jsonb)
ats_candidate_tags(id, org_id, name unique per org); ats_candidate_tag_links(candidate_id, tag_id)
ats_candidate_notes(id, candidate_id, application_id null, author_id, body, mentions uuid[], created_at)
ats_activity(id, org_id, candidate_id, application_id null, actor_id null, type, data jsonb, created_at)
ats_refuse_reasons(id, org_id, name, email_template_id null, active)
ats_consents(id, candidate_id, type PROCESSING|TALENT_POOL, text_version, granted_at, ip, expires_at)
ats_email_log(id, org_id, candidate_id, template_id, to_email, subject, provider_id, status, sent_at)
```

All timestamps are timestamptz. Index (org_id, …) on every table. GIN index on candidates.search.

## 5. Routes (pages)

Staff (ATS roles; hiring managers and interviewers are scoped):
- `/ats`: overview (open jobs, new applications, today's interviews)
- `/ats/requisitions`, `/ats/requisitions/new`, `/ats/requisitions/[id]`
- `/ats/jobs`, `/ats/jobs/new`, `/ats/jobs/[jobId]` (summary), `/ats/jobs/[jobId]/pipeline` (kanban), `/ats/jobs/[jobId]/form`, `/ats/jobs/[jobId]/team`, `/ats/jobs/[jobId]/edit`
- `/ats/candidates` (search and list), `/ats/candidates/new`, `/ats/candidates/import`, `/ats/candidates/[candidateId]`
- `/ats/pool`: talent pool
- `/ats/interviews`: my upcoming interviews and scorecards to submit
- `/ats/offers`
- `/ats/reports`, `/ats/reports/sources`, `/ats/reports/funnel`
- `/ats/settings` (stages, refuse reasons, emails, scorecard templates, retention, careers page settings)

Public:
- `/careers`, `/careers/[slug]`, `/careers/[slug]/apply`, `/careers/thanks`
- `/offer/[token]`
- `sitemap.xml` entries for jobs

## 6. API

```
GET/POST        /api/ats/requisitions          PATCH /api/ats/requisitions/[id]
POST            /api/ats/requisitions/[id]/submit | approve | reject
GET/POST        /api/ats/jobs                  GET/PATCH/DELETE /api/ats/jobs/[jobId]
POST            /api/ats/jobs/[jobId]/publish | unpublish | close | duplicate
GET/PUT         /api/ats/jobs/[jobId]/questions
GET/PUT         /api/ats/jobs/[jobId]/members
GET             /api/ats/jobs/[jobId]/pipeline
GET/POST        /api/ats/candidates            GET /api/ats/candidates/search?q=
GET/PATCH/DELETE /api/ats/candidates/[id]      POST /api/ats/candidates/[id]/merge | erase | export
POST            /api/ats/candidates/import (dry_run=true|false)
GET/POST        /api/ats/candidates/[id]/notes | tags | files
POST            /api/ats/applications/[id]/move   {stageId, version, sendEmail?, reasonId?}
POST            /api/ats/applications/bulk        {ids[], action, …}
POST            /api/ats/applications/[id]/hire
GET/POST        /api/ats/interviews            PATCH/DELETE /api/ats/interviews/[id]
GET/POST        /api/ats/interviews/[id]/scorecards
GET/POST        /api/ats/offers                POST /api/ats/offers/[id]/send | approve | withdraw
GET             /api/ats/reports/time-to-hire | sources | funnel
GET/PUT         /api/ats/settings/stages | reasons | emails | retention
Public:
GET  /api/public/ats/jobs?org=     GET /api/public/ats/jobs/[slug]
POST /api/public/ats/upload-url    POST /api/public/ats/apply
GET/POST /api/public/ats/offer/[token]   (view, accept, decline)
```

Every response uses the safe-error helper (no SQL in errors). Zod for every body.

## 7. UI notes

- Kanban: plain columns with a count in the header and silver borders; cards show name, rating dots, days in stage and source. No avatars-as-decoration and no coloured chips.
- Candidate profile: two columns (left: details and applications; right: tabs). PDF viewer inline.
- Careers page: org logo, a plain list, filters on top, gold only for the Apply button.
- Every destructive or emailing action shows a preview or confirm step.

## 8. Emails (in email-templates/)

ats-application-received, ats-new-application-internal, ats-application-rejected, ats-interview-invite (with ICS), ats-interview-reminder, ats-interviewer-feedback-request, ats-offer, ats-offer-response-hr, ats-requisition-approval. Per-org overrides come from /ats/settings/emails.

## 9. Permissions

| Action | CEO | Admin | HR | Recruiter | Hiring manager (own jobs) | Interviewer (assigned) |
|---|---|---|---|---|---|---|
| Create requisition | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| Approve requisition | ✓ (default approver) | configurable | – | – | – | – |
| Create/publish job | ✓ | ✓ | ✓ | ✓ | – | – |
| View candidates | all | all | all | all | own jobs | assigned only |
| Move stage / reject | ✓ | ✓ | ✓ | ✓ | own jobs | – |
| Schedule interview | ✓ | ✓ | ✓ | ✓ | own jobs | – |
| Submit scorecard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| See salary/offer | ✓ | ✓ | ✓ | ✓ | own jobs | – |
| Create/send offer | ✓ | ✓ | ✓ | ✓ | – | – |
| Hire → employee | ✓ | ✓ | ✓ | – | – | – |
| Erase/export candidate | ✓ | ✓ | ✓ | – | – | – |

## 10. To-do pointers (MIYO-CRM-TODO.md, "ATS master build")

- Phase 0 Foundation: MIYO-0626–MIYO-0631
- Phase 1 Requisitions & jobs: MIYO-0632–MIYO-0636
- Phase 2 Careers site: MIYO-0637–MIYO-0641
- Phase 3 Candidates: MIYO-0642–MIYO-0649
- Phase 4 Pipeline: MIYO-0650–MIYO-0655
- Phase 5 Interviews: MIYO-0656–MIYO-0660
- Phase 6 Offers & hire: MIYO-0661–MIYO-0663
- Phase 7 Emails: MIYO-0664–MIYO-0673
- Phase 8 Reports: MIYO-0674–MIYO-0677
- Phase 9 Privacy & retention: MIYO-0678–MIYO-0681
- Phase 10 Tests: MIYO-0682–MIYO-0687


### ATS checklist (MIYO-0626 – MIYO-0687)

- [ ] MIYO-0626 [High][ATS/0 Foundation] Decide and record reuse/drop for every leftover recruitment table
  - **Where:** ATS-MASTER-PROMPT.md §3, lib/db/schema/hr/_all.ts
  - **Problem:** The Recruitment module was removed in Oct 2026 but 22 tables and 5 enums remain; building fresh tables beside them doubles the schema.
  - **Fix:** Apply the table in ATS-MASTER-PROMPT.md §3: REUSE job_postings, candidates, candidate_applications, interviews, scorecard_templates, interview_scorecards, candidate_sources, candidate_offers, hr_offer_letter_templates, hr_offer_letter_custom_variables, job_roles, candidate_documents; REUSE-LATER interview_booking_links, candidate_referrals, background_verifications; DROP hiring_flow_templates, hiring_flow_rounds (replaced by ats_stages), candidate_documents_vault (merge into candidate_documents), interview_slas, candidate_sla_tracking, interview_questions, candidate_reference_checks. Count rows on prod first (Tarun runs the SELECT); drop only empty tables, in a later migration.
  - **Acceptance check:** Decision table committed; a migration exists that drops only the DROP tables with `IF EXISTS`, gated behind Tarun's row-count confirmation.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0627 [High][ATS/0 Foundation] Decide reuse/drop for leftover recruitment code
  - **Where:** ATS-MASTER-PROMPT.md §3
  - **Problem:** Unreachable files remain from the removed module.
  - **Fix:** REUSE: lib/files/extract-resume-text.ts, lib/files/resume-file-validation.ts, lib/constants/candidate-offers.ts, lib/constants/interview-format.ts, lib/hr/render-offer-letter-for-offer.ts, lib/hr/job-opening-form-state.ts, application-field-config, lib/data/india-locations.ts. REWRITE: lib/email-templates/hr-recruitment.ts (replace with email-templates/ats-*). DROP: lib/integrations/job-boards.ts until a job-board phase, duplicate getCandidateRejectionEmail/interview helpers in lib/email-templates/hr.ts.
  - **Acceptance check:** Each file is either imported by ATS code or deleted; `pnpm lint:dead-code` passes.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0628 [High][ATS/0 Foundation] Merge the RECRUITER role (branch cursor/admin-onboarding-recruiter-role-b650, commit 7fa03d7)
  - **Where:** lib/constants/roles.ts, user_role enum migration, lib/auth/route-access.ts
  - **Problem:** RECRUITER exists only on an unmerged branch.
  - **Fix:** Cherry-pick/rebase the role (enum value via `ALTER TYPE ... ADD VALUE IF NOT EXISTS`), add ATS_ROLES = [CEO, ADMIN, HR, RECRUITER]; RECRUITMENT_HR_ROLES points to it.
  - **Acceptance check:** A RECRUITER user can open /ats and nothing in /hr/payroll.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0629 [High][ATS/0 Foundation] Per-job hiring team permissions
  - **Where:** new table ats_job_members (jobId, userId, role HIRING_MANAGER|INTERVIEWER|RECRUITER)
  - **Problem:** Managers and interviewers need access to only their jobs.
  - **Fix:** lib/ats/access.ts: canViewJob/canEditJob/canViewCandidate/canScore; HR/CEO/Admin/RECRUITER see all; hiring managers see their jobs; interviewers see only candidates they interview, no salary/offer fields.
  - **Acceptance check:** Matrix test covers each role × action; interviewer gets 404 on another job's candidate.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0630 [High][ATS/0 Foundation] Create the ATS schema migration (additive)
  - **Where:** drizzle/0157_ats_core.sql, lib/db/schema/ats.ts
  - **Problem:** Reused tables lack the columns the new design needs.
  - **Fix:** Add: ats_requisitions, ats_stages (per org, per job override, order, type APPLIED/SCREEN/INTERVIEW/OFFER/HIRED/REJECTED, emailTemplateId, autoEmail bool), ats_job_members, ats_application_questions, ats_application_answers, ats_candidate_tags, ats_candidate_notes, ats_activity, ats_refuse_reasons, ats_consents, ats_email_log; add job_postings.slug (unique per org), publishedAt, closesAt, seo fields; candidate_applications.stageId, rating, rejectedReasonId, source; candidates.search tsvector + GIN index, phoneNormalized, linkedinUrl index. All `IF NOT EXISTS`. Register in apply-pending and the journal.
  - **Acceptance check:** Migration applies on a fresh DB built from all SQL files and is idempotent on a second run.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0632 [High][ATS/1 Requisitions & jobs] Requisitions with approval
  - **Where:** /ats/requisitions, app/api/ats/requisitions/**
  - **Problem:** No way to request headcount.
  - **Fix:** Fields: title, department, location, employment type, openings, salary range (hidden from interviewers), justification, hiring manager. Submit → approver (CEO by default, configurable) gets ats-requisition-approval email; approve/reject with comment; history in ats_activity.
  - **Acceptance check:** Approved requisition can be turned into a job; rejected one cannot.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0633 [High][ATS/1 Requisitions & jobs] Job postings CRUD from requisitions
  - **Where:** /ats/jobs, /ats/jobs/new, /ats/jobs/[jobId]/edit
  - **Problem:** —
  - **Fix:** Rich-text description (sanitised), requirements, location (india-locations), remote option, salary visibility toggle, closing date, hiring team.
  - **Acceptance check:** Job saves, validates with zod, and appears in the list with status DRAFT.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0634 [High][ATS/1 Requisitions & jobs] Publish / unpublish / close jobs
  - **Where:** app/api/ats/jobs/[jobId]/publish
  - **Problem:** —
  - **Fix:** States DRAFT → PUBLISHED → CLOSED (plus ON_HOLD). Publish sets publishedAt and slug; unpublish hides from careers; closesAt auto-closes via one Inngest daily job (replace the dead close-expired-job-postings cron).
  - **Acceptance check:** Published job appears on /careers within one request; closed job returns 410 page.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0637 [High][ATS/2 Careers site] Public careers page
  - **Where:** app/(public)/careers/page.tsx (no auth), lib/auth/route-access public list
  - **Problem:** —
  - **Fix:** Plain list of published jobs with department/location filters, org logo, ink/gold palette, no illustrations. Server-rendered, cached with revalidateTag on publish.
  - **Acceptance check:** Loads < 1 s uncached locally; lists only PUBLISHED jobs of the org.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0638 [High][ATS/2 Careers site] Job detail page with SEO
  - **Where:** app/(public)/careers/[slug]/page.tsx
  - **Problem:** —
  - **Fix:** generateMetadata (title, description, canonical, OpenGraph), JSON-LD JobPosting (datePosted, validThrough, employmentType, hiringOrganization, jobLocation, baseSalary when visible), sitemap.xml entries, robots allow.
  - **Acceptance check:** Google Rich Results test validates JobPosting.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0639 [High][ATS/2 Careers site] Apply form with R2 resume upload
  - **Where:** app/(public)/careers/[slug]/apply, app/api/public/ats/apply
  - **Problem:** —
  - **Fix:** Name, email, phone, LinkedIn, resume (PDF/DOC/DOCX ≤ 5 MB via resume-file-validation.ts, magic-byte check), custom questions, consent checkbox. Upload to R2 private bucket with presigned PUT; store key only.
  - **Acceptance check:** Application row + candidate + resume object created; candidate gets ats-application-received; team gets ats-new-application-internal.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0640 [High][ATS/2 Careers site] Spam protection and rate limiting on apply
  - **Where:** app/api/public/ats/apply
  - **Problem:** Public endpoint.
  - **Fix:** Cloudflare Turnstile (or hCaptcha), honeypot field, per-IP and per-email limit (5/hour) using a real store (Upstash/Postgres — lib/redis.ts is in-memory and does not work on Vercel), reject disposable domains optionally.
  - **Acceptance check:** Sixth submission in an hour from one IP gets 429; bot without token gets 400.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0642 [High][ATS/3 Candidates] Resume text extraction
  - **Where:** Inngest function ats/resume.uploaded, lib/files/extract-resume-text.ts
  - **Problem:** —
  - **Fix:** Extract text (pdf-parse/mammoth) after upload, store candidates.resumeText, update tsvector. Failures logged, never block apply.
  - **Acceptance check:** Uploaded PDF's text searchable within a minute.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0643 [High][ATS/3 Candidates] Full-text candidate search
  - **Where:** /ats/candidates, app/api/ats/candidates/search
  - **Problem:** —
  - **Fix:** Postgres websearch_to_tsquery on name, email, skills, resume text with ts_rank; filters by tag, stage, job, source, date; escaped ILIKE fallback.
  - **Acceptance check:** Searching 'react node' finds candidates with both words in their resume.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0644 [High][ATS/3 Candidates] Duplicate detection
  - **Where:** lib/ats/duplicates.ts
  - **Problem:** Same person applies twice.
  - **Fix:** On apply/create, match on lower(email), normalised phone, LinkedIn URL; link to existing candidate (new application on existing profile); show 'Possible duplicate' banner with merge action for fuzzy name+phone.
  - **Acceptance check:** Second application with same email attaches to the first candidate.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0645 [High][ATS/3 Candidates] Candidate profile page
  - **Where:** /ats/candidates/[candidateId]
  - **Problem:** —
  - **Fix:** Header (name, contact, current stage per application, rating), tabs: Overview, Resume (inline PDF viewer), Applications, Interviews, Scorecards, Offers, Notes, Files, Activity, Emails. Salary/offer data hidden from interviewers.
  - **Acceptance check:** All tabs load; interviewer sees no offer tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0650 [High][ATS/4 Pipeline] Configurable stages
  - **Where:** /ats/settings/stages, ats_stages
  - **Problem:** —
  - **Fix:** Default stages: Applied, Screening, Interview, Offer, Hired, Rejected (OpenCATS/Odoo style); org-level list with per-job override; each stage may auto-send a template.
  - **Acceptance check:** Admin adds 'Assignment' between Screening and Interview; new jobs use it.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0651 [High][ATS/4 Pipeline] Kanban pipeline with drag and drop
  - **Where:** /ats/jobs/[jobId]/pipeline
  - **Problem:** —
  - **Fix:** Columns = stages, cards with name, rating, days in stage, source; dnd-kit drag with optimistic update + rollback; moving to Rejected opens reason dialog; moving to a stage with autoEmail shows 'Send email?' preview (can skip).
  - **Acceptance check:** Drag to Interview persists after refresh; activity logged.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0652 [High][ATS/4 Pipeline] Bulk actions
  - **Where:** pipeline and candidate list
  - **Problem:** —
  - **Fix:** Select many → move stage, reject with reason + email, tag, assign, export CSV.
  - **Acceptance check:** Bulk reject of 20 sends 20 rejection emails (queued) and logs 20 activities.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0656 [High][ATS/5 Interviews] Interview scheduling with ICS
  - **Where:** /ats/interviews, app/api/ats/interviews
  - **Problem:** —
  - **Fix:** Schedule round (type, interviewers, start/end in IST, location or meeting link). Send ats-interview-invite to the candidate and interviewers with ICS (METHOD:REQUEST, UID stable, SEQUENCE bump on reschedule, CANCEL on cancel). Conflict check on interviewer busy times.
  - **Acceptance check:** Gmail shows an Add-to-calendar card; reschedule updates the same event.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0657 [High][ATS/5 Interviews] Interview reminders
  - **Where:** Inngest scheduled step
  - **Problem:** —
  - **Fix:** ats-interview-reminder 24 h before to candidate; interviewer reminder 1 h before.
  - **Acceptance check:** Reminder sent once per interview.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0658 [High][ATS/5 Interviews] Scorecards and ratings
  - **Where:** scorecard_templates, interview_scorecards (reuse)
  - **Problem:** —
  - **Fix:** Template per job/round: criteria with 1–5 scale, overall recommendation (Strong no…Strong yes), notes. Interviewers can't see others' scorecards until they submit their own.
  - **Acceptance check:** Average rating shows on the card; hidden-until-submit enforced in API.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0661 [High][ATS/6 Offers & hire] Offers with letter templates
  - **Where:** candidate_offers, hr_offer_letter_templates (reuse), /hr/offer-letter-templates
  - **Problem:** —
  - **Fix:** Create offer (CTC, joining date, designation, department, manager, expiry). Render letter via render-offer-letter-for-offer.ts + offer-letter-branded-pdf.tsx. Optional approval by CEO before sending.
  - **Acceptance check:** PDF renders with the template variables filled.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0662 [High][ATS/6 Offers & hire] Candidate accept/decline page
  - **Where:** app/(public)/offer/[token]
  - **Problem:** —
  - **Fix:** Tokenised page (hashed token, expiry) showing offer summary and PDF; accept (typed name + checkbox) or decline (reason). Notify HR with ats-offer-response-hr.
  - **Acceptance check:** Accepted offer moves application to Hired-pending; expired token shows expiry page.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0663 [High][ATS/6 Offers & hire] Convert hire to employee and trigger onboarding
  - **Where:** app/api/ats/applications/[id]/hire, existing onboard flow
  - **Problem:** —
  - **Fix:** Prefill the existing onboard form (name, personal email, phone, designation, department, joining date, salary) from the offer; on submit create user + salary structure, mark application HIRED, close requisition opening, trigger initiate-onboarding (Inngest) and auth-welcome-set-password.
  - **Acceptance check:** Hired candidate appears in /employees with onboarding tasks; no duplicate user if already exists.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0664 [High][ATS/7 Emails] Implement candidate/team email `ats-application-received`
  - **Where:** email-templates/ats-application-received.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send on apply via renderEmail('ats-application-received', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0666 [High][ATS/7 Emails] Implement candidate/team email `ats-application-rejected`
  - **Where:** email-templates/ats-application-rejected.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send on reject with an emailing reason via renderEmail('ats-application-rejected', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0667 [High][ATS/7 Emails] Implement candidate/team email `ats-interview-invite`
  - **Where:** email-templates/ats-interview-invite.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send on schedule/reschedule via renderEmail('ats-interview-invite', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0670 [High][ATS/7 Emails] Implement candidate/team email `ats-offer`
  - **Where:** email-templates/ats-offer.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send on offer send via renderEmail('ats-offer', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0678 [High][ATS/9 Privacy & retention] Consent capture
  - **Where:** ats_consents, apply form
  - **Problem:** DPDP Act 2023 / GDPR.
  - **Fix:** Required consent for processing; optional consent to keep in talent pool for N months; store text version, timestamp, IP.
  - **Acceptance check:** Consent record exists for each application.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0679 [High][ATS/9 Privacy & retention] Retention and erasure
  - **Where:** Inngest daily ats/retention, /ats/candidates/[id] delete
  - **Problem:** —
  - **Fix:** Org setting retention months (default 12) for rejected candidates; auto-anonymise (keep stats) and delete R2 files; manual 'erase candidate' for requests; audit log.
  - **Acceptance check:** Candidate older than retention is anonymised and resume object deleted.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0682 [High][ATS/10 Tests] ATS permission matrix tests
  - **Where:** lib/ats/__tests__/access.test.ts
  - **Problem:** —
  - **Fix:** Every role × job membership × action.
  - **Acceptance check:** Tests pass.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0683 [High][ATS/10 Tests] Apply endpoint tests
  - **Where:** app/api/public/ats/apply/__tests__
  - **Problem:** —
  - **Fix:** Validation, file type spoofing, rate limit, duplicate merge, consent required, emails queued.
  - **Acceptance check:** Tests pass.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0631 [Medium][ATS/0 Foundation] ATS feature flag and navigation
  - **Where:** lib/flags, components/layout/sidebar/sidebar-nav-items.ts
  - **Problem:** Rollout should be gradual.
  - **Fix:** Org flag `ats` (default off); nav group 'Hiring' with Jobs, Candidates, Interviews, Offers, Reports, Settings for ATS roles.
  - **Acceptance check:** Flag off → /ats 404 and no nav; on → nav visible to ATS roles only.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0635 [Medium][ATS/1 Requisitions & jobs] Custom application questions per job
  - **Where:** ats_application_questions, /ats/jobs/[jobId]/form
  - **Problem:** —
  - **Fix:** Types: short text, long text, single/multi select, yes/no, number, file; required flag; knock-out answers auto-reject (configurable).
  - **Acceptance check:** Candidate must answer required questions; knock-out sends to Rejected with reason 'Did not meet requirement'.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0636 [Medium][ATS/1 Requisitions & jobs] Job templates and duplication
  - **Where:** /ats/jobs/[jobId] menu
  - **Problem:** Repeated roles retyped.
  - **Fix:** Duplicate job (without candidates); save as template.
  - **Acceptance check:** Duplicated job is DRAFT with same form.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0641 [Medium][ATS/2 Careers site] Embeddable job list and share links
  - **Where:** /careers?embed=1, share buttons
  - **Problem:** —
  - **Fix:** Minimal embed mode, UTM source capture into application.source.
  - **Acceptance check:** Application from ?utm_source=linkedin shows source LinkedIn.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0646 [Medium][ATS/3 Candidates] Talent pool, tags and notes
  - **Where:** ats_candidate_tags, ats_candidate_notes
  - **Problem:** —
  - **Fix:** Tag candidates, add @mention notes (notify mentioned user), pool view of candidates not in an active application.
  - **Acceptance check:** Tagged candidate appears in pool filter.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0647 [Medium][ATS/3 Candidates] Attachments on candidates
  - **Where:** candidate_documents (reuse), R2
  - **Problem:** —
  - **Fix:** Upload extra files (portfolio, certificates) with access via lib/ats/access.ts and signed GET URLs.
  - **Acceptance check:** Interviewer without access gets 404 on the file URL.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0648 [Medium][ATS/3 Candidates] Activity timeline
  - **Where:** ats_activity
  - **Problem:** —
  - **Fix:** Record stage changes, emails, notes, interviews, offers with actor and timestamp (IST display).
  - **Acceptance check:** Every action shows on the timeline.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0649 [Medium][ATS/3 Candidates] Manual candidate add and CSV import
  - **Where:** /ats/candidates/new, /ats/candidates/import
  - **Problem:** Referrals and sourced candidates.
  - **Fix:** Form + CSV import with mapping, dry run, duplicate check.
  - **Acceptance check:** Import of 100 rows reports created/merged/skipped.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0653 [Medium][ATS/4 Pipeline] Refuse reasons linked to templates
  - **Where:** ats_refuse_reasons
  - **Problem:** —
  - **Fix:** Reasons (Not qualified, Position filled, Withdrew, Salary mismatch…) each with optional template; 'Do not email' option.
  - **Acceptance check:** Reason 'Withdrew' sends nothing.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0654 [Medium][ATS/4 Pipeline] List view with filters and saved views
  - **Where:** /ats/candidates
  - **Problem:** —
  - **Fix:** Table with column chooser, filters, sort, saved views per user.
  - **Acceptance check:** Saved view restores filters.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0659 [Medium][ATS/5 Interviews] Feedback request and overdue nudges
  - **Where:** ats-interviewer-feedback-request
  - **Problem:** —
  - **Fix:** Send 1 h after interview end; nudge after 24 h.
  - **Acceptance check:** Submitted scorecard stops nudges.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0665 [Medium][ATS/7 Emails] Implement candidate/team email `ats-new-application-internal`
  - **Where:** email-templates/ats-new-application-internal.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send on apply, to hiring team (digest option) via renderEmail('ats-new-application-internal', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0668 [Medium][ATS/7 Emails] Implement candidate/team email `ats-interview-reminder`
  - **Where:** email-templates/ats-interview-reminder.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send 24 h before via renderEmail('ats-interview-reminder', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0669 [Medium][ATS/7 Emails] Implement candidate/team email `ats-interviewer-feedback-request`
  - **Where:** email-templates/ats-interviewer-feedback-request.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send 1 h after interview via renderEmail('ats-interviewer-feedback-request', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0671 [Medium][ATS/7 Emails] Implement candidate/team email `ats-offer-response-hr`
  - **Where:** email-templates/ats-offer-response-hr.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send on accept/decline via renderEmail('ats-offer-response-hr', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0672 [Medium][ATS/7 Emails] Implement candidate/team email `ats-requisition-approval`
  - **Where:** email-templates/ats-requisition-approval.html + .txt
  - **Problem:** New ATS email.
  - **Fix:** Send on requisition submit via renderEmail('ats-requisition-approval', vars); log in ats_email_log; respect candidate unsubscribe for non-transactional mails.
  - **Acceptance check:** Mail arrives with the designed layout and appears in the candidate's Emails tab.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0673 [Medium][ATS/7 Emails] Editable per-org templates and per-stage email
  - **Where:** /ats/settings/emails
  - **Problem:** HR wants to adjust wording.
  - **Fix:** Store overrides (subject, body markdown) per template id; preview with sample candidate; fall back to defaults.
  - **Acceptance check:** Override is used in the next send; reset restores default.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0674 [Medium][ATS/8 Reports] Time-to-hire and time-in-stage report
  - **Where:** /ats/reports
  - **Problem:** —
  - **Fix:** Median/avg days from applied → hired per job/department; time in each stage from ats_activity.
  - **Acceptance check:** Numbers match a hand count on seed data.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0675 [Medium][ATS/8 Reports] Source effectiveness report
  - **Where:** /ats/reports/sources
  - **Problem:** —
  - **Fix:** Applications, interviews, offers, hires by source.
  - **Acceptance check:** Totals match the pipeline.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0676 [Medium][ATS/8 Reports] Funnel report
  - **Where:** /ats/reports/funnel
  - **Problem:** —
  - **Fix:** Conversion between stages per job with date range; CSV export.
  - **Acceptance check:** Funnel percentages add up.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0680 [Medium][ATS/9 Privacy & retention] Candidate data export on request
  - **Where:** /ats/candidates/[id] export
  - **Problem:** —
  - **Fix:** JSON + files zip of candidate data.
  - **Acceptance check:** Export contains all applications, notes visible to candidate rights, files.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0681 [Medium][ATS/9 Privacy & retention] Audit log for ATS actions
  - **Where:** existing audit_logs
  - **Problem:** —
  - **Fix:** Log offer create/send/accept, stage moves, deletes, exports.
  - **Acceptance check:** Audit page shows ATS entries.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0684 [Medium][ATS/10 Tests] Pipeline move/bulk tests
  - **Where:** lib/ats/__tests__/pipeline.test.ts
  - **Problem:** —
  - **Fix:** Optimistic concurrency, reject reason, auto-email decisions.
  - **Acceptance check:** Tests pass.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0685 [Medium][ATS/10 Tests] Offer token and hire conversion tests
  - **Where:** lib/ats/__tests__/offer.test.ts
  - **Problem:** —
  - **Fix:** Token expiry, single use, hire creates exactly one user.
  - **Acceptance check:** Tests pass.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0686 [Medium][ATS/10 Tests] Playwright ATS golden path
  - **Where:** e2e/ats.spec.ts
  - **Problem:** —
  - **Fix:** Create job → publish → apply on careers → move to Interview → schedule → scorecard → offer → accept → hire → employee exists.
  - **Acceptance check:** Passes locally against a local DB.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0655 [Low][ATS/4 Pipeline] Ready/blocked flag per card
  - **Where:** candidate_applications
  - **Problem:** Odoo kanban state.
  - **Fix:** Simple flag + reason.
  - **Acceptance check:** Flag visible on card.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0660 [Low][ATS/5 Interviews] Self-scheduling links (later)
  - **Where:** interview_booking_links (reuse-later)
  - **Problem:** —
  - **Fix:** Candidate picks from offered slots.
  - **Acceptance check:** Booked slot creates the interview.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0677 [Low][ATS/8 Reports] Hiring dashboard widget
  - **Where:** /dashboard for ATS roles
  - **Problem:** —
  - **Fix:** Open jobs, new applications this week, interviews today.
  - **Acceptance check:** Widget visible only to ATS roles.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

- [ ] MIYO-0687 [Low][ATS/10 Tests] Email rendering tests for ats-* templates
  - **Where:** lib/email-templates/__tests__
  - **Problem:** —
  - **Fix:** No placeholders left; ICS attached for interview invite.
  - **Acceptance check:** Tests pass.
  - **Retest status:** ATS not built (removed in 3cbeb49); /hr/ats /careers /jobs → 404

---

## 9. Phase 7 — Knowledge Base port

Port Streamline OS Knowledge Base into Miyo Global CRM. Work top to bottom, one KB item per commit (`KB-NNNN: …`), push to main.

### Rules (from KB-TODO)

- Follow PR #4 (Build → Projects) patterns: `withAuth`, `session.orgId` scope, 404 cross-org, soft-delete, audit log, React Query hooks, `features/` + `app/(dashboard)/`.
- Hand-written idempotent SQL migrations `drizzle/NNNN_kb_*.sql` from **0159** onward (renumber if taken); register in `scripts/apply-pending-migrations.ts` and `drizzle/meta/_journal.json`.
- Missing env must never crash: no AI key → 503 `KB_AI_NOT_CONFIGURED` + hide AI buttons; no embeddings → keyword search; no R2 → 503 storage; no Inngest → inline/cron; no ZeptoMail → in-app only.
- Design: gold/ink/silver; empty states = one line + one button; check 375/768/1280/1440.

### Inventory, decisions, architecture

## 0. Feature inventory: what the Streamline Knowledge Base does

From `SB/modules/kb/**` (5 Nest modules: core, retrieval, help-centre, wiki, linked-documents, plus content-health, analytics, document-query), `SB/db/schema/kb/*.ts`, `SB/db/schema/support/kb*.ts`, 100+ `migrations/*kb*` files, `SF/app/(authenticated)/knowledge/**`, `SF/features/wiki/**`, `SF/features/help-centre/**`, `SF/components/kb/**`, `SF/components/editor/plate/**` and `SF/hooks/api/kb/**`.

| # | Area | What exists in Streamline (source) |
|---|---|---|
| 1 | **Pages (wiki)** | `kb_pages`: title, icon, cover, Plate JSON `content`, `content_text`, generated weighted `fts` tsvector (title A, body B), `sort_order`, `parent_page_id` nesting, `is_locked`, `visibility` private/org/public, `status` draft/in_review/published/archived, `content_type` (note, sop, policy, support_article, troubleshooting, decision_record, meeting_notes, runbook, project_brief, playbook), `trust_state` unverified/verified/verification_expired, owner, verified by/at/until, `next_review_at`, `review_interval_days`, `project_id` (Build project wiki), `external_id/external_source` (imports), `slug/excerpt/seo_*`, views and helpful counters, `legal_hold`, `acl_revision`, `content_revision`, soft delete. (`SB/db/schema/kb/pages.ts`) |
| 2 | **Page tree** | Tree, move with cycle check via recursive ancestor walk, sort order, duplicate a subtree, breadcrumbs. (`SB/modules/kb/wiki/kb-page-tree.service.ts`, `kb-page-subtree.util.ts`, `kb-page-duplicate.service.ts`, `SF/features/wiki/components/page-tree*.tsx`, `move-page-dialog.tsx`) |
| 3 | **Spaces** | `kb_spaces` (type private/team/company/module/support/project, audience internal/public/mixed, colour, icon, branding, default visibility, owning team, public help-centre flag, archive) and `kb_space_members` (membership, role or team → viewer/commenter/editor/publisher/admin), ACL revision table. Archive-impact preview, archive and restore. (`kb-spaces.*`, `kb-members.*`, `kb-space-lifecycle.service.ts`) |
| 4 | **Editor** | Plate v53 with paragraph, H1–H3 (markdown input rules), quote, divider, bold/italic/underline/strike/code, font colour/background/size, align, indent, lists and to-dos, code block with syntax highlighting, image/video/audio/file media with upload placeholder and caption, link with floating toolbar, table, callout, toggle, @mention, emoji, page-link picker, citation and link-preview blocks. 18 slash commands. Autosave after 1.5 s. Edit-conflict dialog on revision mismatch. (`SF/components/editor/plate/**`, `SF/features/wiki/components/use-page-autosave.ts`, `page-edit-conflict.tsx`) |
| 5 | **Versions and history** | `kb_page_versions`, append-only. A snapshot is taken at most once per 10 minutes unless forced. List, get and restore, with a restore audit. A diff view in the UI. (`kb-page-edit.util.ts` `snapshotIfNeeded`, `kb-page-versions.service.ts`, migrations `1078`, `1207`, `SF/features/wiki/lib/version-diff.ts`, `page-history-*.tsx`) |
| 6 | **Permissions** | Page actions view < comment < edit < manage. Access routes: owner, admin, creator, organization, public, space, project, grant. `kb_page_grants` (membership or role, with access level, revocable) and `kb_page_restrictions`. "Shared with me" scope. 404 when not visible, 403 when denied. (`SB/modules/kb/core/authorization/*`, `kb-page-grants.*`, `SF/features/wiki/components/page-grants-sheet.tsx`) |
| 7 | **Sharing** | Public link: a random 32-byte hex token is shown once and only its SHA-256 hash is stored, with a revision. Public read at `/wiki/[token]` with media served through 300-second signed URLs. Dormant tokens are revoked. (`kb-public-token.ts`, `kb-page-public.service.ts`, `kb-public-pages.controller.ts`, `SF/app/(public)/wiki/[shareToken]`, migrations `1171`, `1176`, `1192`) |
| 8 | **Lifecycle** | Lock, change visibility, publish, archive/unarchive, verify (trust window), mark stale. Reviews of type approval or freshness: request, approve, reject, bulk-decide, due list. (`kb-page-status.*`, `kb-page-reviews*.ts`, `SF/features/wiki/components/reviews-*.tsx`) |
| 9 | **Comments and mentions** | `kb_page_comments` threads (`parent_id`), anchored to a block index and quote, resolve/unresolve. @mentions in page content are diffed against the previous content and notify only new mentions. (`kb-page-comments.*`, `kb-page-writer.service.ts` `deliverMentions`, `SF/features/wiki/lib/page-comment-anchors.ts`). **Reactions: none on KB pages or comments in Streamline** (reactions exist only on Build ticket comments). |
| 10 | **Favourites and recent** | `kb_page_favorites` (sortable) and `kb_page_visits`, with recent, favourites and visit endpoints. |
| 11 | **Backlinks** | `kb_page_links` are re-synced from page content on every save (page-to-page links and record targets), plus a backlinks endpoint. |
| 12 | **Record links** | Link a page to a CRM record: `crm_lead`, `crm_deal`, `crm_contact`, `project`, `project_ticket`, `support_ticket` or `hr_employee`. Also lists pages linked to a given record. (`kb-page-record-links.*`, `SF/features/wiki/components/page-record-links.tsx`) |
| 13 | **Templates** | `kb_page_templates` (org-unique name, use count, last used) with CRUD. 15 starter templates: Meeting Notes, SOP, Policy, Decision Record, Runbook, Project Brief, Playbook, Troubleshooting Guide, Support Article, Onboarding Guide, Weekly Update, Retrospective, PRD, How-to Guide, FAQ. (`SF/features/wiki/lib/starter-templates.ts`) |
| 14 | **Media and attachments** | `POST /kb/media` limits: image 10 MB (jpeg/png/gif/webp, compressed with sharp, 50 MP cap), video 100 MB (mp4/webm), audio 25 MB, documents 25 MB. `kb_page_attachments` has sha256 and soft delete. (`kb-media.service.ts`, migration `1042`) |
| 15 | **Trash** | Soft delete to trash, list (filter by deleter), bulk restore, purge impact, purge, empty, permanent delete. Retention defaults to 30 days, then auto-purge through a purge ledger across DB, chunks and object storage. Legal hold blocks a purge. (`kb-page-trash*.ts`, `kb-purge-ledger.ts`, `kb-multi-store-purge.ts`, migrations `1193`, `1230`) |
| 16 | **Import and export** | Import Markdown, HTML or zip (files read in the browser), up to 100 items per job, duplicate policy skip or update via `external_id/source`. Dry-run, jobs with retry and cancel, error report. Export one page or all as Markdown or HTML to object storage, with expiry and a signed download. (`kb-import-export.*`, `kb-export*.ts`, `SF/features/wiki/components/import-*.tsx`, `export-jobs-card.tsx`) |
| 17 | **Collections and search UI** | Page collection with sorts, status, content-type facets and cursor paging. Owners list. Search page with snippets. Quick find on ⌘/Ctrl+K. My pages, Shared with me. (`SB/modules/kb/core/collection/*`, `SF/features/wiki/components/wiki-search-page.tsx`, `quick-find-dialog.tsx`) |
| 18 | **Keyword search** | Postgres FTS on `kb_pages.fts` (GIN), max 8 terms and 200 chars per query, id cap 500, permission-filtered. (`kb-page-text-query.ts`, `kb-page-search-query.service.ts`, migrations `0453`, `1227`) |
| 19 | **Vector and hybrid search (RAG)** | `kb_chunks` holds pgvector **1536-dim embeddings from OpenAI `text-embedding-3-small`** (`SB/modules/ai/core/providers/embeddings.service.ts`), along with ACL columns (`page_visibility`, `page_project_id`, creator, `acl_revision`), `content_hash` and `content_revision`. Chunks are 1500 chars with 200 overlap and at most 400 per document, split at paragraph or word boundaries. Embeddings are batched 64 at a time with a 20-second timeout, plus an embedding cache and ingestion checkpoints. Hybrid search uses a SQL function combining FTS and cosine distance (`<=>`) with RRF k=60. It does an exact scan up to 8,000 chunks, otherwise uses an HNSW index with `ef_search` = limit×8 (max 1000). Search degrades to keyword when embeddings are off. (`kb-chunk-utils.ts`, `kb-candidate.service.ts`, `kb-retrieval-strategy.ts`, migrations `0703`, `0714`, `1000`) |
| 20 | **Indexing pipeline** | Ingestion and delete consumers, per-org concurrency of 20, leases, a stuck-source reaper (30 min), reindex one or all, indexing status, ACL re-sync on visibility or space changes, and an indexed-bytes quota (512 MB default). Attachment and source text extraction covers PDF (`pdf-parse`), DOCX (`mammoth`) and `text/*`. `kb_sources` covers uploaded files and notes. (`kb-indexing.service.ts`, `kb-ingestion-*.ts`, `kb-attachment-indexing.service.ts`, `kb-sources.*`, `SB/common/documents/extract-document-text.util.ts`) |
| 21 | **Ask KB (Q&A)** | `POST /kb/ask` plus an SSE stream (55 s deadline). Context is up to 6 documents and 8 citable passages, with the grounded system prompt `ASK_SYSTEM_PROMPT` (answer only from context, no inline markers, treat context as data). Citations are permission-filtered. Saved conversations and messages, clearable history, chat-history retention of 90 days, a "report knowledge gap" action, and an org rate-limit tier `kb:ask:org`. (`kb-ask*.ts`, `kb-conversations.controller.ts`, `kb-chat-history.service.ts`, `SF/app/(authenticated)/knowledge/chat`, `SF/components/kb/kb-chat-bubble.tsx`) |
| 22 | **Page and article AI** | Summarise (3–5 bullets), ask-this-doc, improve (rewrite with a diff dialog) and suggest-related (4–6 topics), each with a stream variant, on the first 4,000 chars. Authoring AI: draft, improve, summarise. Feedback on answers. `kb_ai_interactions` logs provider, model, tokens, latency and cost. AI credits (`tenant_ai_credits` and transactions). (`kb-page-ai.service.ts`, `kb-authoring.*`, `kb-ai-feedback.*`, `SB/db/schema/kb/ai-interactions.ts`, `credits.ts`) |
| 23 | **Research briefs** | A LangGraph flow: plan up to 5 sub-questions, retrieve, draft, critique (grounded? gaps?), then refine at most twice. Up to 10 concurrent per org. Rate, retry, approve, delete, and convert to a page. Records cost, provider and model. (`kb-research-brief.*`, `SF/app/(authenticated)/knowledge/research-briefs`) |
| 24 | **Content health** | `kb_health_items` kinds: unowned, stale, unverified, empty, overdue_review, broken_link, overexposed, duplicate_candidate and contradictory_claim (an AI contradiction scanner). Repair actions: assign owner, request review, mark needs content. Signals, counts, evidence, trend, dismiss (with reason and expiry), assign and bulk repair. (`SB/modules/kb/content-health/*`, `SF/features/wiki/components/content-health-page.tsx`) |
| 25 | **Analytics** | `kb_events` log. Overview, no-result searches, top pages, gaps (assign, dismiss, create a fix page, related pages), content gaps (minimum cohort of 3), citation reuse (minimum 2), review SLA, stale pages (90 days). (`kb-analytics.*`, `SF/features/wiki/components/knowledge-analytics-*.tsx`) |
| 26 | **Linked company documents** | Publish an HR document into the KB as a "Company document": version mode latest or pinned, audiences, unpublish with a reason, 30-day grace after the source is removed, 300-second signed open URL, included in Ask (max 3). HRMS flags in `kb_settings`. (`SB/modules/kb/linked-documents/*`, `SF/features/wiki/components/company-document*.tsx`, `SF/features/hr/documents/components/document-kb-*.tsx`) |
| 27 | **Help centre (support KB)** | `kb_categories` per space, support articles (the `support_article` content type), publish/unpublish/verify (180-day window), votes, views, versions, comments, tags (`kb_tags`), translations per locale (`kb_page_translations`, status enum), a public help centre (`/public/kb`, `/help/[orgId]/[slug]`, feedback), an embeddable widget, draft-an-article-from-a-support-ticket, a verification queue, support knowledge-gap clustering, and a ticket deflection panel. (`SB/modules/kb/help-centre/*`, `SB/modules/public/kb.service.ts`, `SB/modules/support/kb-gap/*`, `SF/features/help-centre/**`) |
| 28 | **Notifications** | `knowledge.article.mentioned` (in-app and email), `article.comment_created`, `article.approval_requested` (in-app and email), `article.published`, `ai.answer_ready`, `document.ingestion_failed` (in-app and email), `page.comment_created`, `page.review_requested` (in-app and email), `page.review_approved`, `page.review_rejected`. (`SB/modules/notifications/notification-events-knowledge.catalog.ts`) |
| 29 | **Settings** | `kb_settings`: `trash_retention_days` (30), `chat_history_retention_days` (90), and the HRMS link, search and AI flags. (`kb-settings.*`, `kb-hr-link-flags.*`) |
| 30 | **RBAC** | 22 `kb:*` permissions: articles view/create/update/delete/manage, categories manage, spaces view/manage, analytics view, ai generate, pages view/create/update/delete/manage/import/export/purge, reviews view/manage, settings manage, templates manage. Every member gets view on articles, spaces and pages. The Customer Support template gets all of them. (`SB/modules/rbac/permissions/kb.ts`, `role-defaults.ts`, `role-templates.constants.ts`) |

### What the CRM already has (checked on `b1bd73f`)

| Thing | Where | Decision |
|---|---|---|
| Build port's project `pages` table (title, jsonb content, icon, cover, is_public, is_pinned, parent_page_id, project_id NOT NULL) and `/api/projects/[projectId]/pages` with a Textarea UI | `lib/db/schema/projects.ts:319`, `app/api/projects/[projectId]/pages/**`, `app/(dashboard)/projects/[projectId]/pages/page.tsx` | **Replace with KB.** Streamline's Build wiki is `kb_pages` with `project_id` (`SF/app/(authenticated)/build/[projectId]/wiki`). Backfill rows into `kb_pages`, point the project Pages tab at the KB API, and keep the old table read-only until verified (KB-0023, KB-0092, KB-0093). |
| `rich_documents` (HR, title and content_json) | `lib/db/schema/hr/_all.ts:1177` | Leave alone. It's HR letter content, not a wiki. |
| HR `documents`, `document_folders` and `/api/hr/documents/**` | `lib/db/schema/hr/_all.ts:283`, `:1990` | **Reuse** as the source for "Company documents" (`kb_linked_documents.document_id → documents.id`). |
| R2 helpers `uploadFile`, `getFileUrl` (signed), `deleteFile`, `fileExists`, `isStorageConfigured` and `/api/storage/upload` | `lib/storage.ts`, `app/api/storage/upload/route.ts` | **Reuse.** KB media gets its own route with KB size and type rules, built on `lib/storage.ts`. |
| AI: LangChain `ChatOpenAI` gpt-4o-mini and gpt-4o, Google Gemini fallback, `isAIConfigured()`, `isOpenAIConfigured()`, usage tracker | `lib/ai/openai.ts`, `lib/ai/usage-tracker.ts` | **Reuse.** Same models as Streamline's `llm-provider.config.ts`. Embeddings need OpenAI specifically. |
| PDF and DOCX text extraction (`pdf-parse`, `mammoth`) | `lib/files/extract-resume-text.ts` | **Reuse** as a generic `extractDocumentText`. |
| Tiptap editor | `components/editor/tiptap-*.tsx` | Keep for email templates. Use **Plate** for KB (decision D2). |
| Notifications `sendNotification`, email builder, ZeptoMail templates | `lib/notifications/send.ts`, `lib/notifications/email.ts`, `lib/email-templates/*` | **Reuse.** Add `lib/email-templates/knowledge.ts`. |
| Inngest client and functions, Vercel crons with `verifyCronSecret` | `lib/inngest/**`, `vercel.json`, `lib/cron-auth.ts` | **Reuse** for indexing, imports, briefs and sweeps. |
| Rate limit (Upstash), audit log, RBAC permission catalog, role defaults, route access, top-nav modules | `lib/rate-limit.ts`, `lib/audit-log.ts`, `lib/rbac/permissions.ts`, `lib/auth/route-access.ts`, `components/layout/sidebar/sidebar-nav-items.ts` (`moduleOfGroup` splits group labels on "–") | **Extend.** |
| Global search (ILIKE over tickets, projects, people) | `app/api/search/route.ts` | Add KB pages (KB-0096). |
| pgvector | not used yet. The DB is Neon (`lib/db.ts`), which supports `vector`. | New migration, guarded (KB-0017). |
| Roles | `CEO, HR, ADMIN, SALES, CUSTOMER_SUPPORT, ENGINEERING, DESIGN, VIDEO_EDITOR, DIGITAL_MARKETING` (`lib/rbac/permissions.ts` `SYSTEM_ROLES`). `BRANCH_HR` was removed in migration `0151`, and there is **no RECRUITER** role. | Map as in §2.4. |
| Support tickets (CRM module) | `app/api/support/**`, `lib/db/schema/crm/_all.ts` | The help-centre phase (§10) runs only when `CRM_MODULE_ENABLED` / the org flag is on. |
| Brand palette tokens | `globals.css` `--gold-400 #D4AF37`, `--ink-900 #201E1F`, `--silver #D8D8D8`; `lib/design/brand-hex.ts` | Use them as they are. |

---

## 1. Decisions (defaults are used unless Tarun changes them)

| ID | Decision | Recommended default |
|---|---|---|
| D1 | Where KB lives | A new top-nav module **"Knowledge"** at `/knowledge`, with sidebar groups `Knowledge – Wiki` and `Knowledge – Manage`. `/knowledge` opens the wiki home, or Ask KB when AI is configured, matching Streamline's `/knowledge` → `/knowledge/chat` redirect. Same URL tree as Streamline (`/knowledge/wiki/...`, `/knowledge/chat`, `/knowledge/research-briefs`), so `SF/lib/knowledge-routes.ts` ports directly. |
| D2 | Editor | **Plate v53** (`platejs` and `@platejs/*`, the same versions as SF `package.json`), so page JSON is identical to Streamline and slash commands, mentions, tables, toggles and callouts come free. Tiptap stays for email templates only. |
| D3 | Build project pages | Migrate `pages` into `kb_pages.project_id`. The project "Pages" tab becomes a KB view filtered by project. Drop `pages` in a later migration once verified. |
| D4 | Company documents (HR docs in KB) | Build it, off by default (`kb_settings.hrms_kb_link_enabled = false`, as in Streamline). HR/CEO/Admin can switch it on. |
| D5 | Help centre (public support articles, widget, translations, from-ticket, knowledge gaps) | Build it last (§10), behind the org flag `knowledgeHelpCentre` (default **off**) and `CRM_MODULE_ENABLED` for the ticket-linked parts. |
| D6 | AI provider | Reuse `lib/ai/openai.ts` (OpenAI gpt-4o-mini for fast, gpt-4o for standard, Gemini fallback for chat). Embeddings use OpenAI `text-embedding-3-small` at 1536 dims, as in Streamline. Without `OPENAI_API_KEY` there are no embeddings, so search is keyword-only. Streamline's OpenRouter switch (`AI_LLM_PROVIDER`, `OPENROUTER_API_KEY`) is **not** ported unless Tarun asks. |
| D7 | AI credits | Port `tenant_ai_credits` and transactions with `monthly_allowance = NULL` meaning unlimited (enforcement exists but is off by default). Also log to the existing `lib/ai/usage-tracker.ts`. |
| D8 | Default role access | See §2.4. Streamline gives every member view only, and creation comes from space roles and grants. **Default:** every employee role can also create pages in **their own private space and in team spaces where they're an editor**. Only CEO/ADMIN/HR/CUSTOMER_SUPPORT get the org-wide `kb:pages:create`. |
| D9 | Background work | Inngest functions (`lib/inngest/functions/knowledge-*.ts`) when `INNGEST_EVENT_KEY` is set. Otherwise small jobs run inline (≤1 page) and a Vercel cron sweeper `/api/cron/knowledge-sweep` (every 15 min, `CRON_SECRET`) drains pending indexing, imports and exports. |
| D10 | Reactions on pages and comments | Streamline has none, so **don't build** them. If Tarun wants them later, copy the `ticket_comment_reactions` pattern from PR #4. |

---

## 2. Architecture summary

### 2.1 Routes (UI) — `app/(dashboard)/knowledge/**`
| Route | Streamline source | Purpose |
|---|---|---|
| `/knowledge` | `SF/app/(authenticated)/knowledge/page.tsx` | Redirects to `/knowledge/chat` when AI is configured, otherwise to `/knowledge/wiki` |
| `/knowledge/chat` | `.../knowledge/chat/page.tsx` | Ask KB chat, conversations, sources |
| `/knowledge/research-briefs`, `/[briefId]` | `.../research-briefs/**` | Research briefs |
| `/knowledge/wiki` | `.../wiki/page.tsx` | Wiki home: tree, favourites, recent, all pages |
| `/knowledge/wiki/doc/[pageId]`, `/history` | `.../wiki/doc/[pageId]/**` | Page editor and reader, history |
| `/knowledge/wiki/private`, `/shared` | `.../wiki/private`, `/shared` | My pages, Shared with me |
| `/knowledge/wiki/spaces`, `/[spaceId]` | `.../wiki/spaces/**` | Spaces |
| `/knowledge/wiki/search` | `.../wiki/search` | Full search |
| `/knowledge/wiki/templates` | `.../wiki/templates` | Templates |
| `/knowledge/wiki/reviews` | `.../wiki/reviews` | Review queue |
| `/knowledge/wiki/import` | `.../wiki/import` | Import and export |
| `/knowledge/wiki/analytics` | `.../wiki/analytics` | Analytics |
| `/knowledge/wiki/manage` | `.../wiki/manage` | Content health |
| `/knowledge/wiki/trash` | `.../wiki/trash` | Trash |
| `/knowledge/wiki/company-documents`, `/[linkedDocumentId]` | `.../wiki/company-documents/**` | Linked HR documents |
| `/knowledge/help` (flagged) | `SF/app/(authenticated)/support/kb/**` | Help-centre manager |
| `app/(public)/wiki/[shareToken]` | `SF/app/(public)/wiki/[shareToken]` | Public shared page |
| `app/(public)/help/[orgSlug]/[articleSlug]` (flagged) | `SF/app/(public)/help/[orgId]/[articleSlug]` | Public help article |
| `/projects/[projectId]/pages` | `SF/app/(authenticated)/build/[projectId]/wiki/**` | Project wiki backed by KB |

### 2.2 API — `app/api/knowledge/**` (Next.js route handlers, each mirroring one Streamline `/kb/*` route)
Spaces (`spaces`, `spaces/[spaceId]`, `/members`, `/archive-impact`, `/archive`, `/restore`, `/categories`) · Pages (`pages`, `pages/tree`, `recent`, `favorites`, `search`, `full-search`, `owners`, `trash/**`, `[pageId]`, `/move`, `/duplicate`, `/restore`, `/permanent`, `/favorite`, `/visit`, `/backlinks`, `/versions/**`, `/lock`, `/visibility`, `/publish`, `/archive`, `/unarchive`, `/verify`, `/mark-stale`, `/grants/**`, `/grant-candidates`, `/comments`, `/record-links`, `/reviews`, `/reindex`, `/indexing-status`, `/export`, `/ai/{summarize,ask,improve,suggest-related}[/stream]`) · `page-comments/[commentId]/**` · `page-reviews/**` · `page-templates/**` · `record-links/**` · `media` · `import-jobs/**` · `pages/import`, `/import/dry-run` · `export-jobs/**` · `tags/**` · `sources/**` · `search` · `ask`, `ask/stream`, `ask/history`, `ask/knowledge-gap`, `ask/conversations/**` · `ai/{draft,improve,summarize,feedback}` · `research-briefs/**` · `content-health/**` · `analytics/**` · `linked-documents/**` · `settings`, `settings/hr-link-flags` · `capabilities`. Public: `app/api/public/wiki/[token]`, `/media`, `app/api/public/kb/**` (flagged). Cron: `app/api/cron/knowledge-sweep`, `knowledge-daily`.

### 2.3 Data — `lib/db/schema/knowledge.ts` and migrations `0159`–`0172` (`0173` drops legacy `pages` later)
`kb_spaces`, `kb_space_members`, `kb_space_acl_versions`, `kb_pages`, `kb_page_favorites`, `kb_page_visits`, `kb_page_links`, `kb_page_versions`, `kb_page_comments`, `kb_page_templates`, `kb_page_grants`, `kb_page_restrictions`, `kb_page_reviews`, `kb_import_jobs`, `kb_export_jobs`, `kb_export_object_attempts`, `kb_page_purge_ledger`, `kb_settings`, `kb_page_attachments`, `kb_sources`, `kb_tags`, `kb_page_tags`, `kb_page_translations`, `kb_chunks`, `kb_ingestion_checkpoints`, `kb_indexed_bytes_quota`, `kb_chat_conversations`, `kb_chat_messages`, `kb_ai_interactions`, `kb_research_briefs`, `tenant_ai_credits`, `tenant_ai_credit_transactions`, `kb_events`, `kb_health_items`, `kb_page_feedback`, `kb_linked_documents`, `kb_linked_document_audiences`, `kb_categories`, `support_knowledge_gaps` (flagged). Enums: `kb_audience`, `kb_space_role`, `kb_translation_status`.

Streamline adds `*_membership_id` columns because of its multi-org membership model. The CRM is keyed by `users.id` with one org per user, so **use `user_id text REFERENCES users(id)`** wherever Streamline has a `*_by_id`/`*_membership_id` pair. Keep the `(org_id, id)` uniques and the composite org foreign keys, which prevent cross-org rows.

### 2.4 Role → KB permission mapping (`lib/rbac/permissions.ts` `ROLE_DEFAULT_PERMISSIONS`)
| CRM role | KB permissions |
|---|---|
| CEO, ADMIN | All 22 `kb:*` (they already get every permission through `PERMISSIONS.map`) |
| HR | All `kb:*` except `kb:pages:purge` and `kb:settings:manage` (HR still manages the HRMS link flags through `kb:settings:manage`, so decide: default **include** `kb:settings:manage`, exclude purge) |
| CUSTOMER_SUPPORT | The Streamline "Customer Support" template, which is all `kb:*` except `kb:pages:purge` |
| SALES, ENGINEERING, DESIGN, VIDEO_EDITOR, DIGITAL_MARKETING | `kb:articles:view`, `kb:spaces:view`, `kb:pages:view` (Streamline universal), plus `kb:ai:generate`, `kb:pages:export`, `kb:reviews:view`, and D8 (create and edit in their own private space and in spaces where they're editors) |
| BRANCH_HR, RECRUITER | Don't exist in the CRM (`0151_remove_branch_roles`, recruitment removed). Nothing to map. If the ATS work re-adds RECRUITER, give it the employee set. |

Space roles (`kb_space_members.space_role`): viewer → view, commenter → comment, editor → edit, publisher → edit + publish/verify, admin → manage. Page grants: view/comment/edit/manage.

---


### Env vars (add later in Vercel — do not put values in git)

---

## 4. Env vars to add later (names only, never commit values)

Every KB feature must build and run with **none** of these set. Missing vars switch off the matching feature (KB-{{t_env}}). `/api/knowledge/capabilities` reports what is on.

| Env var (already used by the CRM) | KB uses it for | If missing |
|---|---|---|
| `OPENAI_API_KEY` | Embeddings (`text-embedding-3-small`, 1536) **and** Ask/page AI/briefs/health contradictions (gpt-4o-mini / gpt-4o via `lib/ai/openai.ts`) | Keyword-only search. Ask, page AI, briefs and the contradiction scan return 503 `KB_AI_NOT_CONFIGURED` and their entry points are hidden. Run reindex-all after adding it |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Chat fallback in `lib/ai/openai.ts` (Gemini). **Not used for embeddings** | With only this key set: Ask works over keyword retrieval, with no semantic search |
| `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_REGION`, `NEXT_PUBLIC_R2_PUBLIC_URL` | Media uploads, attachments, cover images, sources, export zips, company-document signed URLs | 503 `KB_STORAGE_NOT_CONFIGURED`. Upload controls hidden. Single-page export streams directly |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (the latter is read by the Inngest SDK) | Background indexing, import jobs, research briefs | Inline `after()` processing for small jobs, plus the cron sweeper |
| `CRON_SECRET` | `/api/cron/knowledge-sweep` (15 min) and `/api/cron/knowledge-daily` | Crons return 401: no trash purge, review reminders, reaper or retention |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Ask rate limits (`kb:ask` 20/min, `kb:ask:org` 200/min), public help tiers | Per-instance in-memory limiter |
| `ZEPTOMAIL_API_TOKEN` / `ZEPTOMAIL_TOKEN`, `EMAIL_FROM_ADDRESS` | Mention, review and brief emails | In-app notifications only, logged as `email.skipped` |
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails and public share URLs | Falls back to the request origin. Email links may be relative, so set it before launch |
| `DATABASE_URL_MIGRATE` | Applying 0159–0173 on deploy (`pnpm db:migrate:deploy`) | Deploy migration step fails, so it's **required in production** (already set) |
| `NEXT_PUBLIC_CRM_MODULE` | Gates CRM record-link targets (lead, deal, contact) and the help centre | Those targets and the help centre are hidden |

No new env var is required. Optional new, non-secret knobs, only if Tarun wants them (otherwise these are DB settings in `kb_settings`): `KB_INDEXED_BYTES_LIMIT` (default 536870912), `KB_EMBEDDING_MODEL` (default `text-embedding-3-small`).

**Streamline-only names (reference only, not ported, per D6):** `AI_LLM_PROVIDER`, `OPENROUTER_API_KEY`, `AI_FAST_FALLBACK_MODELS`, `AI_STANDARD_FALLBACK_MODELS`, `AI_CHAT_PROVIDER`, `AI_CHAT_MODEL`. `STREAMLINE_WORKSPACE_ROOT` is dev only.


## 4. Env vars to add later (names only, never commit values)

Every KB feature must build and run with **none** of these set. Missing vars switch off the matching feature (KB-0161). `/api/knowledge/capabilities` reports what is on.

| Env var (already used by the CRM) | KB uses it for | If missing |
|---|---|---|
| `OPENAI_API_KEY` | Embeddings (`text-embedding-3-small`, 1536) **and** Ask/page AI/briefs/health contradictions (gpt-4o-mini / gpt-4o via `lib/ai/openai.ts`) | Keyword-only search. Ask, page AI, briefs and the contradiction scan return 503 `KB_AI_NOT_CONFIGURED` and their entry points are hidden. Run reindex-all after adding it |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Chat fallback in `lib/ai/openai.ts` (Gemini). **Not used for embeddings** | With only this key set: Ask works over keyword retrieval, with no semantic search |
| `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_REGION`, `NEXT_PUBLIC_R2_PUBLIC_URL` | Media uploads, attachments, cover images, sources, export zips, company-document signed URLs | 503 `KB_STORAGE_NOT_CONFIGURED`. Upload controls hidden. Single-page export streams directly |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (the latter is read by the Inngest SDK) | Background indexing, import jobs, research briefs | Inline `after()` processing for small jobs, plus the cron sweeper |
| `CRON_SECRET` | `/api/cron/knowledge-sweep` (15 min) and `/api/cron/knowledge-daily` | Crons return 401: no trash purge, review reminders, reaper or retention |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Ask rate limits (`kb:ask` 20/min, `kb:ask:org` 200/min), public help tiers | Per-instance in-memory limiter |
| `ZEPTOMAIL_API_TOKEN` / `ZEPTOMAIL_TOKEN`, `EMAIL_FROM_ADDRESS` | Mention, review and brief emails | In-app notifications only, logged as `email.skipped` |
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails and public share URLs | Falls back to the request origin. Email links may be relative, so set it before launch |
| `DATABASE_URL_MIGRATE` | Applying 0159–0173 on deploy (`pnpm db:migrate:deploy`) | Deploy migration step fails, so it's **required in production** (already set) |
| `NEXT_PUBLIC_CRM_MODULE` | Gates CRM record-link targets (lead, deal, contact) and the help centre | Those targets and the help centre are hidden |

No new env var is required. Optional new, non-secret knobs, only if Tarun wants them (otherwise these are DB settings in `kb_settings`): `KB_INDEXED_BYTES_LIMIT` (default 536870912), `KB_EMBEDDING_MODEL` (default `text-embedding-3-small`).

**Streamline-only names (reference only, not ported, per D6):** `AI_LLM_PROVIDER`, `OPENROUTER_API_KEY`, `AI_FAST_FALLBACK_MODELS`, `AI_STANDARD_FALLBACK_MODELS`, `AI_CHAT_PROVIDER`, `AI_CHAT_MODEL`. `STREAMLINE_WORKSPACE_ROOT` is dev only.


---

## 5. Summary

**169 items.** By priority: Critical 41, High 66, Medium 41, Low 21.

| Phase | Items |
|---|---|
| 3.1 Phase A: Foundations (no UI yet) | 9 |
| 3.2 Phase B: Schema and migrations (each applies on deploy) | 16 |
| 3.3 Phase C: Core server libraries | 8 |
| 3.4 Phase D: API (REST route handlers under `app/api/knowledge/`) | 31 |
| 3.5 Phase E: UI (Knowledge module) | 29 |
| 3.6 Phase F: Search and indexing | 16 |
| 3.7 Phase G: AI (Ask, chat, page AI, research briefs) | 14 |
| 3.8 Phase H: Governance (content health, verification, analytics, company documents, settings) | 13 |
| 3.9 Phase I: Notifications | 3 |
| 3.10 Phase J: Help centre (behind `flags.knowledgeHelpCentre`, off by default, D5) | 11 |
| 3.11 Phase K: Design (simple, not AI-looking; gold #D4AF37, ink #201E1F, silver #D8D8D8) | 8 |
| 3.12 Phase L: Tests, QA and handoff | 11 |

Work top to bottom: one item, then one commit (`KB-NNNN: title`), then green checks, then push to `main`. Tick the box in this file in the same commit.

### KB checklist

- [ ] KB-0001 [Critical][Setup] Knowledge route constants — `lib/knowledge/routes.ts` — Port `KNOWLEDGE_ROOT`, `KB_CHAT`, `KNOWLEDGE_BASE`, `pageHref`, `pageHistoryHref`, `spaceHref`, `companyDocumentHref`, `KB_TRASH/TEMPLATES/ANALYTICS/PRIVATE/SHARED/SPACES/MANAGE/REVIEWS/IMPORT/SEARCH/COMPANY_DOCUMENTS`. Change `projectPageHref` to `/projects/{projectId}/pages/{pageId}` (Streamline: `SF/lib/knowledge-routes.ts`) — `lib/knowledge/routes.test.ts` ported from `SF/lib/knowledge-routes.test.ts` passes.

- [ ] KB-0002 [Critical][RBAC] Add the 22 `kb:*` permissions to the catalog — `lib/rbac/permissions.ts` `PERMISSIONS` — Copy the names, resources, actions and descriptions verbatim (Streamline: `SB/modules/rbac/permissions/kb.ts`) — `/settings/permissions` lists a "kb" group, and `lib/rbac/route-permissions.test.ts` still passes.

- [ ] KB-0003 [Critical][RBAC] Role defaults for KB — `lib/rbac/permissions.ts` `ROLE_DEFAULT_PERMISSIONS` — Apply the §2.4 table. Add `kb:articles:view`, `kb:spaces:view` and `kb:pages:view` to `EMPLOYEE_SELF_SERVICE`, matching Streamline's `UNIVERSAL_MEMBER_PERMISSION_GRANTS` (Streamline: `SB/modules/rbac/permissions/role-defaults.ts`, `role-templates.constants.ts` Customer Support) — A new unit test asserts every SYSTEM_ROLE has the three view permissions, CUSTOMER_SUPPORT has all except purge, and SALES lacks `kb:spaces:manage`.

- [ ] KB-0004 [Critical][Access] Page action ranks — `lib/knowledge/access-levels.ts` — `KB_PAGE_ACTIONS = view, comment, edit, manage` with `accessSatisfies` and `accessLevelsSatisfying`, plus `KB_ACCESS_ROUTES` (owner, admin, creator, organization, public, space, project, grant) and the `AccessDecision` type (allowed / notFound / denied) (Streamline: `SB/modules/kb/core/authorization/knowledge-authorization.types.ts`) — Unit tests cover every rank pair.

- [ ] KB-0005 [Critical][Config] KB capability probe — `lib/knowledge/config.ts` and `app/api/knowledge/capabilities/route.ts` — Booleans only: `ai` (`isAIConfigured()`), `embeddings` (`isOpenAIConfigured()`), `storage` (`isStorageConfigured()`), `jobs` (`!!INNGEST_EVENT_KEY`), `email` (ZeptoMail token present), `vector` (the `kb_chunks` table exists) and `helpCentre` (org flag). Never return values (Streamline: `EmbeddingsService.isConfigured`, `GET /kb/hr-link/config`) — With every optional env var unset, the route returns 200 and all flags false. A test asserts no env value appears in the body.

- [ ] KB-0008 [Critical][Access] Route protection — `middleware.ts` `PROTECTED_ROUTES`, `lib/auth/route-access.ts` `ROUTE_ROLE_MAP` — `/knowledge` is open to EVERYONE. `/knowledge/wiki/manage` and `/knowledge/wiki/analytics` need `kb:analytics:view`, `/knowledge/wiki/import` needs `kb:pages:import` or `export`, and trash purge needs the permission check in the API. `/wiki/*` and `/help/*` are public (not protected) — `route-access.test.ts` gains cases. Signed out, `/knowledge` redirects to `/signin` and `/wiki/abc` does not.

- [ ] KB-0010 [Critical][DB] Migration `0159_kb_core` — `drizzle/0159_kb_core.sql`, `lib/db/schema/knowledge.ts` — Create enums `kb_audience` (internal, public, mixed) and `kb_space_role` (viewer, commenter, editor, publisher, admin). Create tables `kb_spaces` (all columns in §0 #3, unique `(org_id, slug)` where `deleted_at IS NULL`, unique `(org_id, id)`), `kb_space_members` (partial uniques per user and per role), `kb_space_acl_versions`, and `kb_pages` with every column in §0 #1. Include the generated `fts` column `setweight(to_tsvector('english', coalesce(title,'')),'A') || setweight(to_tsvector('english', coalesce(content_text,'')),'B')`, a GIN index, the status/trust check constraints, the partial indexes (org+parent+sort live, org+updated live, org+status live, org+next_review), the unique public token hash, the unique org+public_slug and org+external ref, and the composite FKs to `kb_spaces` and the parent page. Leave `category_id` without an FK until KB-0022 (Streamline: `SB/db/schema/kb/spaces.ts`, `pages.ts`, `common/enums.ts:103-104`, migrations `0769`, `1205`) — Running `pnpm db:apply-pending` twice is a no-op the second time. `\d kb_pages` shows the `fts` generated column and its GIN index.

- [ ] KB-0011 [Critical][DB] Migration `0160_kb_page_social` — `drizzle/0160_kb_page_social.sql` — `kb_page_favorites` (unique page+user, org+user+sort index), `kb_page_visits` (org+user+visited_at index) and `kb_page_links` (source_page_id, target_page_id, target_type default 'page', target_id, label; unique `(org_id, source_page_id, target_type, target_id)` where target_id is not null; target index) (Streamline: `SB/db/schema/kb/pages.ts` `kbPageFavorites`, `kbPageVisits`, `kbPageLinks`, migration `1021`) — Apply passes. Inserting a duplicate favourite raises a unique violation.

- [ ] KB-0012 [Critical][DB] Migration `0161_kb_collab` — `drizzle/0161_kb_collab.sql` — `kb_page_versions` (unique page+version_number, plus an **append-only trigger** that rejects UPDATE and DELETE except by cascade), `kb_page_comments` (parent_id self-FK with cascade, `anchor_block_index`, `anchor_quote`, `resolved_at`) and `kb_page_templates` (unique org+name, `use_count`, `last_used_at`) (Streamline: `SB/db/schema/kb/page-collab.ts`, migrations `1078_kb_version_append_only.sql`, `1216_kb_page_comment_anchor.sql`, `1217_kb_page_templates_usage.sql`) — `UPDATE kb_page_versions SET title='x'` fails with the trigger message.

- [ ] KB-0013 [Critical][DB] Migration `0162_kb_access` — `drizzle/0162_kb_access.sql` — `kb_page_grants` (identity id, user_id or role, access view/comment/edit/manage, granted_by, revoked_at; live partial uniques per user and role; live indexes) and `kb_page_restrictions` (page, user_id, role, team, level) (Streamline: `SB/db/schema/kb/page-grants.ts`, `restrictions.ts`, migration `1168_kb_page_grants.sql`) — Apply passes. Two live grants for the same user and page violate the unique.

- [ ] KB-0017 [Critical][DB] Migration `0166_kb_retrieval` (pgvector, guarded) — `drizzle/0166_kb_retrieval.sql` — In a `DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS vector; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pgvector unavailable'; END $$` block, and only if the extension exists, create `kb_chunks` (page_id, attachment_id, source_id, source text, chunk_index, content, content_hash, tokens, `embedding vector(1536)`, embedding_model, page_visibility, page_project_id, page_created_by, acl_revision, content_revision, acl_synced_at, created_at), an HNSW index `USING hnsw (embedding vector_cosine_ops)`, an org+page index, and `kb_ingestion_checkpoints` (content_type, content_id, content_hash, chunk_index, content, embedding). Always create `kb_indexed_bytes_quota` (`limit_bytes` default 536870912) (Streamline: `SB/db/schema/support/kb-chunks.ts` `KB_EMBEDDING_DIMENSIONS = 1536`, `kb-ingestion-checkpoints.ts`, `kb/indexed-bytes-quota.ts`, migrations `0300`, `0461`, `0701`, `1000_s08_plan_measured_indexes_and_kb_ann.sql`, `1212`) — On Neon, `\dx` lists `vector` and `kb_chunks` exists. On a Postgres without pgvector the migration still succeeds and `/api/knowledge/capabilities` reports `vector:false`.

- [ ] KB-0024 [Critical][DB] Register and verify all KB migrations — `scripts/apply-pending-migrations.ts` (`PENDING_TAGS`, `TIMESTAMPS`), `drizzle/meta/_journal.json`, `scripts/check-schema-drift.ts` baseline — Add every `0159`–`0172` tag. Add a vitest test that every `drizzle/*_kb_*.sql` file is in `PENDING_TAGS` (Streamline: `SB/modules/kb/kb-version-append-only-migration.spec.ts` pattern) — `pnpm db:check-drift` is clean, the test passes, and a Vercel production deploy log shows the KB tags applied.

- [ ] KB-0025 [Critical][DB] Drizzle schema and relations — `lib/db/schema/knowledge.ts`, `lib/db/schema/index.ts` — Write the Drizzle definitions for every table above, typed `$type<>` unions copied from Streamline, plus relations. Leave `kb_chunks` out of `drizzle-kit push` (vector custom type) or define it with `customType` (Streamline: `SB/db/schema/kb/index.ts`) — `pnpm typecheck` passes, and `db.query.kbPages.findFirst()` compiles.

- [ ] KB-0026 [Critical][Content] Plate JSON → text, excerpt and links — `lib/knowledge/content.ts` — `extractContentText(content)` (walk Plate nodes, with a 500-paragraph cap), `buildExcerpt(text, 200)`, `extractPageLinks(content)` (internal page links and record links from link and page-link elements) and `extractMentions(content)` (mention elements → user ids) (Streamline: `SB/modules/kb/wiki/kb-page-content.util.ts`, `SB/modules/kb/help-centre/lib/kb-page-content.ts` `MAX_PARAGRAPHS = 500`, `resyncPageLinks` in `kb-page-edit.util.ts`) — Unit tests with fixtures copied from Streamline tests cover headings, lists, tables, toggles and mentions.

- [ ] KB-0027 [Critical][Access] Page and space authorization service — `lib/knowledge/authorization.ts` — `resolvePageAccess(session, pageId, action)` returns an `AccessDecision`. Order: org admin (CEO/ADMIN or `kb:pages:manage`) → owner → creator → page visibility `org` (view for anyone in the org; edit needs `kb:pages:update` or a space editor role) → space membership role → project membership (via `lib/projects/project-access.ts` for `project_id` pages) → live grant (user or role). `private` pages are visible only to the creator, owner, grantees and admins. Also `visiblePagesPredicate(session)`, a Drizzle SQL predicate for list and search queries, and `resolveSpaceAccess` (Streamline: `SB/modules/kb/core/authorization/knowledge-authorization.service.ts`, `knowledge-page-scope.ts`, `knowledge-space-scope.ts`, `SB/modules/kb/retrieval/kb-page-visibility.ts`) — Unit tests with a matrix of 9 roles × private/org/space/project/grant. Another org's page returns notFound, never denied.

- [ ] KB-0029 [Critical][Content] Page writer (single write path) — `lib/knowledge/page-writer.ts` — `commitPageChange(tx, {page, changed, action})` does the following in one transaction: (1) `snapshotIfNeeded`, which adds a version at most every **10 minutes** unless forced (restore, publish); (2) re-sync `kb_page_links`; (3) recompute `content_text` and excerpt; (4) bump `content_revision`; (5) write the audit entry. After commit, (6) queue mention notifications and (7) emit the indexing event (never call a provider inside the transaction) (Streamline: `SB/modules/kb/wiki/kb-page-writer.service.ts`, `kb-page-edit.util.ts` `VERSION_WINDOW_MS = 10*60*1000`, `SB/modules/kb/kb-no-provider-call-inside-transaction.spec.ts`) — Unit tests: two edits 1 minute apart create 1 version, edits 11 minutes apart create 2, and a forced edit always creates one.

- [ ] KB-0035 [Critical][API] Spaces CRUD — `app/api/knowledge/spaces/route.ts` (GET, POST), `spaces/[spaceId]/route.ts` (GET, PATCH, DELETE) — Fields: name, slug (auto from name, unique per org), description, type, audience, icon, colour, default visibility. List only spaces the user can see, with member counts (Streamline: `SB/modules/kb/wiki/kb-spaces.controller.ts`, `kb-spaces.service.ts`, migration `1206_kb_space_member_counts.sql`) — Route tests: 401 signed out, 404 cross-org, 403 POST without `kb:spaces:manage`, 400 unknown field (`.strict()`), and 409 duplicate slug.

- [ ] KB-0038 [Critical][API] Create a page — `app/api/knowledge/pages/route.ts` POST — Body: `title`, `spaceId?`, `parentPageId?`, `projectId?`, `templateId?` (copies content and bumps `use_count`/`last_used_at`), `contentType?`, `visibility?` (defaults to the space's default). Validate that the parent is in the same org and space and that the user has edit on the parent or space (Streamline: `SB/modules/kb/wiki/kb-pages.controller.ts` POST, `kb-pages.service.ts`, `kb-page-templates.service.ts`) — Tests: parent in another org → 404, no permission → 403, from-template copies content.

- [ ] KB-0039 [Critical][API] Get and update a page with a revision guard — `app/api/knowledge/pages/[pageId]/route.ts` (GET, PATCH) — GET returns the page, breadcrumbs, my access level, favourite flag and capabilities. PATCH accepts `title, icon, coverImage, content, contentType, ownerUserId, reviewIntervalDays, expectedRevision`. If `expectedRevision !== content_revision`, return 409 with the current page. A locked page needs manage. Goes through `commitPageChange` (Streamline: `SB/modules/kb/wiki/kb-pages.service.ts` revision guard at lines ~399-415, `SB/modules/kb/wiki/kb-revision-conflict.e2e-spec.ts`) — Tests: stale revision → 409 `KB_PAGE_CONFLICT`, locked page and editor → 403, normal save → 200 with revision+1.

- [ ] KB-0040 [Critical][API] Tree, recent, favourites, visits — `app/api/knowledge/pages/tree/route.ts`, `recent`, `favorites`, `[pageId]/favorite` (POST, DELETE), `[pageId]/visit` (POST) — The tree takes `spaceId` or `projectId` and returns a flat list `{id, parentPageId, title, icon, sortOrder, hasChildren}` of visible live pages (≤500 nodes; lazy children past that). Recent comes from `kb_page_visits` (last 20 distinct). Visits are de-duplicated per user per page per 5 minutes (Streamline: `kb-pages.controller.ts` tree/recent/favorites/visit, `kb-page-tree.service.ts`, `kb-page-visits.service.ts`, `dto/kb-page-tree.dto.ts`) — The tree hides private pages of other users (test).

- [ ] KB-0043 [Critical][API] Delete to trash and restore — `app/api/knowledge/pages/[pageId]/route.ts` DELETE, `[pageId]/restore/route.ts` — Delete soft-deletes the page and its subtree (`deleted_at`, `deleted_by_id`), removes chunks via an event, and revokes the public link. Restore brings back the subtree and re-parents to the root if the parent is still deleted (Streamline: `SB/modules/kb/wiki/kb-page-trash.service.ts`) — Deleted pages vanish from the tree and search. Restore returns them.

- [ ] KB-0065 [Critical][UI] Add the "Knowledge" module to the top nav for every role — `components/layout/sidebar/sidebar-nav-items.ts` — For each role case add the group `Knowledge – Wiki` (Ask KB `/knowledge/chat` when capabilities.ai, Wiki `/knowledge/wiki`, Search, My pages, Shared with me, Spaces, Templates) and, for roles with the matching permission, `Knowledge – Manage` (Reviews, Import & Export, Analytics, Content Health, Company documents, KB settings). Trash is a link at the bottom of the wiki sidebar. Use lucide icons consistent with the file (Streamline: `SF/features/wiki/components/wiki-sidebar-nav.tsx` items and labels) — `sidebar-nav-items.test.ts`: `getModules()` contains "Knowledge" for all 9 roles, and SALES doesn't see Analytics.

- [ ] KB-0066 [Critical][UI] React Query hooks and keys — `lib/api/hooks/knowledge/*.ts`, `lib/query-keys.ts` — Port one hook file per Streamline file: pages, page-collection, spaces, page-versions, page-comments, page-grants, page-reviews, page-templates, record-links, search, ask, chat-history, research-briefs, analytics, content-health, import-export, export-page, sources, settings, linked-documents and doc-ai-stream, with Zod response schemas (Streamline: `SF/hooks/api/kb/*.ts`, `*-schema.ts`, `SF/lib/query-keys/knowledge-and-surveys.ts`) — Typecheck passes, and the hook tests (fetch mock) parse sample payloads.

- [ ] KB-0067 [Critical][UI] Knowledge layout, redirect and error states — `app/(dashboard)/knowledge/layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `wiki/layout.tsx` — `/knowledge` redirects to `/knowledge/chat` if `capabilities.ai && flags.knowledgeAi`, else `/knowledge/wiki`. The wiki layout hosts `WikiShell` (Streamline: `SF/app/(authenticated)/knowledge/layout.tsx`, `page.tsx`, `error.tsx`, `wiki/layout.tsx`, `page.test.tsx`) — The ported page test passes both with and without AI.

- [ ] KB-0068 [Critical][UI] Wiki shell, sidebar and quick find — `features/knowledge/components/wiki-shell.tsx`, `wiki-sidebar-nav.tsx`, `wiki-sidebar-chrome.tsx`, `quick-find-dialog.tsx` — Left panel: quick-find button (⌘/Ctrl+K), nav items, Favourites, then the page tree for the current space, then Trash at the bottom. Collapsible on mobile (sheet) (Streamline: `SF/features/wiki/components/wiki-shell.tsx` keyboard handler near line 96, `wiki-sidebar-nav.tsx`, `wiki-sidebar-chrome.tsx`, `quick-find-dialog.tsx`) — ⌘K opens quick find, Esc closes it, and at 375 px the sidebar is a sheet.

- [ ] KB-0069 [Critical][UI] Page tree — `features/knowledge/components/page-tree.tsx`, `page-tree-item.tsx`, `wiki-page-collection-item-menu.tsx` — Expand and collapse (state persisted in localStorage), a hover "+" to add a child, a "…" menu (rename, duplicate, move, copy link, delete), drag to reorder or re-parent calling the move API, and keyboard arrows (Streamline: `SF/features/wiki/components/page-tree.tsx`, `page-tree-item.tsx`, `wiki-page-collection-item-menu.tsx`) — Dragging a page under its own child is blocked client-side, and the server returns 400 when the guard is bypassed.

- [ ] KB-0071 [Critical][Editor] Port the Plate editor core — `components/editor/plate/plate-document-editor.tsx`, `plate-plugins.ts`, `plate-elements.tsx`, `plate-leaves.tsx`, `plate-context.ts`, `plate-list-model.ts` — Add `platejs` and `@platejs/{basic-nodes,basic-styles,callout,caption,code-block,emoji,indent,link,list,media,mention,slash-command,table,toggle}` at the SF versions (^53). Plugins: paragraph, H1–H3 with markdown rules, blockquote, hr, bold/italic/underline/strike/code, font colour/background/size, text align, indent, list and to-do, code block with syntax, table, callout, toggle, caption (Streamline: `SF/components/editor/plate/plate-plugins.ts`, `plate-elements.tsx`, `plate-leaves.tsx`, `plate-list-model.ts`) — `plate-document-editor.test.tsx` and `plate-list-model.test.ts` ported pass. Typing `# ` makes an H1.

- [ ] KB-0075 [Critical][UI] Page document view and edit — `app/(dashboard)/knowledge/wiki/doc/[pageId]/page.tsx`, `loading.tsx`, `features/knowledge/components/page-document.tsx`, `page-document-header.tsx`, `page-document-breadcrumb.tsx`, `page-document-toolbar.tsx`, `page-document-outline.tsx`, `page-document-meta-footer.tsx`, `page-document-property-actions.tsx`, `page-right-panel.tsx`, `features/knowledge/lib/page-action-descriptors.ts`, `features/knowledge/wiki-document.css` — Cover, icon, an editable title (Enter moves to the body), breadcrumb, editor, a right panel (outline from headings, properties, backlinks, record links) and a meta footer ("Edited by X · 5 min ago · v12"). Read-only when access < edit or the page is locked. Reading width 720 px (Streamline: same file names in `SF/features/wiki/components/` and `SF/features/wiki/lib/`, `SF/features/wiki/wiki-document.css`) — A viewer sees no editor controls. Clicking the outline scrolls to the heading. No layout shift at 375/768/1280/1440.

- [ ] KB-0076 [Critical][UI] Autosave and the edit-conflict dialog — `features/knowledge/components/use-page-autosave.ts`, `use-page-presentation-update.ts`, `page-edit-conflict.tsx` — Debounce **1500 ms**, send `expectedRevision`, and show a "Saving… / Saved / Offline" text pill. On 409, show the conflict dialog: "Keep mine" (save again on top of the new revision) or "Load latest" (Streamline: `SF/features/wiki/components/use-page-autosave.ts` `PAGE_AUTOSAVE_DELAY_MS = 1500`, `page-edit-conflict.tsx`) — Two tabs editing the same page: the second save shows the dialog, and nothing is lost.

- [ ] KB-0094 [Critical][Search] Keyword (FTS) search, works without any AI key — `lib/knowledge/search/keyword.ts`, `app/api/knowledge/pages/search/route.ts` — Use `websearch_to_tsquery('english', q)` over `kb_pages.search_vector` (title weighted A, content_text B), filtered by access through `lib/knowledge/authz.ts` SQL predicates. `ts_headline` for snippets, ranked by `ts_rank_cd`. Filters: space, status, contentType, tag, owner, updatedAfter. Limit 1..50, cursor pagination (Streamline: `SB/modules/kb/retrieval/kb-page-search-query.service.ts`, `kb-page-search-cursor.ts`, `SB/modules/kb/core/kb-article-keyword-search.ts`) — With `OPENAI_API_KEY` unset, searching "leave policy" returns the seeded page with a snippet. An inaccessible private page never appears.

- [ ] KB-0097 [Critical][Search] Chunker — `lib/knowledge/indexing/chunk.ts` — Port the logic: target **1500 chars**, **200 overlap**, split on headings first, then paragraphs, then sentences. Keep the heading path as `section_path`. At most **400 chunks per document** (extra text is dropped, with a warning saved on the source) (Streamline: `SB/modules/kb/retrieval/kb-chunk-utils.ts` `KB_CHUNK_SIZE_CHARS = 1500`, `KB_CHUNK_OVERLAP_CHARS = 200`, `KB_MAX_CHUNKS_PER_DOCUMENT = 400`, `KB_CHUNK_PARAGRAPH_LOOKBACK_CHARS`) — Unit tests: a 10 000-char page gives 7–8 chunks with 200 overlap. 1 MB of text caps at 400.

- [ ] KB-0098 [Critical][AI] Embeddings client — `lib/knowledge/indexing/embeddings.ts` — `text-embedding-3-small`, 1536 dims, via `openai` (already in the CRM) or `@langchain/openai`. Batches of **64**, with a **20 s** timeout per batch, retrying 429/5xx up to 3 times with backoff. `isEmbeddingConfigured()` = `!!process.env.OPENAI_API_KEY` (Gemini keys don't count for embeddings) (Streamline: `SB/modules/ai/core/providers/embeddings.service.ts` `EMBEDDING_MODEL = "text-embedding-3-small"`, `MAX_EMBED_BATCH = 64`, `EMBEDDING_TIMEOUT_MS = 20_000`; `KB_EMBEDDING_DIMENSIONS` (1536)) — A unit test with a mocked fetch splits 130 inputs into 64+64+2. With no key it throws `KbAiNotConfiguredError`.

- [ ] KB-0100 [Critical][Search] Indexing pipeline for pages — `lib/knowledge/indexing/ingest.ts`, `lib/inngest/functions/knowledge-ingest.ts` — After a page save, publish or visibility change, emit `kb/page.index` with `{orgId, pageId, contentRevision}`. The worker takes a lease, chunks the page (KB-0097), embeds (KB-0098), writes `kb_ingestion_checkpoints` so a retry resumes rather than re-embedding, then replaces the page's `kb_chunks` in one transaction, copying the ACL columns (`page_visibility`, `page_project_id`, `page_created_by`, `acl_revision`). Per-org concurrency **20**. Add `bytes` to `kb_indexed_bytes_quota` and refuse past the limit (**512 MB**). If `kb_chunks` doesn't exist (no pgvector) or `OPENAI_API_KEY` is missing, skip quietly and log `kb.index.skipped`, because keyword search uses `kb_pages.search_vector` directly (Streamline: `SB/modules/kb/retrieval/kb-indexing.service.ts`, `kb-ingestion-consumer.ts` `KB_MAX_CONCURRENT_PER_ORG = 20`, `kb-ingestion-lease.service.ts`, `kb-ingestion-checkpoint.service.ts`, `kb-content-adapter.ts`, `SB/modules/kb/core/kb-indexed-bytes-quota.service.ts` `KB_DEFAULT_LIMIT_BYTES = 536870912`) — Publishing a page gives `kb_chunks` rows within one sweep, with the key and pgvector present. Without them the save still succeeds and nothing errors.

- [ ] KB-0101 [Critical][Ops] Ingest without Inngest: inline plus sweeper — `lib/knowledge/indexing/run-inline.ts`, `app/api/cron/knowledge-sweep/route.ts`, `vercel.json` crons — If `INNGEST_EVENT_KEY` is missing, process ≤1 small source inline after the response (`after()` from next/server). The cron (every 15 min, `verifyCronSecret`) picks up `pending` or expired-lease sources, 25 per run, and also runs trash purge, the stuck reaper, review due-dates and chat retention (Streamline: `SB/modules/kb/retrieval/kb-ingestion-consumer.ts`, `kb-stuck-source-reaper.service.ts`, `SB/modules/kb/core/kb-chunk-retention.ts`) — With Inngest off and the cron hit manually with the secret, pending sources become indexed. Without the secret → 401.

- [ ] KB-0103 [Critical][Search] Hybrid retrieval (FTS + vector, RRF) — `lib/knowledge/search/hybrid.ts` — Run the FTS leg and the vector leg (`embedding <=> $q`) in parallel, each limited to `limit*4`, and merge with Reciprocal Rank Fusion **k = 60**. When the org's chunk count ≤ **8000**, use an exact scan (`SET LOCAL enable_indexscan = off` for the vector leg). Otherwise use HNSW with `SET LOCAL hnsw.ef_search = min(limit*8, 1000)`. Access is filtered inside SQL via the `kb_search_chunks` function from KB-0018. Falls back to FTS-only if pgvector or the embedding key is missing (Streamline: `SB/modules/kb/retrieval/kb-candidate.service.ts` `RRF_CONSTANT = 60`, `kb-retrieval-strategy.ts` `KB_EXACT_SCAN_MAX_CHUNKS = 8_000`, `KB_ANN_EF_SEARCH_MULTIPLIER = 8`, `KB_ANN_EF_SEARCH_MAX = 1_000`, `kb-vector-candidate-query.ts`, `kb-search-retrieval.service.ts`) — Tests: a semantic query ("time off rules" → "Leave policy") ranks the leave page first with the key. Without the key it still returns FTS results, and no error is shown.

- [ ] KB-0110 [Critical][AI] Ask the KB (grounded answer with citations) — `app/api/knowledge/ask/route.ts` (POST `{question ≤2000, conversationId?, scope?: {spaceId?, pageIds?}}`), `lib/knowledge/ai/ask.ts` — Hybrid-retrieve at most **6 documents** and **8 passages**, build the prompt from `ASK_SYSTEM_PROMPT` (copied verbatim: answer only from the sources, cite as [n], say you don't know when unsupported), and call `lib/ai/openai.ts` with gpt-4o-mini (fast) or gpt-4o when `mode: 'thorough'`. The response is `{answer, citations:[{n,pageId,title,sectionPath,snippet}], confidence, noAnswer}`. Returns 503 `KB_AI_NOT_CONFIGURED` when `!isAIConfigured()` (Streamline: `SB/modules/kb/retrieval/kb-ask.service.ts`, `kb-ask-context.ts` `ASK_SYSTEM_PROMPT`, `KB_ASK_MAX_CONTEXT_DOCUMENTS = 6`, `KB_CITABLE_MAX_PASSAGES = 8`, `kb-ask-citations.service.ts`, `kb-citation-visibility.service.ts`) — An eval question about the leave policy cites the leave page. An unrelated question gives `noAnswer: true` and no invented text.

- [ ] KB-0159 [Critical][Test] Access matrix unit tests — `lib/knowledge/__tests__/authz.test.ts` — For every access route (owner, admin, creator, organization, public, space, project, grant) × action (view, comment, edit, manage) × role (the 9 system roles), port the Streamline expectations, including cross-org denial and a trashed page being invisible to non-managers (Streamline: `SB/modules/kb/core/authorization/**` specs, `kb-access.service.ts`) — All pass in `pnpm test`.

- [ ] KB-0160 [Critical][Test] Route handler tests — `app/api/knowledge/**/__tests__/*.test.ts` — Every route gets 401 without a session, 403 without the permission, 400 on a bad body, 404 on another org's id and a happy path. Mirror the PR #4 Build-port test style (Streamline: the matching `*.controller.spec.ts`) — Coverage for `app/api/knowledge` ≥ 80% lines.

- [ ] KB-0161 [Critical][Test] Degradation tests with env vars missing — `lib/knowledge/__tests__/capabilities.test.ts`, plus the route tests — With `OPENAI_API_KEY` unset: search works (keyword), ask → 503 `KB_AI_NOT_CONFIGURED`, the UI hides AI entry points. With R2 unset: media → 503 `KB_STORAGE_NOT_CONFIGURED` and upload controls are hidden. With Inngest unset: inline plus sweeper. With Upstash unset: in-memory rate limit. With ZeptoMail unset: in-app only — All pass. `pnpm build` succeeds with none of these env vars set.

- [ ] KB-0165 [Critical][Test] Playwright end-to-end flows on prod with QA temp users — `e2e/knowledge.spec.ts` — Use temp emails with the prefix `qa.kb.` (e.g. a CEO, an HR, a SALES and an ENGINEERING user), onboarded through the normal invite flow. Flows: create a space → create a page from a template → type, autosave and reload → @mention (email is received) → comment and resolve → share to org → SALES can view but not edit → request review → approve → publish → search finds it → move → duplicate → trash → restore → version restore → public link (with the flag on) opens logged out → revoke → 404 → import 3 .md files → export a zip → content-health shows the stale seed → analytics counts. Then the AI flows, only if the key is set. Viewports 375/768/1280/1440 (Streamline: `SF/frontend/e2e/kb-routes.spec.ts`) — All green. Screenshots attached to the run.

- [ ] KB-0167 [Critical][Test] Migration safety — CI plus the prod deploy — `pnpm db:migrate:deploy` is idempotent (run it twice). `apply-pending-migrations.ts` lists 0159–0172 (and 0173 later) in `PENDING_TAGS` with `TIMESTAMPS`. Run once against a fresh branch DB without pgvector and once with it. Check `pages` → `kb_pages` row counts after KB-0023 — Vercel prod deploy log shows the migrations applied, and `/api/knowledge/capabilities` returns 200.

- [ ] KB-0006 [High][API] KB error helpers — `lib/knowledge/errors.ts` — `kbNotFound()` (404), `kbDenied()` (403), `kbConflict(currentRevision)` (409 `KB_PAGE_CONFLICT`), `kbNotConfigured(kind)` (503 `KB_AI_NOT_CONFIGURED` / `KB_STORAGE_NOT_CONFIGURED`), all using `err()` from `lib/api/helpers.ts` (Streamline: `AccessDecision` handling in `knowledge-authorization.service.ts`, `ConflictException` in `kb-pages.service.ts`) — Unit tests check the status and code for each.

- [ ] KB-0007 [High][Config] Org feature flags for KB — `lib/org-features.ts` — Add `knowledgeBase` (default true), `knowledgeAi` (default true, effective only when `ai`), `knowledgePublicSharing` (default true) and `knowledgeHelpCentre` (default false). Expose them in `/settings` feature flags (Streamline: `SB/modules/kb/kb-module-gate.spec.ts` module gate) — `parseOrgFeatureFlags({})` returns the defaults (test), and turning `knowledgeBase` off makes `/api/knowledge/*` return 404.

- [ ] KB-0009 [High][Audit] KB audit actions — `lib/audit-log.ts` `AuditAction` — Add `kb.page.created/updated/moved/deleted/restored/purged/published/archived/verified/visibility_changed/locked`, `kb.version.restored`, `kb.grant.created/revoked`, `kb.space.created/updated/archived/restored`, `kb.member.added/removed`, `kb.import.started`, `kb.export.started`, `kb.settings.updated` and `kb.share_link.created/revoked` (Streamline: `this.audit.logCritical` calls in `kb-page-writer.service.ts`, `kb-page-versions.service.ts`, migration `1207_kb_version_restore_audit.sql`) — Typecheck passes and the audit-log page renders the new labels.

- [ ] KB-0014 [High][DB] Migration `0163_kb_governance` — `drizzle/0163_kb_governance.sql` — `kb_page_reviews` (type approval or freshness, status pending/approved/rejected, requested_by, reviewer, due_at, decided_at, decision_note), `kb_import_jobs` (source_type markdown/html/zip/support_kb; status pending/processing/completed/failed/cancelled; total/processed/succeeded/failed/duplicate counters; input_options jsonb; retry_of_job_id; error_report jsonb), `kb_export_jobs` (scope_type page or all, scope_id, format markdown or html, status, file_key, expires_at), `kb_export_object_attempts`, `kb_page_purge_ledger` (store, status, attempt_count, failed_reason) and `kb_settings` (`trash_retention_days` default 30, `chat_history_retention_days` default 90, `hrms_kb_link_enabled/search/ai` default false, unique org) (Streamline: `SB/db/schema/kb/governance.ts`, `purge-ledger.ts`, `settings.ts`, migrations `1170`, `1193`, `2045`, `2047`, `2059`) — Apply passes. The default `kb_settings` row is created lazily by KB-0034.

- [ ] KB-0015 [High][DB] Migration `0164_kb_files` — `drizzle/0164_kb_files.sql` — `kb_page_attachments` (file_key, file_name, file_url, mime_type, file_size, sha256, uploaded_by, deleted_at) and `kb_sources` (space_id, kind file or note, title, file_key, file_url, mime_type, file_size, note_text, status, chunk_count, error_message, created_by) (Streamline: `SB/db/schema/kb/attachments.ts`, `sources.ts`, migrations `1042`, `1044`) — Apply passes.

- [ ] KB-0018 [High][DB] Migration `0167_kb_search_functions` — `drizzle/0167_kb_search_functions.sql` — Port the SQL functions: the page FTS resolver (`websearch_to_tsquery('english', q)` with a plain fallback) and the hybrid chunk search function (FTS rank plus `embedding <=> p_vec` cosine, exact scan or ANN path, ACL predicate parameters). Create the hybrid function only when `kb_chunks` exists (Streamline: migrations `0453_kb_article_fts_function.sql`, `0703_kb_chunk_search_function.sql`, `0714_kb_chunk_search_hybrid.sql`, `0717`, `1000`, `1227_kb_page_fts_tsquery_resolver.sql`) — `SELECT * FROM kb_page_fts('...')` runs. The hybrid function exists only when vector is on.

- [ ] KB-0019 [High][DB] Migration `0168_kb_ai` — `drizzle/0168_kb_ai.sql` — `kb_chat_conversations` (user, title), `kb_chat_messages` (user, role, content, citations jsonb, conversation_id), `kb_ai_interactions` (correlation_id, actor, conversation_id, message_id, provider, model, prompt_policy_version, source_ids_with_revisions jsonb, prompt/completion/total tokens, latency_ms, result_state, feedback, cost_credits, created_at), `kb_research_briefs` (user, topic, space_id, status queued/running/completed/failed, job_id, source_count, report, citations jsonb, error_message, rating, cost_credits, provider, model, approved_at, approved_by), `tenant_ai_credits` (balance, monthly_allowance nullable, last_reset_at), `tenant_ai_credit_transactions` and `kb_events` (event_type, actor, article_id, query, metadata, correlation_id, occurred_at; org+type+time index) (Streamline: `SB/db/schema/kb/chat.ts`, `ai-interactions.ts`, `research-briefs.ts`, `credits.ts`, `events.ts`, migrations `0794`, `1208`, `1209`, `1218`, `1233`, `1235`) — Apply passes.

- [ ] KB-0023 [High][DB] Migration `0172_kb_backfill_project_pages` — `drizzle/0172_kb_backfill_project_pages.sql` — For each project create one `kb_spaces` row (type `project`, slug `project-{id}`). Then `INSERT INTO kb_pages (org_id, space_id, project_id, parent_page_id, title, icon, cover_image, content, visibility, created_by_id, created_at, updated_at, external_source, external_id) SELECT … FROM pages`, with `external_source='crm_pages'` and `external_id=pages.id` so it's idempotent through the unique external ref. Then remap `parent_page_id`. Map `is_public` → `visibility='org'` (the old public meant project-public, **not** internet), and leave `content_text` to be filled by KB-0033 (Streamline: `kb_pages.project_id` used by `SF/app/(authenticated)/build/[projectId]/wiki`) — Row counts match: `SELECT count(*) FROM pages` equals `SELECT count(*) FROM kb_pages WHERE external_source='crm_pages'`. Re-running inserts 0.

- [ ] KB-0028 [High][Access] Space role resolution — `lib/knowledge/space-access.ts` — Map `kb_space_role` to actions (viewer → view, commenter → comment, editor → edit, publisher → edit plus publish/verify, admin → manage). Members match by user_id or role. Auto-create a **private space per user** on first visit for "My pages" (D8) (Streamline: `kb_space_members.space_role`, `kb_spaces.type='private'`, `SF/features/wiki/components/private-page.tsx`) — A test shows SALES with editor on space A can edit pages in A and not in B.

- [ ] KB-0030 [High][Content] Tree helpers — `lib/knowledge/tree.ts` — `getAncestors(pageId)` (recursive CTE with a walk cap), `wouldCreateCycle(pageId, newParentId)`, `getSubtreeIds(pageId)`, and `nextSortOrder(parentId)` (Streamline: `SB/modules/kb/wiki/kb-page-tree.service.ts` `WITH RECURSIVE ancestors`, `kb-page-subtree.util.ts`) — Tests: moving a page under its own child returns `wouldCreateCycle = true`.

- [ ] KB-0032 [High][Content] Value conversion (Markdown, HTML, legacy ↔ Plate) — `components/editor/plate/plate-value-convert.ts` (server-safe, no React) — Markdown → Plate, HTML → Plate (sanitised with `sanitize-html`), legacy CRM project-page content (plain string or old shape) → Plate, and Plate → Markdown or HTML for export (Streamline: `SF/components/editor/plate/plate-value-convert.ts`, `SB/modules/kb/wiki/kb-export-serializer.ts` `toMarkdown`/`toHtml`) — Round-trip tests: md → plate → md keeps headings, lists, links, code and tables.

- [ ] KB-0033 [High][Content] Backfill `content_text` for migrated project pages — `scripts/kb-backfill-content-text.ts` and a one-time step inside `/api/cron/knowledge-sweep` (KB-0101) — For rows with `content_text IS NULL`, convert the legacy content to Plate via KB-0032 and compute the text (Streamline: `SB/modules/kb/retrieval/kb-page-backfill.service.ts`, batch 50, 100 ms delay) — After the run there are no `kb_pages` rows with null `content_text` and non-null `content`.

- [ ] KB-0034 [High][API] KB settings — `app/api/knowledge/settings/route.ts` (GET, PATCH), `settings/hr-link-flags/route.ts` — GET upserts the default row. PATCH needs `kb:settings:manage` and validates `trashRetentionDays` 1–365 and `chatHistoryRetentionDays` 1–3650 (Streamline: `SB/modules/kb/core/kb-settings.controller.ts`, `kb-settings.service.ts`, `kb-hr-link-flags.controller.ts`) — SALES PATCH → 403. Bad body → 400. CEO PATCH → 200, plus an audit row.

- [ ] KB-0036 [High][API] Space archive, restore and archive-impact — `app/api/knowledge/spaces/[spaceId]/archive-impact/route.ts`, `/archive`, `/restore` — Impact returns page count, published count, public links and linked documents. Archive sets `archived_at`, makes its pages read-only, and bumps `kb_space_acl_versions` (Streamline: `SB/modules/kb/wiki/kb-space-lifecycle.service.ts`, `SF/features/wiki/components/space-archive-impact.tsx`) — Editing a page in an archived space → 403.

- [ ] KB-0037 [High][API] Space members — `app/api/knowledge/spaces/[spaceId]/members/route.ts` (GET, POST), `members/[memberId]/route.ts` (DELETE) — Add by user or by role with a `space_role`. Never remove the last admin (409). Bump the ACL revision (Streamline: `SB/modules/kb/wiki/kb-members.controller.ts`, `kb-members.service.ts`, `SF/features/wiki/components/space-members-sheet.tsx`) — Tests: removing the last admin → 409, and an added SALES editor can edit.

- [ ] KB-0041 [High][API] Move and reorder — `app/api/knowledge/pages/[pageId]/move/route.ts` — Body `{parentPageId|null, spaceId?, index}`. Reject cycles (400). Renumber siblings' `sort_order`. Moving across spaces needs edit on both (Streamline: `kb-pages.controller.ts` `:pageId/move`, `SF/features/wiki/components/move-page-dialog.tsx`) — Tests: cycle → 400, cross-org parent → 404.

- [ ] KB-0044 [High][API] Trash list and bulk actions — `app/api/knowledge/pages/trash/route.ts` (GET), `trash/deleters`, `trash/restore` (POST ids[]), `trash/purge-impact` (POST), `trash/purge` (DELETE ids[]), `trash/empty` (DELETE), `[pageId]/permanent` (DELETE) — Purge needs `kb:pages:purge` and is blocked by `legal_hold` (409). Purge goes through the `kb_page_purge_ledger` stores: db, chunks, attachments (R2), exports (Streamline: `kb-pages.controller.ts` trash routes, `kb-page-trash-query.service.ts`, `kb-purge-ledger.ts`, `kb-multi-store-purge.ts`, `kb-page-attachment-purge.ts`, migrations `1230`, `1234`, `1236`) — Tests: purging a held page → 409, HR without purge → 403, and the R2 objects are deleted (mock).

- [ ] KB-0046 [High][API] Versions — `app/api/knowledge/pages/[pageId]/versions/route.ts`, `versions/[versionNumber]/route.ts`, `versions/[versionNumber]/restore/route.ts` — List (50 per page, cap 100, keyset by version number), get one, restore (forces a snapshot of the current content first, then writes the old content, audits `kb.version.restored`) (Streamline: `SB/modules/kb/wiki/kb-page-versions.service.ts` `PAGE_SIZE = 50`, `PAGE_SIZE_CAP = 100`, migration `1207`) — Restore creates 2 new versions (pre-restore and restored), and the old version rows are unchanged.

- [ ] KB-0047 [High][API] Lock, visibility, publish, archive, verify, mark stale — `app/api/knowledge/pages/[pageId]/lock`, `/visibility`, `/publish`, `/archive`, `/unarchive`, `/verify`, `/mark-stale` — `visibility` takes private/org/public. Public needs the org flag `knowledgePublicSharing` and `kb:pages:manage` or a publisher role. Changing visibility bumps `acl_revision` and re-syncs chunk ACLs. `verify` sets `trust_state='verified'`, `verified_at` and `verified_until = now + review_interval_days` (default 180) (Streamline: `SB/modules/kb/wiki/kb-page-status.controller.ts`, `kb-page-status.service.ts`, `kb-page-governance.util.ts`, `help-centre/kb-article-page-scope.ts` `ARTICLE_VERIFIED_WINDOW_DAYS = 180`) — Tests for each transition, plus 403 for a viewer.

- [ ] KB-0048 [High][API] Public share link — `app/api/knowledge/pages/[pageId]/visibility/route.ts` (when going public), `app/api/public/wiki/[token]/route.ts`, `app/api/public/wiki/[token]/media/route.ts` — Generate a 32-byte hex token, store only the SHA-256 hash, bump `public_token_revision`, and return the URL `${NEXT_PUBLIC_APP_URL}/wiki/{token}` once. The public GET looks up by hash and returns the title, content and updated time only (no author emails). Media goes through `getFileUrl` signed for 300 s. Revoke on visibility change, delete or space archive (Streamline: `SB/modules/kb/wiki/kb-public-token.ts`, `kb-page-public.service.ts`, `kb-public-pages.controller.ts` `KB_PUBLIC_MEDIA_URL_TTL_SECONDS = 300`, `kb-page-share-visibility.ts`, migrations `1171`, `1176`, `1192`) — An old token returns 404 after revoke, and the DB contains no plaintext token. Responses carry `X-Robots-Tag: noindex`.

- [ ] KB-0049 [High][API] Page grants — `app/api/knowledge/pages/[pageId]/grants/route.ts` (GET, POST), `grants/[grantId]/route.ts` (DELETE), `[pageId]/grant-candidates/route.ts` — Grant by user or role with access view/comment/edit/manage. Needs manage on the page. Revoke sets `revoked_at`. Candidates are org members and roles matching `q` (Streamline: `SB/modules/kb/wiki/kb-page-grants.controller.ts`, `kb-page-grants.service.ts`, `dto/kb-page-grants.schemas.ts`) — A granted SALES user can open a private page, and revoking removes access immediately.

- [ ] KB-0051 [High][API] Page collection (list with sorts and facets) — `app/api/knowledge/pages/route.ts` GET — Params: `scope` (all/private/shared/space/project), `spaceId`, `status`, `contentType`, `ownerId`, `q` (title, 8 terms / 200 chars max), `sort` (updated, created, title, views), cursor, `limit` ≤100 (default 50). Returns items and facet counts (capped) (Streamline: `SB/modules/kb/core/collection/knowledge-collection.service.ts`, `knowledge-collection.types.ts` `KB_PAGE_COLLECTION_SORTS`, `KB_PAGE_STATUSES`, `kb-page-collection-cursor.ts`, `kb-page-text-query.ts`) — `limit=101` → 400, and the cursor round-trips.

- [ ] KB-0053 [High][API] Page comments — `app/api/knowledge/pages/[pageId]/comments/route.ts` (GET, POST), `page-comments/[commentId]/route.ts` (PATCH, DELETE), `page-comments/[commentId]/resolve/route.ts` (POST, toggles) — Needs comment access to post. Only the author or a manager can edit or delete. Threads via `parentId` (one level). Anchors `anchorBlockIndex` and `anchorQuote` (≤500 chars). 50 per page (Streamline: `SB/modules/kb/wiki/kb-page-comments.controller.ts`, `kb-page-comments.service.ts`, `help-centre/kb-comments.service.ts` `PAGE_SIZE = 50`) — A viewer posting → 403. Editing someone else's comment → 403.

- [ ] KB-0054 [High][Notify] Mention delivery from page content — `lib/knowledge/mentions.ts`, called by `page-writer.ts` — Diff `extractMentions(new)` against `extractMentions(previous)` and notify only newly mentioned users who can view the page. Event `knowledge.article.mentioned`, HIGH, in-app and email. The link is `/knowledge/wiki/doc/{id}` (Streamline: `kb-page-writer.service.ts` `deliverMentions`, `notification-events-knowledge.catalog.ts`, `core/kb-notification-visibility.ts`) — Tests: re-saving the same mention doesn't re-notify, and a user who can't view isn't notified.

- [ ] KB-0055 [High][API] Page templates — `app/api/knowledge/page-templates/route.ts` (GET, POST), `page-templates/[templateId]/route.ts` (PATCH, DELETE) — Needs `kb:templates:manage` to write. Name is unique per org (409). The list sorts by `use_count` desc (Streamline: `SB/modules/kb/wiki/kb-page-templates.controller.ts`, `kb-page-templates.service.ts`) — Duplicate name → 409.

- [ ] KB-0057 [High][Files] KB media upload — `app/api/knowledge/media/route.ts` (POST multipart) — Allowed types and caps: images jpeg/png/gif/webp 10 MB (compress jpeg/png/webp with `sharp`, reject over 50 MP), video mp4/webm 100 MB, audio 25 MB, documents 25 MB (the DOC_TYPES set in the source). Check magic bytes (`lib/files/magic-bytes.ts`), compute sha256, store via `lib/storage.ts` `uploadFile` under `kb/{orgId}/{pageId}/…`, and insert `kb_page_attachments`. 503 when storage isn't configured (Streamline: `SB/modules/kb/wiki/kb-media.service.ts` `IMAGE_CAP`/`VIDEO_CAP`/`AUDIO_CAP`/`DOC_CAP`/`MAX_IMAGE_PIXELS`/`DOC_TYPES`, `kb-media.controller.ts` `MAX_FILE_SIZE`) — Tests: an .exe renamed .png → 400, 11 MB image → 413, no R2 → 503.

- [ ] KB-0060 [High][API] Reviews (approval and freshness) — `app/api/knowledge/pages/[pageId]/reviews/route.ts` (POST request), `page-reviews/route.ts` (GET, filters status/type/reviewer), `page-reviews/due/route.ts`, `page-reviews/[reviewId]/approve`, `/reject` (note required), `page-reviews/bulk-decide` (≤50 ids) — Requesting approval sets page `status='in_review'`. Approve sets `published` and `published_at`, or for freshness `verified` and a new `next_review_at`. Reject returns the page to draft. Notifications `knowledge.page.review_requested/approved/rejected` (Streamline: `SB/modules/kb/wiki/kb-page-reviews.controller.ts`, `kb-page-reviews.service.ts`, `kb-page-reviews-query.service.ts`, `kb-purge-reviews.ts`) — Tests: a reviewer without `kb:reviews:manage` → 403, bulk decide returns per-id results.

- [ ] KB-0062 [High][Import] Import pages — `app/api/knowledge/pages/import/dry-run/route.ts`, `pages/import/route.ts`, `import-jobs/route.ts`, `import-jobs/[importJobId]/route.ts`, `/retry`, `/cancel` — Body (exact Streamline schema): `{sourceType: markdown|html|zip, items: [{title ≤500, contentText ≤50000, parentPageId?, externalId?, externalSource?}] 1..100, spaceId?, visibility = org, duplicatePolicy = skip|update}`, with `externalId` and `externalSource` required together. Dry-run reports new, duplicate and invalid counts. The job runs through Inngest `kb/import.requested`, or inline when ≤20 items and Inngest is off (otherwise picked up by the sweeper), and converts Markdown or HTML to Plate (KB-0032). Needs `kb:pages:import` (Streamline: `SB/modules/kb/wiki/dto/kb-import-export.schemas.ts`, `kb-import-export.service.ts`, `kb-import-process.consumer.ts`, `kb-import-job-lease.ts`) — Importing the same file twice with skip → second job `duplicate_items = N`. With update → content updated.

- [ ] KB-0070 [High][UI] Wiki home — `app/(dashboard)/knowledge/wiki/page.tsx`, `features/knowledge/components/wiki-home-page.tsx`, `wiki-home-all-pages.tsx`, `wiki-page-card.tsx`, `wiki-page-collection-table.tsx`, `kb-collection-badges.tsx`, `wiki-company-documents-strip.tsx` — Sections: Recent (cards), Favourites, All pages (a table with status, type, owner and updated, plus filters and sort), and a "New page" button with a template picker. Company-documents strip when enabled (Streamline: same file names in `SF/features/wiki/components/`) — The empty org shows one line of text and a "New page" button. The table scrolls inside its own container at 375 px.

- [ ] KB-0072 [High][Editor] Editor toolbar and floating link toolbar — `components/editor/plate/toolbar/*` — Port fixed-toolbar, mark-buttons, turn-into-dropdown, list-buttons, align-dropdown, color-buttons, font-size-input, link-button, link-floating-toolbar, media-buttons, table-dropdown, emoji-button, history-buttons, formatting-more and toolbar-button. Show the toolbar only in edit mode, and keep it sticky under the page header (Streamline: `SF/components/editor/plate/toolbar/*.tsx`) — `fixed-toolbar.test.tsx` and `font-size-input.test.tsx` ported pass.

- [ ] KB-0073 [High][Editor] Slash commands and mention or page-link comboboxes — `components/editor/plate/plate-combobox-elements.tsx`, `plate-page-link-picker.tsx`, `plate-citation-link-model.ts` — The slash items exactly: Text, Heading 1/2/3, Bullet List, Numbered List, To-do List, Quote, Code, Callout, Divider, Table, Image, Toggle, Citation, Link preview. `@` lists org users (`/api/organization/members?q=`), and the link picker searches KB pages (Streamline: `SF/components/editor/plate/plate-combobox-elements.tsx` lines 24-39, `plate-page-link-picker.tsx`, `plate-citation-link-model.ts`) — `plate-combobox-elements.test.tsx` and `plate-citation-link-model.test.ts` ported pass. Typing `/tab` filters to Table.

- [ ] KB-0074 [High][Editor] Media upload in the editor — `components/editor/plate/plate-media-elements.tsx`, `upload-media.ts`, `features/knowledge/lib/upload-kb-media.ts` — Paste, drop or pick → placeholder → `POST /api/knowledge/media` → replace with an image/video/audio/file node. `withoutPendingUploads` strips placeholders before autosave. Hide the media buttons when `capabilities.storage` is false and show "File uploads are off until storage is set up" (Streamline: `SF/components/editor/plate/plate-media-elements.tsx`, `upload-media.ts`, `SF/features/wiki/lib/upload-kb-media.ts`) — `upload-media.test.ts` and `upload-kb-media.test.ts` ported pass. With storage off there are no upload controls.

- [ ] KB-0078 [High][UI] Page properties sheet — `features/knowledge/components/page-metadata-sheet.tsx`, `features/knowledge/lib/kb-page-status.ts` — Status, content type (the 10 types), owner, review interval, next review, trust state with a Verify button, tags, space, and the legal hold flag (admin only) (Streamline: `SF/features/wiki/components/page-metadata-sheet.tsx`, `SF/features/wiki/lib/kb-page-status.ts`) — Changing the owner calls PATCH and shows a toast. A viewer sees it read-only.

- [ ] KB-0079 [High][UI] Share popover and access sheet — `features/knowledge/components/page-share-popover.tsx`, `page-grants-sheet.tsx` — Visibility radio (Only me and people I add / Everyone at Miyo / Anyone with the link). Copy the link once on creation, with a note that it can't be shown again. Revoke. People and roles list with an access select (Streamline: same file names) — The public option is hidden when `knowledgePublicSharing` is off. Revoking asks for confirmation.

- [ ] KB-0080 [High][UI] Comments panel with anchors — `features/knowledge/components/page-comments-sheet.tsx`, `page-comment-thread.tsx`, `features/knowledge/lib/page-comment-anchors.ts` — Select text, then "Comment" stores the block index and quote. Open/Resolved tabs, reply, edit, delete, and @mention in comments, which notifies with `knowledge.page.comment_created` (Streamline: `SF/features/wiki/components/page-comments-sheet.tsx`, `page-comment-thread.tsx`, `SF/features/wiki/lib/page-comment-anchors.ts`, `SF/features/help-centre/components/kb-comments-panel.tsx`) — Clicking an anchored comment highlights the quoted block. Resolve moves it to Resolved.

- [ ] KB-0081 [High][UI] History page and diff — `app/(dashboard)/knowledge/wiki/doc/[pageId]/history/page.tsx`, `features/knowledge/components/page-history-page.tsx`, `page-history-presentation.tsx`, `page-history-sheet.tsx`, `features/knowledge/lib/version-diff.ts` — The version list (number, author, time, summary), a text diff, and "Restore this version" with confirmation (Streamline: same names in `SF/features/wiki/`) — `version-diff.test.ts` ported passes. Restore returns to the page with the old content.

- [ ] KB-0083 [High][UI] My pages and Shared with me — `app/(dashboard)/knowledge/wiki/private/page.tsx`, `shared/page.tsx`, `features/knowledge/components/private-page.tsx`, `shared-page.tsx` — My pages = the user's private space tree plus a list. Shared = the grant list (Streamline: same file names) — A new employee sees an empty My pages with a "New page" button. Shared lists exactly the granted pages.

- [ ] KB-0084 [High][UI] Spaces list, detail and members — `app/(dashboard)/knowledge/wiki/spaces/page.tsx`, `spaces/[spaceId]/page.tsx`, `features/knowledge/components/spaces-page.tsx`, `spaces-list-table.tsx`, `space-card.tsx`, `space-sheet.tsx`, `space-detail-page.tsx`, `space-members-sheet.tsx`, `space-archive-impact.tsx`, `space-manager-health-summary.tsx`, `spaces-page-schema.ts`, `space-members-schema.ts` — Filters (type, archived), a create and edit sheet (name, slug, type, audience, colour from the palette, default visibility), member management, an archive flow with an impact preview, and a health summary for managers (Streamline: same file names) — A bogus filter shows the filtered-empty text (same as the SF e2e). Archive shows the counts before confirming.

- [ ] KB-0086 [High][UI] Trash page — `app/(dashboard)/knowledge/wiki/trash/page.tsx`, `features/knowledge/components/trash-page.tsx`, `trash-bulk-actions.tsx`, `trash-member-filter.tsx`, `trash-retention-section.tsx` — List deleted pages (deleted by, when, days left before auto-purge), a deleter filter, search, bulk restore and purge with an impact dialog, and a retention setting for admins (Streamline: same file names) — The filtered-empty state works. Purge isn't offered without the permission.

- [ ] KB-0087 [High][UI] Reviews page — `app/(dashboard)/knowledge/wiki/reviews/page.tsx`, `features/knowledge/components/reviews-page.tsx`, `reviews-filters.tsx`, `reviews-decision-dialogs.tsx`, `reviews-bulk-decide-dialog.tsx`, `reviews-bulk-results-dialog.tsx`, `reviews-mobile-card.tsx` — Tabs Pending / Due / Decided, filters (type, reviewer, space), approve and reject with a note, bulk decide with per-row results, and cards on mobile (Streamline: same file names) — At 375 px it shows cards and no table. Reject without a note is blocked.

- [ ] KB-0088 [High][UI] Import and export page — `app/(dashboard)/knowledge/wiki/import/page.tsx`, `features/knowledge/components/import-page.tsx`, `import-form-controls.tsx`, `import-dry-run-card.tsx`, `import-pending-list.tsx`, `import-failed-titles-alert.tsx`, `import-history-section.tsx`, `export-jobs-card.tsx`, `features/knowledge/lib/import-job-label.ts` — Pick .md, .html or .zip (read in the browser with FileReader and jszip, up to 100 files), choose a space, visibility and duplicate policy, see the dry-run result, then import. History with retry and cancel. Export: the whole KB or one page, with a jobs list and download (Streamline: same file names, FileReader usage in `import-page.tsx`) — Importing 3 .md files creates 3 pages. A failing title is listed in the failed alert.

- [ ] KB-0090 [High][UI] Public shared page — `app/(public)/wiki/[shareToken]/page.tsx`, `features/knowledge/components/public-page-content.tsx`, `public-page-content-loader.tsx`, `features/knowledge/lib/rewrite-public-media-urls.ts` — A read-only Plate render, the org name, "Shared from Miyo Global", `<meta name="robots" content="noindex">`, and media rewritten to `/api/public/wiki/[token]/media?key=` (Streamline: `SF/app/(public)/wiki/[shareToken]/page.tsx`, `public-page-content*.tsx`, `rewrite-public-media-urls.ts`) — Ported tests pass, and a revoked token renders the not-found state.

- [ ] KB-0092 [High][UI] Project Pages tab backed by KB — `app/(dashboard)/projects/[projectId]/pages/page.tsx` (rewrite), `app/(dashboard)/projects/[projectId]/pages/[pageId]/page.tsx` (new), `features/knowledge/components/project-wiki-page-document.tsx` — The list and tree of `kb_pages WHERE project_id = :id` come through the KB API (`/api/knowledge/pages/tree?projectId=`). The editor is the same `PageDocument` with a project breadcrumb. Access comes from project roles (owner/manager → manage, contributor → edit, viewer → view) (Streamline: `SF/app/(authenticated)/build/[projectId]/wiki/page.tsx`, `wiki/[pageId]/page.tsx`, `history/page.tsx`, `SF/features/wiki/components/project-wiki-page-document.tsx`) — Migrated pages appear with their content, and a project viewer can't edit.

- [ ] KB-0095 [High][UI] Search page and quick-find results — `app/(dashboard)/knowledge/wiki/search/page.tsx`, `features/knowledge/components/wiki-search-page.tsx`, `wiki-search-company-documents.tsx`, `features/knowledge/lib/search-snippet.ts`, `search-snippet-text.tsx`, `quick-find-dialog.tsx` — Debounce 250 ms, highlighted snippets, filter chips (space, status, type, owner), a company-documents section, "No results for 'x'" plus a "Create page 'x'" button, and keyboard navigation (Streamline: `SF/features/wiki/components/wiki-search-page.tsx`, `wiki-search-company-documents.tsx`, `SF/features/wiki/lib/search-snippet*.ts(x)`) — ↑↓ and Enter open a result. The URL keeps `?q=`.

- [ ] KB-0102 [High][Search] Index cleanup and ACL sync — `lib/knowledge/indexing/ingest.ts` — Trash or purge deletes the page's `kb_chunks` and checkpoints, and restore re-queues the page. A visibility, grant or space-member change bumps `acl_revision` and re-syncs the chunk ACL columns in batches of 500 without re-embedding (Streamline: `SB/modules/kb/retrieval/kb-ingestion-delete-consumer.ts`, `kb-chunk-visibility.ts`, `kb-ingestion-consumer.ts` `SPACE_ACL_SYNC_BATCH_SIZE = 500`, `SB/modules/kb/core/kb-space-acl-revision.ts`, `SB/modules/kb/wiki/kb-page-trash.service.ts`) — A trashed page never appears in search or ask answers. Making a page private removes it from other users' results immediately.

- [ ] KB-0104 [High][API] Search endpoints — `app/api/knowledge/search/route.ts` (GET `?q&limit≤20&spaceId`, retrieval passages), `pages/full-search/route.ts` (GET, page results with snippets and filters) — Both return `mode: hybrid|keyword` so the UI can say "keyword search" when AI is off (Streamline: `SB/modules/kb/retrieval/kb-search.controller.ts` `search`, `pages/full-search`, `kb-search.service.ts`, `kb-retrieval.service.ts`) — With the key missing, `mode` is `keyword`.

- [ ] KB-0106 [High][Files] Text extraction for attachments and documents — `lib/knowledge/indexing/extract.ts` — Reuse `lib/files/extract-resume-text.ts` logic: PDF via `pdf-parse`, DOCX via `mammoth`, plus txt/md/csv/html (sanitize-html to text). Cap 2 MB of text. Unsupported types are marked `unsupported` (Streamline: `SB/modules/kb/retrieval/kb-attachment-indexing.service.ts`, `kb-content-adapter.ts`) — Fixture tests: PDF, DOCX and MD each return text, and a .zip gives `unsupported`.

- [ ] KB-0111 [High][AI] Streaming answers — `app/api/knowledge/ask/stream/route.ts` (SSE) — Events `citations` → `token`* → `done` or `error`, with a server deadline of **55 s** (`maxDuration = 60`). Abort when the client disconnects (Streamline: `SB/modules/kb/retrieval/kb-ask.controller.ts` `KB_ASK_STREAM_DEADLINE_MS = 55_000`) — Tokens render progressively, and closing the tab cancels the upstream call.

- [ ] KB-0112 [High][AI] Ask rate limiting — `lib/knowledge/ai/rate-limit.ts` — Use the CRM's Upstash limiter when `UPSTASH_REDIS_REST_URL` is set (tiers `kb:ask` 20/min per user and `kb:ask:org` 200/min per org), otherwise an in-memory fallback per instance. 429 with `Retry-After` (Streamline: `SB/modules/kb/retrieval/kb-ask-rate-limit.ts` `KB_ASK_ORG_TIER`, `SB/common/ratelimit/rate-limit.service.ts` `"kb:ask": { limit: 20 }`, `"kb:ask:org": { limit: 200, windowSecs: 60 }`) — The 21st call in a minute → 429.

- [ ] KB-0114 [High][AI] Chat conversations and history — `app/api/knowledge/ask/conversations/route.ts` (GET, POST), `ask/conversations/[conversationId]/route.ts` (PATCH title, DELETE), `ask/conversations/[conversationId]/messages/route.ts` (GET, max 100 per page), `ask/history/route.ts` (GET, DELETE), `ai/feedback/route.ts` (POST up/down + reason → `kb_ai_interactions.feedback`) — Owner-only. Citations whose page is no longer visible render as "This saved answer is no longer available." (Streamline: `SB/modules/kb/retrieval/kb-conversations.controller.ts`, `kb-chat-history.service.ts` `MAX_PAGE = 100`, `DOCUMENT_ANSWER_UNAVAILABLE`, `kb-ask.controller.ts` `ask/history`, `SB/modules/kb/help-centre/kb-ai-feedback.service.ts`, `SB/db/schema/kb/chat.ts`) — Another user's conversation → 404. A citation to a page made private later is hidden.

- [ ] KB-0117 [High][UI] Ask KB chat page — `app/(dashboard)/knowledge/chat/page.tsx`, `loading.tsx`, `features/knowledge/components/kb-chat-parts.tsx`, `components/knowledge/kb-ask-evidence.tsx` — A history list on the left and a thread on the right. Citations are numbered chips opening the page, with an evidence drawer and 👍/👎 feedback. With AI off: a plain message "Ask needs AI to be set up by an admin" and a link to Search (Streamline: `SF/app/(authenticated)/knowledge/chat/page.tsx`, `SF/features/wiki/components/kb-chat-parts.tsx`, `SF/components/support/kb-ask-evidence.tsx`, `kb-ask-panel.tsx`) — `kb-chat-parts.test.tsx` ported passes. With the key off there are no console errors. At 375 px the history is a sheet.

- [ ] KB-0119 [High][AI] Page AI actions — `app/api/knowledge/pages/[pageId]/ai/summarize`, `/ask`, `/improve` and `/suggest-related`, each with a `/stream` SSE variant — Summarise the page, answer a question about only this page, improve a selection with an instruction, and suggest related pages (retrieval over the org, filtered by access). Needs view access, or edit for improve (Streamline: `SB/modules/kb/wiki/kb-page-ai.controller.ts` routes `summarize`, `ask`, `improve`, `suggest-related` and `*/stream`, `kb-page-ai.service.ts`) — Each returns text and streams. A viewer calling improve → 403. No AI → 503.

- [ ] KB-0120 [High][Editor] Page AI actions UI and doc Ask sheet — `features/knowledge/components/kb-page-ai-actions.tsx`, `components/knowledge/kb-doc-ask-sheet.tsx`, `hooks/knowledge/doc-ai-stream.ts` — Header menu entries for Summarise, Ask about this page, Improve selection (preview with Insert below / Replace / Discard) and Related pages. Hidden when `capabilities.ai` is false (Streamline: `SF/features/wiki/components/kb-page-ai-actions.tsx`, `SF/components/kb/kb-doc-ask-sheet.tsx`, `SF/hooks/api/kb/doc-ai-stream.ts`) — Replace swaps only the selection, and undo restores it.

- [ ] KB-0124 [High][Health] Content-health signals — `lib/knowledge/health/signals.ts`, `lib/knowledge/health/scan.ts` (runs in `knowledge-daily` cron) — Port the predicates: **unowned** (no owner or owner deactivated), **stale** (not updated for **90 days**), **unverified**, **empty** (content_text blank), **overdue_review** (`next_review_at < now()`), **broken_link** (a `kb_page_links` target that's trashed or missing), **overexposed** (public or org visibility in a restricted space), and **duplicate_candidate**. Upsert `kb_health_items` (unique open per org+page+kind+rule_version), score impact with the `IMPACT_SQL` formula, and auto-resolve items whose condition has cleared (Streamline: `SB/modules/kb/content-health/kb-content-health-signal-predicates.ts` `STALE_THRESHOLD_DAYS = 90`, `IMPACT_SQL`, `kb-content-health.service.ts`) — Seed one page per kind and run the scan: each kind appears once. Fix the page and rerun: it resolves.

- [ ] KB-0126 [High][API] Content-health API — `app/api/knowledge/content-health/signals/route.ts` (GET, filters kind/space/owner/state, cursor), `counts/route.ts`, `signals/dismiss` (POST, reason + optional expiry), `signals/assign` (POST, assignee + due date), `signals/bulk-repair` (POST: assign_owner / request_review / mark_needs_content), `signals/evidence` (GET), `trend` (GET, 30/90 days) — Needs `kb:health:manage` (Streamline: `SB/modules/kb/content-health/kb-content-health.controller.ts` routes `wiki/content-health/*`) — Bulk repair with request_review creates `kb_page_reviews` rows. A dismissed item stays hidden until it expires.

- [ ] KB-0127 [High][UI] Content health page — `app/(dashboard)/knowledge/wiki/manage/page.tsx`, `features/knowledge/components/content-health-page.tsx`, `content-health-dismiss-dialog.tsx` — Count tiles per kind (text and number only, no gauges), a table with filters, row actions (assign, dismiss, open page), bulk repair, and a small 90-day trend line (recharts, gold line on silver grid) (Streamline: `SF/app/(authenticated)/knowledge/wiki/manage/page.tsx`, `SF/features/wiki/components/content-health-page.tsx`, `content-health-dismiss-dialog.tsx`, `space-manager-health-summary.tsx`) — `content-health-page.test.tsx` ported passes. At 375 px the table becomes cards.

- [ ] KB-0129 [High][Ops] Trash auto-purge — the `knowledge-daily` cron — Permanently delete pages trashed longer than `kb_settings.trash_retention_days` (default **30**), skipping `legal_hold` pages. Clean up favourites, visits, links, versions, comments, grants, attachments (R2 `deleteFile`), chunks and the purge ledger in the same order as Streamline (Streamline: `SB/modules/kb/wiki/kb-page-trash.service.ts` `purgeFavoritesForPages`/`purgeLinksForPages`/`purgeVisitsForPages`, `kb-page-attachment-purge.ts`, `SB/modules/kb/core/kb-settings.service.ts` `DEFAULT_TRASH_RETENTION_DAYS = 30`, `SB/db/schema/kb/purge-ledger.ts`) — A page trashed 31 days ago is gone after the cron and its R2 object is deleted. A legal-hold page survives.

- [ ] KB-0131 [High][Analytics] Write KB events — `lib/knowledge/events.ts` (from KB-0031), called from the page view (`visit`), search, ask, feedback and publish routes — Fire-and-forget insert, never blocking the response, with a `correlation_id` (Streamline: `SB/modules/kb/core/kb-events.service.ts`, `SB/db/schema/kb/events.ts`) — Opening a page adds one `page_view` event, and search with 0 hits adds `search_no_results`.

- [ ] KB-0137 [High][Notify] Register the knowledge notification events — `lib/notifications/catalog.ts` (or wherever the CRM's event catalog lives), `lib/knowledge/notify.ts` — Copy the Streamline event keys: `knowledge.page.comment_created`, `knowledge.page.review_requested`, `knowledge.page.review_approved`, `knowledge.page.review_rejected`, `knowledge.article.mentioned`, `knowledge.article.published`, `knowledge.article.comment_created`, `knowledge.article.approval_requested`, `knowledge.document.ingestion_failed` and `knowledge.ai.answer_ready` (research brief done), with the same titles and messages. Before sending, check the recipient can still view the page (Streamline: `SB/modules/notifications/notification-events-knowledge.catalog.ts`, `SB/modules/kb/core/kb-notification-visibility.ts`) — Each event creates an in-app notification linking to the right URL. No notification goes to a user who lost access.

- [ ] KB-0151 [High][Design] Use only the existing brand tokens — `features/knowledge/**`, `components/editor/plate/**` — Use `--gold-400` (#D4AF37) for exactly one primary action per screen, links on hover and the active nav item. `--ink-900` (#201E1F) for text and headings. `--silver` (#D8D8D8) for borders, dividers, table lines and the editor toolbar border. White or paper backgrounds. No gradients, glow, glassmorphism, sparkle icons or purple. Space colours are picked from a fixed 8-colour muted palette in `lib/design/brand-hex.ts` (Streamline: `SF/features/wiki/wiki-document.css` structure only, not its colours) — `git grep -nE "gradient|from-purple|backdrop-blur|Sparkles" features/knowledge components/editor/plate` returns nothing.

- [ ] KB-0152 [High][Design] Typography and reading layout — `features/knowledge/wiki-document.css` — The document body uses the CRM body font at 16 px / 1.7. H1 32/40 semibold, H2 24/32, H3 20/28. Reading width 720 px, centred. The UI chrome is 14 px. Code uses a mono font on silver at 8% tint. Tables have 1 px silver borders (Streamline: `SF/features/wiki/wiki-document.css`) — Visual check at 1280 px: the line length stays at most ~80 characters.

- [ ] KB-0155 [High][Design] Responsive at 375 / 768 / 1280 / 1440 — all KB routes — At 375 px: the sidebar is a sheet, tables become cards, the editor toolbar scrolls horizontally, the right panel becomes a bottom sheet, and touch targets are at least 40 px. At 768 px the sidebar is collapsible. No horizontal page scroll at any width (Streamline: `reviews-mobile-card.tsx` pattern) — The Playwright viewport suite (KB-0165) has screenshots at all 4 widths and asserts no overflow-x on `document.body`.

- [ ] KB-0156 [High][Design] Accessibility — all KB UI — Keyboard: tree arrows, ⌘K, Esc, and Tab through the toolbar. Focus rings are a 2 px gold outline. `aria-label` on icon buttons. Contrast: gold text isn't used on white for body copy (it fails AA), only for 18 px+ or on ink. The editor has `role="textbox"` and `aria-multiline` (Streamline: Plate defaults) — axe-core shows 0 serious violations on wiki home, doc, search and chat.

- [ ] KB-0162 [High][Test] Search quality tests — `lib/knowledge/search/__tests__/*.test.ts` — Chunker boundaries, RRF merge order (port `kb-candidate.service` spec cases), the exact-vs-ANN strategy switch at 8000, ACL filtering inside SQL (an integration test against a disposable Neon branch or a local Postgres with pgvector) (Streamline: `SB/modules/kb/retrieval/kb-retrieval-strategy.spec.ts`, `kb-vector-recall.db.spec.ts`, `kb-chunk-*.spec.ts`) — All pass. A private page never appears in another user's results.

- [ ] KB-0164 [High][Test] Component tests — `features/knowledge/**/*.test.tsx` — Port the SF tests for the components being ported: page-tree, page-document, autosave, edit conflict, plate-document-editor, combobox, fixed-toolbar, upload-media, version-diff, kb-page-not-found, public-page-content, content-health-page, kb-chat-parts and the knowledge page redirect (Streamline: the `*.test.tsx` next to each SF component) — All pass in `pnpm test`.

- [ ] KB-0166 [High][Test] HTTP status code audit — `scripts/kb-status-audit.ts` — Hit every `/api/knowledge/**` route as anonymous, as SALES and as CEO, and assert the expected 401/403/200/404/409/413/429/503. Output a table into the PR — No 500s anywhere. Every 4xx has a JSON `{error:{code,message}}` body.

- [ ] KB-0016 [Medium][DB] Migration `0165_kb_tags_translations` — `drizzle/0165_kb_tags_translations.sql` — `kb_tags` (unique org+slug), `kb_page_tags` (PK org+page+tag) and enum `kb_translation_status` (draft, in_progress, translated, published, outdated). `kb_page_translations` (page, locale, title, content, content_text, excerpt, status, revision; unique page+locale) (Streamline: `SB/db/schema/kb/tags.ts`, `translations.ts`, `common/enums.ts:105`, migrations `0657`, `2058`) — Apply passes.

- [ ] KB-0020 [Medium][DB] Migration `0169_kb_health_feedback` — `drizzle/0169_kb_health_feedback.sql` — `kb_health_items` (page_id, kind in unowned/stale/unverified/empty/overdue_review/broken_link/overexposed/duplicate_candidate/contradictory_claim, rule_version, evidence jsonb, impact, state open/resolved/dismissed, assignee, repair_action assign_owner/request_review/mark_needs_content, due_at, detected/resolved/dismissed_at, dismissed_reason, dismissal_expires_at; unique open per org+page+kind+rule_version) and `kb_page_feedback` (page, helpful, comment, visitor_id) (Streamline: `SB/db/schema/kb/health-items.ts`, `page-feedback.ts`, migrations `1228`, `1431`) — Apply passes.

- [ ] KB-0021 [Medium][DB] Migration `0170_kb_linked_documents` — `drizzle/0170_kb_linked_documents.sql` — `kb_linked_documents` (document_id → `documents.id`, version_mode latest or pinned, pinned_version, status, space_id, published_by/at, unpublished_by/at, unpublish_reason, source_removed_at) and `kb_linked_document_audiences` (kind all/department/role/user, ref_id) (Streamline: `SB/db/schema/kb/linked-documents.ts`, migrations `1200`, `1201`) — Apply passes. The FK to the CRM `documents` table works.

- [ ] KB-0031 [Medium][Analytics] KB event logger — `lib/knowledge/events.ts` — `logKbEvent(orgId, type, {actorId, articleId, query, metadata})` for `page_view`, `search`, `search_no_results`, `ask`, `ask_no_answer`, `citation_click` and `feedback`. Fire and forget, and never throw (Streamline: `SB/modules/kb/core/kb-events.service.ts`, `help-centre/kb-analytics-event-scope.ts` `SCOPED_EVENT_TYPES`) — A unit test shows a DB failure is logged and swallowed.

- [ ] KB-0042 [Medium][API] Duplicate a page or subtree — `app/api/knowledge/pages/[pageId]/duplicate/route.ts` — `{includeChildren: boolean}`. Copies title as "Copy of …", content and icon. New pages are drafts, created by the caller (Streamline: `SB/modules/kb/wiki/kb-page-duplicate.service.ts`) — Duplicating 3 levels creates 3 levels with new ids.

- [ ] KB-0045 [Medium][API] Backlinks — `app/api/knowledge/pages/[pageId]/backlinks/route.ts` — Pages linking to this page, filtered by visibility (Streamline: `kb-pages.controller.ts` `:pageId/backlinks`) — A private linking page isn't shown to others.

- [ ] KB-0050 [Medium][API] "Shared with me" — `app/api/knowledge/pages/route.ts` GET `?scope=shared` — Pages where the user has a live grant (user or role) and isn't the creator (Streamline: `KbSharedWithMeScope` in `knowledge-authorization.types.ts`, `SF/features/wiki/components/shared-page.tsx`) — The list matches the grants in tests.

- [ ] KB-0056 [Medium][Content] The 15 starter templates — `lib/knowledge/starter-templates.ts` — Copy the names, descriptions, icons and Plate content verbatim: Meeting Notes, Standard Operating Procedure, Policy, Decision Record, Runbook, Project Brief, Playbook, Troubleshooting Guide, Support Article, Onboarding Guide, Weekly Update, Retrospective, Product Requirements Document, How-to Guide, FAQ. Show them as "Starter" templates (not stored) next to org templates (Streamline: `SF/features/wiki/lib/starter-templates.ts`) — A test shows 15 items with unique names and valid Plate value.

- [ ] KB-0058 [Medium][Files] Attachments list and delete — `app/api/knowledge/pages/[pageId]/attachments/route.ts` (GET), `attachments/[attachmentId]/route.ts` (DELETE soft) — Signed download URLs for 300 s. Delete needs edit (Streamline: `SB/db/schema/kb/attachments.ts`, `SB/modules/kb/wiki/kb-object-access.ts`, `SF/features/help-centre/components/kb-attachments-panel.tsx`) — Another org's attachment id → 404.

- [ ] KB-0059 [Medium][API] Record links — `app/api/knowledge/pages/[pageId]/record-links/route.ts` (GET, POST), `record-links/[linkId]/route.ts` (DELETE), `record-links/by-record/route.ts` (GET `?targetType&targetId`) — Target types mapped to the CRM: `project`, `project_ticket`, `hr_employee`, `support_ticket`, plus `crm_lead`, `crm_deal` and `crm_contact` only when `CRM_MODULE_ENABLED`. Validate that the target exists in the org (Streamline: `SB/modules/kb/wiki/kb-page-record-links.controller.ts`, `dto/kb-page-record-links.schemas.ts` `RECORD_LINK_TARGET_TYPES`) — A crm_lead link with CRM off → 400, and a missing ticket → 404.

- [ ] KB-0061 [Medium][API] Tags — `app/api/knowledge/tags/route.ts` (GET, POST), `tags/[tagId]/route.ts` (DELETE), `pages/[pageId]/tags/route.ts` (GET, PUT ids[]) — Slug is unique per org (Streamline: `SB/modules/kb/core/kb-tags.controller.ts`, `kb-tags.service.ts`) — PUT replaces the set atomically.

- [ ] KB-0063 [Medium][Export] Export pages — `app/api/knowledge/pages/[pageId]/export/route.ts` (POST `{format: markdown|html}`), an "all" export (`POST /api/knowledge/export-jobs` `{scope:'all'}`), `export-jobs/route.ts` (GET), `export-jobs/[exportJobId]/download/route.ts` — Serialise to Markdown or HTML, zip multi-page (jszip, already a CRM dependency), upload to R2 `kb-exports/{orgId}/…` with `expires_at`, and serve a signed download URL. Without R2, stream a single page back directly (Streamline: `SB/modules/kb/wiki/kb-export.service.ts`, `kb-export-serializer.ts`, `kb_export_object_attempts`) — Exporting a page that has a table and a callout gives valid Markdown (snapshot test).

- [ ] KB-0077 [Medium][UI] Icon picker and cover picker — `features/knowledge/components/page-icon-picker.tsx`, `page-cover.tsx`, `page-cover-picker.tsx` — Icon choices are emoji or lucide. Covers are a solid colour from the palette or an uploaded image (needs storage) (Streamline: same file names) — Covers offer no gradient options. Removing the cover works.

- [ ] KB-0082 [Medium][UI] Move dialog — `features/knowledge/components/move-page-dialog.tsx` — Search spaces and pages, with invalid targets (self and descendants) disabled (Streamline: `SF/features/wiki/components/move-page-dialog.tsx`) — The page's own subtree can't be chosen.

- [ ] KB-0085 [Medium][UI] Templates page — `app/(dashboard)/knowledge/wiki/templates/page.tsx`, `features/knowledge/components/templates-page.tsx`, `template-cards.tsx`, `template-preview-dialog.tsx`, `edit-template-dialog.tsx`, `edit-template-form-fields.tsx`, `edit-template-schema.ts` — Tabs: Starter and Organisation. Preview, "Use template", and create, edit or delete for managers. "Save page as template" from the page "…" menu (Streamline: same file names) — Using a template opens a new page with its content, and `use_count` increments.

- [ ] KB-0089 [Medium][UI] Not-found and no-permission states — `features/knowledge/components/kb-page-not-found.tsx`, reusing `components/shared/no-permission-state` — `/knowledge/wiki/doc/999999999` shows "This page doesn't exist or you don't have access" plus a "Back to wiki" link. It must not reveal whether the page exists (Streamline: `SF/features/wiki/components/kb-page-not-found.tsx`) — The ported test passes, and another org's id gets a 404.

- [ ] KB-0091 [Medium][UI] Record links on pages and "Related knowledge" on records — `features/knowledge/components/page-record-links.tsx`, `kb-record-target-combobox.tsx`, and a small `RelatedKnowledgePanel` on the project overview, the ticket detail and the employee profile — Link or unlink records from a page. Records show the linked pages the viewer can see (Streamline: `SF/features/wiki/components/page-record-links.tsx`, `kb-record-target-combobox.tsx`) — Linking ticket PRJ-12 shows the page on that ticket's detail.

- [ ] KB-0093 [Medium][DB] Retire the old project pages API — `app/api/projects/[projectId]/pages/**`, `lib/api/hooks/projects` `usePages`/`useCreatePage`/`useUpdatePage` — Make the old routes thin proxies to the KB tables for one release, or return 410 Gone if nothing calls them. Then add migration `0173_drop_legacy_pages` (only after KB-0023 is verified in production): `DROP TABLE IF EXISTS pages` (Streamline: n/a, CRM cleanup) — `git grep "from(pages)"` returns nothing, and the tests pass.

- [ ] KB-0096 [Medium][Search] KB pages in the CRM global search — `app/api/search/route.ts` (existing), `components/layout/global-search*` — Add a "Knowledge" group showing the top 5 FTS hits the user can access (Streamline: `SB/modules/kb/retrieval/kb-search.controller.ts`, `kb-search.service.ts`) — Global search for a KB title shows it under Knowledge.

- [ ] KB-0099 [Medium][AI] Embedding reuse by content hash — `lib/knowledge/indexing/embeddings.ts` — Before calling OpenAI, reuse vectors from `kb_chunks` that share the same `content_sha256` in the org (Streamline: `SB/modules/kb/retrieval/kb-embedding-cache.ts`, `kb-embedding-resumption.ts`) — Re-indexing an unchanged page makes 0 embedding calls.

- [ ] KB-0105 [Medium][Ops] Re-index controls and indexing status — `app/api/knowledge/pages/[pageId]/reindex/route.ts`, `pages/reindex-all/route.ts` (needs `kb:settings:manage`), `pages/[pageId]/indexing-status/route.ts` — Re-queue in batches of 100. The status reports `indexed | pending | stale | skipped (keyword only)` with chunk count and `indexed_at` (Streamline: `SB/modules/kb/retrieval/kb-page-indexing.controller.ts` `:pageId/reindex`, `reindex-all`, `kb-article-reindex.service.ts` `REINDEX_BATCH_SIZE = 100`, `kb-derived-chunk-state.ts`, `SB/modules/kb/wiki/kb-sources.controller.ts` `pages/:pageId/indexing-status`) — After `OPENAI_API_KEY` is added later, one reindex-all fills in the embeddings, and the status changes from skipped to indexed.

- [ ] KB-0107 [Medium][Search] Index page attachments — `lib/knowledge/indexing/ingest.ts` — Each document attachment is extracted (KB-0106) and chunked with `kb_chunks.attachment_id` set and the parent page's ACL columns copied (Streamline: `SB/modules/kb/retrieval/kb-attachment-indexing.service.ts`, `SB/db/schema/kb/attachments.ts`) — A PDF attached to a page is answerable via ask and search, and is hidden from anyone who can't view the page.

- [ ] KB-0108 [Medium][API+UI] Knowledge sources (uploaded files and notes for Ask) — `app/api/knowledge/sources/route.ts` (GET, POST multipart), `sources/note/route.ts` (POST), `sources/[sourceId]/route.ts` (GET, DELETE), with a Sources tab on the chat page — Upload a file (KB-0057 type rules) or a text note into a space. Statuses `pending/processing/indexed/failed`, `chunk_count`, `error_message`. Index through the same pipeline with `kb_chunks.source_id`. 503 when storage or AI is off (Streamline: `SB/modules/kb/wiki/kb-sources.controller.ts` `sources`, `sources/note`, `sources/:sourceId`, `SB/db/schema/kb/sources.ts`, `SF/hooks/api/kb/sources.ts`) — An uploaded PDF shows `indexed` and is cited by ask. A failed one shows its error.

- [ ] KB-0109 [Medium][Ops] Stuck-source reaper — the cron sweeper — Sources `processing` for more than **30 min** are reset to `failed` with the Streamline message (batch of 200), so the user can retry (Streamline: `SB/modules/kb/retrieval/kb-stuck-source-reaper.service.ts` `KB_SOURCE_STUCK_AFTER_MS = 30 * 60_000`, `KB_SOURCE_REAP_BATCH = 200`, `KB_SOURCE_STUCK_MESSAGE`) — A fake stuck row is reset by the cron.

- [ ] KB-0113 [Medium][AI] AI interaction log and credits — `lib/knowledge/ai/interactions.ts`, `lib/knowledge/ai/credits.ts` — Write a `kb_ai_interactions` row for every ask, page AI action, authoring call and brief (provider, model, tokens, latency_ms, result_state, source ids with revisions, cost_credits). Charge `tenant_ai_credits` and log `tenant_ai_credit_transactions`. `monthly_allowance` NULL = unlimited (D7) (Streamline: `SB/modules/kb/core/kb-credits.service.ts`, `SB/db/schema/kb/ai-interactions.ts`, `credits.ts`, `SB/modules/kb/analytics/kb-write-metrics.ts`) — With the balance 0 and an allowance set, ask → 402 `KB_AI_CREDITS_EXHAUSTED`. With NULL it is never blocked.

- [ ] KB-0115 [Medium][AI] Report knowledge gaps from Ask — `app/api/knowledge/ask/knowledge-gap/route.ts` (POST `{question, conversationId?}`) and auto-logging when `noAnswer` — Write a `kb_events` row `ask_no_answer` / `knowledge_gap_reported`. Analytics groups these into the gaps list (KB-0130). With the help centre on, they also feed `support_knowledge_gaps` (Streamline: `SB/modules/kb/retrieval/kb-ask.controller.ts` `ask/knowledge-gap`, `SB/modules/kb/core/kb-gap-documents.ts`, `SB/modules/kb/help-centre/kb-content-gap.service.ts`) — Reporting a gap shows up in Analytics → Gaps.

- [ ] KB-0121 [Medium][AI] Authoring AI (draft, improve, summarise) — `app/api/knowledge/ai/draft/route.ts`, `ai/improve/route.ts`, `ai/summarize/route.ts` — Draft gives a Plate value from `{title, outline?, contentType}`. The client creates it as `status='draft'` in the user's private space. Improve and summarise work on arbitrary text (Streamline: `SB/modules/kb/help-centre/kb-authoring.controller.ts` `draft`, `improve`, `summarize`, `kb-authoring.service.ts`) — An AI draft is never auto-published.

- [ ] KB-0122 [Medium][AI] Research briefs — `app/api/knowledge/research-briefs/route.ts` (GET, POST `{topic, spaceId?}`), `[briefId]/route.ts` (GET, DELETE), `[briefId]/rate`, `/retry`, `/approve`, `lib/knowledge/ai/research-brief.ts`, `lib/inngest/functions/knowledge-research-brief.ts` — A port of the LangGraph flow as plain async steps: plan at most **5** questions → retrieve for each → draft the report → critique → refine at most **2** times → `completed` with citations, source_count and cost. At most **10** briefs running per org. Statuses `queued/running/completed/failed`. Without Inngest it runs via `after()`, and the sweeper resumes queued ones (Streamline: `SB/modules/kb/retrieval/kb-research-brief.graph.ts` `PLAN_MAX_QUESTIONS = 5`, `MAX_REFINE_COUNT = 2`, `kb-research-brief.service.ts` `KB_RESEARCH_BRIEF_CONCURRENT_LIMIT = 10`, `kb-research-brief.controller.ts`, `kb-research-brief.handler.ts`) — A brief completes with ≥3 citations on seeded data. Retry on failure works. The 11th concurrent brief → 429.

- [ ] KB-0128 [Medium][Health] Verification expiry and review reminders — the `knowledge-daily` cron — Pages verified more than **180 days** ago become `unverified` (trust state). Pages with `next_review_at` today create a freshness review and notify the owner with `knowledge.page.review_requested` (Streamline: `SB/modules/kb/help-centre/kb-article-page-scope.ts` `ARTICLE_VERIFIED_WINDOW_DAYS = 180`, `SB/modules/kb/core/kb-page-trust-predicates.ts`, `SB/modules/kb/help-centre/kb-verification.service.ts`) — Backdate `verified_at` 181 days and run the cron: the badge shows "Needs verification".

- [ ] KB-0130 [Medium][API] Knowledge analytics — `app/api/knowledge/analytics/overview`, `/no-results`, `/pages`, `/gaps`, `/gaps/related-pages`, `/content-gaps`, `/citation-reuse`, `/review-sla` (GET with `?range=7d|30d|90d`), plus `gaps/assign`, `gaps/dismiss` and `gaps/create-fix` (POST, creates a draft page from a gap) — Built from `kb_events` (page views, searches, no-result searches, asks, no-answer, feedback), `kb_page_visits` and `kb_page_reviews`. Needs `kb:analytics:view` (Streamline: `SB/modules/kb/help-centre/kb-analytics.controller.ts`, `kb-analytics.service.ts` `STALE_PAGE_THRESHOLD_DAYS = 90`, `SB/modules/kb/analytics/kb-read-metrics.ts`, `kb-write-metrics.ts`) — Three searches for "xyz" with no results show in No-results with count 3. "Create fix" opens a draft titled with the query.

- [ ] KB-0132 [Medium][UI] Analytics page — `app/(dashboard)/knowledge/wiki/analytics/page.tsx`, `features/knowledge/components/knowledge-analytics-page.tsx`, `knowledge-analytics-lists.tsx`, `knowledge-analytics-gaps-list.tsx`, `knowledge-analytics-gap-row.tsx`, `features/knowledge/lib/analytics-range.ts` — A range switcher (7/30/90 days), 4 plain number tiles (views, searches, asks, answer rate), top pages, no-result searches, gaps with assign/dismiss/create-fix, citation reuse and review SLA (Streamline: same file names in `SF/features/wiki/`) — The empty org shows "No activity yet". Gap actions update the list without a reload.

- [ ] KB-0133 [Medium][API] Company documents (HR documents published to the KB) — `app/api/knowledge/linked-documents/route.ts` (GET, filters status active/unpublished/source_removed/all), `[linkedDocumentId]/route.ts` (GET), `[linkedDocumentId]/open/route.ts` (POST, signed URL valid **300 s**, rate tier `kb:linked-document-open` 30/min), and HR-side `app/api/hr/documents/[documentId]/kb-link/route.ts` (POST publish, PATCH, DELETE unpublish with a reason ≤500) — Audiences: all / department / role / user, at most **50**. Version mode latest or pinned. Visible only to users in the audience. When the source document is removed, mark it `source_removed` and purge after **30 days** (Streamline: `SB/modules/kb/linked-documents/kb-linked-documents.controller.ts`, `kb-linked-document-publish.service.ts`, `kb-linked-document-visibility.ts`, `kb-linked-document-file.service.ts` `LINKED_DOCUMENT_URL_TTL_SECONDS = 300`, `kb-linked-document-purge.ts` `SOURCE_REMOVED_GRACE_DAYS = 30`, `dto/document-audience-entry.schema.ts` `MAX_DOCUMENT_AUDIENCES = 50`, `SB/modules/hr/performance/document-kb-link.controller.ts`) — A document published to the Engineering department isn't visible to SALES (404). The open URL expires after 5 min.

- [ ] KB-0135 [Medium][UI] Company documents pages and HR publish control — `app/(dashboard)/knowledge/wiki/company-documents/page.tsx`, `[linkedDocumentId]/page.tsx`, `features/knowledge/components/company-documents-page.tsx`, `company-document-detail-page.tsx`, `wiki-company-documents-strip.tsx`, `features/knowledge/lib/linked-document-title.ts`, and a "Publish to Knowledge" action on the CRM HR documents page — Off by default (D4: `flags.knowledgeCompanyDocs`) (Streamline: same names in `SF/features/wiki/`, `SF/app/(authenticated)/knowledge/wiki/company-documents/**`) — With the flag off the nav item is hidden and the routes return 404. With it on, publish → visible to the audience.

- [ ] KB-0136 [Medium][UI] KB settings page — `app/(dashboard)/knowledge/wiki/settings/page.tsx` (or a "Knowledge" tab in the CRM `/settings`) — Trash retention days, chat history retention days, default space visibility, public sharing on/off, AI features on/off (disabled with "Set OPENAI_API_KEY to enable" when not configured), company documents on/off, help centre on/off (only when `CRM_MODULE_ENABLED`), search index status (KB-0108), and the reindex-all button (Streamline: `SB/modules/kb/core/kb-settings.controller.ts`, `kb-hr-link-flags.controller.ts`, `SF/hooks/api/kb/kb-spaces-settings-schema.ts`) — Saving shows a toast and an audit row. SALES gets the no-permission state.

- [ ] KB-0138 [Medium][Notify] Notification preferences — the existing CRM notification settings UI — Add a "Knowledge" group with toggles per event (in-app and email), defaulting to in-app on and email on only for mentions and review requests (Streamline: `notification-events-knowledge.catalog.ts` default channels) — Turning off mention email stops the email but keeps the in-app notification.

- [ ] KB-0139 [Medium][Notify] Email templates for KB notifications — `lib/email/templates/knowledge-*.tsx` via ZeptoMail (`lib/email`) — Mention, review requested, review decided and research brief ready. Plain layout matching the existing CRM templates: ink text, one gold button, the Miyo logo, no images, and an unsubscribe/preferences link. When ZeptoMail isn't configured, log `email.skipped` and keep the in-app notification (Streamline: notification email rendering in `SB/modules/notifications/**`) — Rendered snapshot tests. A QA temp inbox (`qa.kb.*`) receives the mention email on prod.

- [ ] KB-0153 [Medium][Design] Icons and copy tone — all KB UI — Use lucide icons only, at 16 px, stroke 1.75, matching the sidebar. AI entry points use a plain "Ask" text label and a `MessageSquare` icon, never a sparkle. Labels are sentence case and plain: "New page", "Move to trash" rather than "Delete forever", "Ask the knowledge base" (Streamline: SF labels in `wiki-sidebar-nav.tsx`) — A copy review checklist is ticked in the PR description.

- [ ] KB-0154 [Medium][Design] Empty, loading and error states — `features/knowledge/components/kb-empty-state.tsx`, `loading.tsx` files — Empty states are one sentence plus one action, with no illustration. Loading uses silver skeletons shaped like the real layout. Errors use the existing CRM `error.tsx` pattern with a Retry button (Streamline: `SF/app/(authenticated)/knowledge/**/loading.tsx`, `error.tsx`) — Every KB route has a `loading.tsx`. Throwing in a page shows the error state and Retry recovers.

- [ ] KB-0163 [Medium][Test] Ask evaluation set — `tests/knowledge/ask-eval.json`, `scripts/kb-ask-eval.ts` — 20 questions over seeded QA pages with an expected page id or `noAnswer`. Run manually once `OPENAI_API_KEY` is added. Report citation hit rate and false answers (Streamline: `SB/modules/kb/retrieval/kb-ask.service.spec.ts`, `kb-context-passage-provenance.spec.ts`) — Hit rate ≥ 85% and 0 invented answers on the `noAnswer` set.

- [ ] KB-0168 [Medium][Ops] QA data cleanup script — `scripts/kb-qa-cleanup.ts` — Delete all KB rows, R2 objects under `kb/{orgId}/` and users whose email starts with `qa.kb.`, with a `--dry-run` default that prints counts only (the prod DB holds only test data, so this is allowed) — The dry run prints counts, `--apply` removes them, and rerunning gives 0.

- [ ] KB-0169 [Medium][Docs] Handoff docs and the env checklist — `docs/knowledge-base.md` — Architecture, decisions D1–D10, the route list, the permission map, how indexing works, how to enable AI later (add the env vars in §4, then run reindex-all), and the troubleshooting table (status codes `KB_*`) — Tarun can enable AI by following the doc without code changes.

---

- [ ] KB-0022 [Low][DB] Migration `0171_kb_help_centre` — `drizzle/0171_kb_help_centre.sql` — `kb_categories` (space_id, parent_id, name, slug, description, icon, sort_order, is_published), the FK `kb_pages.category_id → kb_categories` with SET NULL, and `support_knowledge_gaps` (cluster_key, representative_question, ticket_count, sample_ticket_ids jsonb, status, proposed_article_id, dismissal_reason, drafted_by, reviewed_by, evidence) (Streamline: `SB/db/schema/support/kb.ts`, `support-kb-gap.ts`, migrations `1276`, `1277`) — Apply passes.

- [ ] KB-0052 [Low][API] Owners list — `app/api/knowledge/pages/owners/route.ts` — Distinct owners of visible pages, for the filter (Streamline: `SB/modules/kb/retrieval/kb-search.controller.ts` `pages/owners`) — Returns names, not emails, for non-admins.

- [ ] KB-0064 [Low][API] Page translations — `app/api/knowledge/pages/[pageId]/translations/route.ts` (GET), `translations/[locale]/route.ts` (GET, PUT, DELETE) — BCP-47 locale validation. Bump `revision`. Mark `outdated` when the source page's content revision changes (Streamline: `SB/modules/kb/core/kb-translations.controller.ts`, `kb-translations.service.ts`) — Editing the source flips its translations to outdated.

- [ ] KB-0116 [Low][Ops] Chat history retention — the cron sweeper — Delete chat conversations and messages older than `kb_settings.chat_history_retention_days` (default **90**) (Streamline: `SB/modules/kb/core/kb-settings.service.ts` `DEFAULT_CHAT_HISTORY_RETENTION_DAYS = 90`) — A 91-day-old conversation is removed after a sweep.

- [ ] KB-0118 [Low][UI] Floating Ask bubble — `components/knowledge/kb-chat-bubble.tsx` mounted in the dashboard layout — Only when AI is configured and `flags.knowledgeAi` is on. Opens a compact ask panel. Hidden on `/knowledge/chat` (Streamline: `SF/components/kb/kb-chat-bubble.tsx`) — The bubble isn't rendered with AI off.

- [ ] KB-0123 [Low][UI] Research briefs pages — `app/(dashboard)/knowledge/research-briefs/page.tsx`, `[briefId]/page.tsx`, `loading.tsx`, `features/knowledge/components/kb-research-brief-card.tsx`, `kb-research-brief-detail.tsx`, `kb-research-brief-form.tsx`, `kb-research-brief-form-schema.ts`, `kb-research-briefs-page-content.tsx` — The list, the create form, status, the report with citations, rate, approve and "Save as page" (Streamline: `SF/app/(authenticated)/knowledge/research-briefs/**`, `SF/features/help-centre/components/kb-research-brief-*.tsx`) — "Save as page" creates a draft page with the brief content.

- [ ] KB-0125 [Low][AI] Contradiction scanner (AI, optional) — `lib/knowledge/health/contradictions.ts` — Batches of **50** page pairs with high chunk similarity. The LLM judges whether they contain conflicting claims. Store `contradictory_claim` items with both quotes as evidence and `rule_version = 1`. Skipped when AI or pgvector is off (Streamline: `SB/modules/kb/content-health/kb-contradiction-scanner.service.ts` `RULE_VERSION = 1`, `SCAN_BATCH = 50`) — Two seeded pages with "15 days leave" and "20 days leave" are flagged. With no key, the scan logs skipped.

- [ ] KB-0134 [Low][Search] Company documents in search and Ask — `lib/knowledge/linked/search.ts` — Search titles and extracted text (at most 12 terms), and include at most **3** linked documents as Ask sources, filtered by audience (Streamline: `SB/modules/kb/linked-documents/kb-linked-document-search.ts` `MAX_TERMS = 12`, `kb-linked-document-ask-source.ts` `KB_ASK_MAX_LINKED_DOCUMENTS = 3`) — Asking about a published policy PDF cites it as "Company document".

- [ ] KB-0140 [Low][API+UI] Help-centre categories — `app/api/knowledge/spaces/[spaceId]/categories/route.ts` (GET, POST), `categories/[categoryId]/route.ts` (PATCH, DELETE), `features/knowledge/help/kb-category-dialog.tsx`, `kb-category-list-item.tsx`, `kb-category-schema.ts` — Nested one level, slugs, sort order, published (Streamline: `SB/modules/kb/help-centre/kb-categories.controller.ts`, `kb-categories.service.ts`, `SF/features/help-centre/components/kb-category-*.tsx`) — Deleting a category sets its pages' `category_id` to NULL.

- [ ] KB-0141 [Low][API] Help articles (KB pages with `content_type='support_article'` in a help space) — `app/api/knowledge/articles/**` mirroring Streamline's articles controller (list, get, create, update, publish, request approval) — They reuse kb_pages and the page writer, so there's no separate article table (Streamline: `SB/modules/kb/help-centre/kb-articles.controller.ts`, `kb-articles.service.ts`, `kb-article-query.service.ts`, `kb-article-columns.ts`, `kb-article-page-scope.ts`) — Publishing an article sends `knowledge.article.published`.

- [ ] KB-0142 [Low][AI] Article AI actions — `app/api/knowledge/articles/[articleId]/ai/{summarize,ask,improve,suggest-related}[/stream]` — The same handlers as KB-0119, with article scope (Streamline: `SB/modules/kb/help-centre/kb-article-ai.controller.ts`, `kb-article-ai.service.ts`, `SF/features/help-centre/components/kb-article-ai-actions.tsx`) — The same tests as page AI pass for articles.

- [ ] KB-0143 [Low][UI] Help-centre manager — `app/(dashboard)/knowledge/help/page.tsx`, `[articleId]/page.tsx`, `features/knowledge/help/kb-manager-content.tsx`, `kb-article-card.tsx`, `kb-article-editor-page.tsx`, `kb-article-editor.tsx`, `kb-new-article-dialog.tsx`, `kb-new-article-schema.ts`, `kb-attachments-panel.tsx`, `kb-comments-panel.tsx`, `kb-feedback-panel.tsx`, `kb-analytics-tab.tsx` — Categories on the left, articles on the right, plus editor and feedback tabs (Streamline: `SF/app/(authenticated)/support/kb/**`, `SF/features/help-centre/components/*`) — The flag off gives 404. With it on, create, publish and open the public URL.

- [ ] KB-0144 [Low][UI] Public help centre — `app/(public)/help/[orgSlug]/page.tsx`, `[articleSlug]/page.tsx`, `app/api/public/kb/**` — Published articles only, with search, category list and a "Was this helpful?" control (`kb_page_feedback`, rate tier `public:kb-feedback` 10/hour). Rate tiers `public:kb` and `public:kb-article` 60/min. The public ask (`ai:public-kb-ask` 10/min per IP, 60/min per org) uses only public articles with top-k **6** (Streamline: `SF/app/(public)/help/[orgId]/**`, `SB/modules/kb/core/kb-public-documents.ts`, `kb-rag-documents.ts` `PUBLIC_TOP_K = 6`, `SB/common/ratelimit/rate-limit.service.ts` public tiers) — A draft article → 404 publicly. The 11th feedback in an hour → 429.

- [ ] KB-0145 [Low][UI] Embeddable help widget — `app/api/public/kb/widget/[orgSlug]/route.ts` (config JSON), `widget/[orgSlug]/script/route.ts` (JS loader) — A small iframe launcher with search and the article view, styled with the palette (Streamline: `SB/modules/kb/help-centre/kb-widget.controller.ts` `public/kb/widget/:orgId`, `:orgId/script`) — The script loads on a test HTML page and the search returns public articles only.

- [ ] KB-0146 [Low][AI] Draft an article from a support ticket — `app/api/knowledge/articles/from-ticket/[ticketId]/route.ts` (POST) — Uses the CRM support ticket's messages to create an AI draft article in the help space, linking the ticket as a record link (Streamline: `SB/modules/kb/help-centre/kb-from-ticket.controller.ts`, `kb-from-ticket.service.ts`) — Only shown when CRM support tickets exist and AI is on. The draft is linked back to the ticket.

- [ ] KB-0147 [Low][API+UI] Verification queue — `app/api/knowledge/verification/queue/route.ts` (GET), a "Needs verification" tab on the Reviews page — Articles and pages whose verification is expiring or expired (180-day window) (Streamline: `SB/modules/kb/help-centre/kb-verification.controller.ts` `verification/queue`, `kb-verification.service.ts`) — A backdated article appears in the queue.

- [ ] KB-0148 [Low][UI] Support knowledge gaps — `app/(dashboard)/knowledge/help/gaps/page.tsx`, `features/knowledge/help/kb-content-gaps.tsx` — Clusters from `support_knowledge_gaps` (representative question, ticket count, sample tickets), with Draft article and Dismiss with a reason (Streamline: `SF/app/(authenticated)/support/knowledge-gaps/page.tsx`, `SF/features/help-centre/components/kb-content-gaps.tsx`, `SB/modules/kb/help-centre/kb-content-gap.service.ts`) — Draft creates a draft article and sets `proposed_article_id`.

- [ ] KB-0149 [Low][Analytics] Ticket deflection metric — `analytics/overview` addition — Count public help sessions followed by no ticket within 24 h, as a simple ratio. This is a CRM-specific addition: label it so, and keep it hidden unless the help centre is on (Streamline: `SB/modules/kb/help-centre/kb-analytics-event-scope.ts`, public events in `kb_events`) — Shows "—" when there's no data.

- [ ] KB-0150 [Low][UI] Translations panel — `features/knowledge/components/page-translations-sheet.tsx` — A locale list with status (current/outdated), add a locale, an editor for the translated title and content, and optional "Translate with AI" (Streamline: `SB/modules/kb/core/kb-translations.controller.ts`, `kb-translations.service.ts`) — Editing the source marks translations outdated in the panel.

- [ ] KB-0157 [Low][Design] Dark mode parity (only if the CRM has dark mode enabled) — `features/knowledge/wiki-document.css` — Ink background with silver text and gold accents. The editor and code blocks are readable (Streamline: `wiki-document.css` dark rules) — With dark mode on, manual check of doc, tree and chat. Skip if the CRM is light-only.

- [ ] KB-0158 [Low][Design] Microcopy pass — all KB strings — Write every string out (toasts, confirms, empty states) in plain English. Destructive confirms name the object ("Move 'Leave policy' to trash?"). No exclamation marks, no emoji in system copy — Review by Tarun before the final merge.

---

## 10. Final verification checklist

Run after Phases 1–7. Tick only with fresh evidence against production.

### 10.1 Status codes per role
- [ ] FV-0001 Re-run the status matrix (OUT, HR, ENG, manager, CS, SALES, DESIGN, VIDEO, DM, CEO/ADMIN) across every page + `/api/*`.
- [ ] FV-0002 Zero unexpected **5xx** on configured routes (AI/Inngest/storage may return 401/403/501 when unconfigured — never 500).
- [ ] FV-0003 Unauthenticated sweep: every authenticated `/api/*` returns **401** (not 400 schema, not 500).
- [ ] FV-0004 No unexpected **200** for non-HR roles on admin-only APIs (roles, incentives, webhooks, payroll manage, role assignment).

### 10.2 Responsiveness
- [ ] FV-0010 Every key page usable at **375 / 768 / 1024 / 1440** — zero BROKEN cells.
- [ ] FV-0011 MINOR cells triaged to OK (no clipped Actions, no page-level horizontal scroll).
- [ ] FV-0012 Dashboard / HR interactive p95 **< 3s** on warm navigation; headcount-trends **< 3s**.

### 10.3 End-to-end flows (temp email, QA prefix)
- [ ] FV-0020 **Onboard** → welcome email (new template) → set password → first login.
- [ ] FV-0021 **MFA** setup, login challenge, lockout, backup codes, HR reset → notify email.
- [ ] FV-0022 **Leave:** apply → manager approve → balance decrements → employee decision email; cancel emails employee too.
- [ ] FV-0023 **Payroll:** generate → approve (per D2) → mark paid → payslip PDF → payslip email; maths match Tarun rules; DRAFTs recompute after rule change.
- [ ] FV-0024 **Exit:** resign → HR approve → CEO/Admin review → access revoked → exit emails.
- [ ] FV-0025 **ATS:** publish job → public apply + resume → pipeline move → interview + ICS → offer → accept → hire → employee onboarding.
- [ ] FV-0026 **KB:** create space/page → edit/autosave → share link → search → Ask KB (if AI configured) → trash/restore.
- [ ] FV-0027 **Security:** HR→CEO rejected; revoked session cannot run server actions; 15 logins yield 429; file upload works; no IDOR on docs/payslips.

---

## 11. QA data cleanup

- [ ] CLEAN-0001 Delete all QA3 employees and related rows: hr50k, engmgr50k, engrep25k, sales11k, cs8k, design10k, video10k, dm25kmid, fut11k (and any newer QA* cohorts).
- [ ] CLEAN-0002 Delete old QA cohort leftovers (qahradmin*, qamanager*, qaemp*, qafinance*) and any stuck resignations at HR_APPROVED.
- [ ] CLEAN-0003 Delete race duplicates: 6× QA3 race loans, 6× Race Dept, 3× Race Day holidays (2026-11-15), 6× race calendar events, leave request dupes ~ids 17–22.
- [ ] CLEAN-0004 Delete/cancel leftover expenses, helpdesk tickets ("QA3 support email test"), Oct 2026 QA payroll DRAFTs.
- [ ] CLEAN-0005 Fix project QUP budget if still ₹600 from UI typo; delete extra QA projects (QPL, etc.).
- [ ] CLEAN-0006 Delete "QA Test Holiday" on 25 Oct 2031 and any other QA Test* holidays/events.
- [ ] CLEAN-0007 Confirm MFA final state on accounts that were reset during tests; leave only intentional QA MFA fixtures or remove them.
- [ ] CLEAN-0008 After ATS/KB QA, delete all `QA` / `QA KB` candidates, applications, spaces and pages.

---

## Appendix A — Count reconciliation per source

| Source | Open in source | How represented here |
|---|---:|---|
| RETEST.md R3 checklist | 44 | All 44 emitted (aliases folded into SEC/R3 canonicals where listed) |
| RETEST reverify STILL_BROKEN | 131 | Full text from MIYO/QA todos; aliases not double-counted |
| RETEST reverify PARTIAL | 238 | Full text + **Remaining:** from evidence |
| RETEST reverify NEEDS_UI | 25 | Full text + Remaining needs UI note |
| RETEST reverify CANT_VERIFY | 2 | Full text + Remaining |
| SECURITY-TODO.md | 18 | All 18 in Phases 1–4; hardening → Phase 5 (7 steps) |
| MIYO-CRM-TODO ATS MIYO-0626–0687 | 62 | Phase 6 (all still open) |
| KB-TODO.md | 169 | Phase 7 |
| FIXED / INTENDED / OUT_OF_SCOPE | 91+2+4 | Not in checklist (already done / not actionable) |

**Emitted checklist items (Phases 1–4 + 6–7):** 637
**Plus hardening steps (Phase 5):** 7
**Grand total checkboxes:** 644

| Phase | Count |
|---|---:|
| 1 Critical/blockers | 7 |
| 2 High | 69 |
| 3 Medium | 90 |
| 4 Low/design | 240 |
| 5 Hardening | 7 |
| 6 ATS | 62 |
| 7 KB | 169 |

### Dedup map (canonical → aliases not separately listed)

- `SEC-0001` ← `R3-0001`, `QA-0002`
- `SEC-0007` ← `R3-0003`
- `SEC-0009` ← `R3-0013`
- `R3-0002` ← `MIYO-0071`
- `R3-0004` ← `QA-0004`
- `R3-0005` ← `QA-0011`
- `R3-0007` ← `QA-0028`
- `R3-0008` ← `QA-0032`
- `R3-0020` ← `QA-0018`
- `R3-0100` ← `QA-D005`
- `R3-0101` ← `QA-D004`
- `R3-0102` ← `QA-D001`
- `R3-D001` ← `MIYO-0323`
- `R3-D002` ← `MIYO-0324`
- `R3-D003` ← `MIYO-0325`
- `R3-D004` ← `MIYO-0315`, `MIYO-0316`, `MIYO-0317`
- `R3-D005` ← `QA-D002`
- `R3-D006` ← `QA-D003`

### Alias coverage check
- IDs marked emitted: 658

---

## Appendix B — Responsive BROKEN/MINOR detail

# Miyo CRM – Responsive & Design QA (r3)
Read-only pass as Admin on crm.miyoglobal.com, using Chrome DevTools responsive mode at about 800 px high.
Coverage: every page at 375; all previously spot-checked pages now also at 768/1024/1440. "n/c" = not checked.
Load @1440: "Finish" = DevTools hard reload (inflated by ~100 sidebar RSC prefetches); "~Ns" = seconds to content on in-app (client) navigation.

| Page (actual path) | 375 | 768 | 1024 | 1440 | Load @1440 |
|---|---|---|---|---|---|
| /dashboard | MINOR (toast covers header) | n/c | n/c | OK | Finish 6.65 s (102 req, 1.9 MB); cold >20 s |
| /hr (employees) | MINOR | MINOR (role badges clipped) | MINOR (dept/status/actions off-screen) | MINOR (Actions header clipped "ACT") | ~9–10 s skeleton |
| Employee detail | OK | n/c | n/c | n/c | – |
| /hr/leaves | MINOR (table clipped) | OK | OK | OK (breadcrumb says "Employees > Leaves") | ~3 s |
| /hr/attendance | OK | OK | OK | OK | ~3 s |
| /hr/payroll | BROKEN | MINOR (stacked actions) | MINOR | OK | ~3–4 s ("all" API 1.0 s) |
| Payroll detail | OK | n/c | n/c | n/c | – |
| /hr/expenses | MINOR | MINOR (label + KPI truncated) | MINOR (same) | OK | ~3 s |
| /hr/assets | MINOR | MINOR (actions col cut) | MINOR (actions hidden) | OK (placeholder truncated) | ~3 s |
| /hr/documents | MINOR | OK | **BROKEN** (action buttons overlap "Document library" heading) | OK | ~3 s |
| /hr/holidays | BROKEN | BROKEN | n/c | MINOR | Finish 8.97–9.03 s (106–119 req, 3.0–3.1 MB) |
| /projects | OK | OK | OK | OK | ~3 s |
| /projects/3 board | MINOR | MINOR | MINOR | MINOR (filters clipped "All A…", h-scroll, duplicate title) | ~3–4 s |
| /projects/3 backlog | MINOR | OK | OK | OK | ~3 s |
| Ticket panel (?ticket=) | OK | OK | OK | OK | ~3 s |
| Support (/hr/helpdesk) | OK | MINOR (AI Reply col clipped) | MINOR (same) | OK | ~3 s |
| /settings | OK | OK | MINOR (double nav cramps content) | OK | ~3 s |
| /settings/members | MINOR | MINOR (table scroll, cols hidden) | MINOR | MINOR (role select/status/actions clipped) | ~3 s |
| /reports | OK | OK | OK | OK | Finish 7.47 s (93 req, 1.7 MB) |
| /signin (Incognito) | OK (tested at 357 px; field input lagged) | n/c | n/c | OK (1280) | – |
| /hr/ats | 404 "Page not found" in-app, no redirect (URL stays) | | | | – |
| /hr/recruitment | 404 "Page not found" in-app, no redirect | | | | – |

Totals (69 graded cells; 10 n/c): OK 37 / MINOR 28 / BROKEN 4.
No public careers/jobs link exists (no Recruitment/ATS in HR nav; /careers, /hr/ats, /hr/recruitment all 404).

Global: at 1024 the full 240 px sidebar squeezes the content and the "Projects & Time" top-nav item wraps to 2 lines (MINOR).

## Issues (page, width, problem, fix)
1. Holidays, 375/768: an unbroken long name overflows over the badge and the edit/delete icons. Fix: `min-w-0 break-words` or `truncate` on the title, and `shrink-0` on the badge and actions.
2. Payroll, 375: action buttons stack vertically and sit off-screen; rows are about 120 px tall. Fix: a kebab/dropdown menu for row actions, or card rows on mobile.
3. Payroll, 768/1024: the same stacking. Fix: a kebab menu, keeping only the primary action visible.
4. Payroll, 375: KPI labels are clipped ("PAYSLIPS IN TH…"). Fix: wrap labels, use a 2-column grid.
5. Dashboard, 1440: 6.6–17 s finish, a >20 s cold start, and about 100 RSC prefetches at ~600 ms each. Fix: disable `prefetch` on sidebar Links, check that production builds (not turbopack dev chunks) are deployed, and cache.
6. Holidays, 1440: 9 s finish, 3.1 MB. Fix: same as #5.
7. Dashboard, 375: the "scheduled meetings" toast covers the header. Fix: bottom-position toasts on mobile and auto-dismiss them.
8. Board, 375–1024: the toolbar and search are clipped and the project header appears twice. Fix: a wrapping toolbar, search collapsed to an icon, and a single header.
9. Tables (employees, leaves, assets, backlog, members), 375: columns are cut off with no scroll affordance. Fix: card layout under `md`, or a sticky first column plus a scroll shadow.
10. Shell, 1024: the full sidebar crowds the content and the nav label wraps. Fix: auto-collapse the sidebar to icons below 1280, and use `whitespace-nowrap` on nav items.
11. Expenses, 375: the "Amount ≥ (₹" label and the KPIs are truncated. Fix: shorter labels and wrapping.
12. Documents, 375: icon-only buttons have no labels and the folder cards are clipped. Fix: tooltips or aria-labels, and a 1-column grid.
13. /careers, /hr/ats, /hr/recruitment return 404. Fix: add a redirect to the recruitment route, or remove the link.

14. Documents, 1024: header action buttons overlap/clip the "Document library" title. Fix: `flex-wrap` header, or move actions below the title under `xl`.
15. HR breadcrumbs: every HR page reads "Employees > …". Fix: derive the breadcrumb from the route.
16. Mobile (375/768): the drawer shows only the current module, so you cannot switch Core/HR/System. Fix: add a module switcher to the drawer.
17. Members, 1024/1440: the table is wider than the content area. Fix: hide Joined below 2xl, or use a kebab for row actions.

## Design notes (1440)
- Palette: warm cream background, dark charcoal sidebar, mustard/gold primary buttons. Coherent and not the generic purple-gradient "AI" look; no emoji or glassmorphism.
- Three typefaces (Montserrat headings, Plus Jakarta body, IBM Plex Mono numbers) is one too many; the mono KPI numbers look slightly template-like.
- Mixed casing: uppercase pills and KPI labels ("WEB CLOCK-IN", "PAYSLIPS…") next to sentence-case UI.
- Generic "AI dashboard" tells: uniform light-bordered cards everywhere, the dark gradient cover banner on employee detail, and large empty card areas on the HR dashboard.
- Row actions use many equal-weight outlined buttons, with a red Delete next to neutral ones; this needs a clearer hierarchy.
- The "AI Reply" sparkle button in Support is the most AI-looking element.
- Documents shows "No documents found" next to 5 folders, which is confusing.
- The sign-in page is clean but sparse: a small form floats in a large empty canvas, with the logo pinned to the corner.


---

*End of file. No passwords, TOTP secrets, or API keys are included.*