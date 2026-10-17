# Master prompt — Miyo Global CRM QA, continue from 76d7660

Paste everything below the line into the new Claude Code session, opened in the CRM repo, with the zip `MiyoGlobal-latest-testing.zip` attached.

---

You are continuing the Miyo Global CRM QA fix list. The work so far is pushed to `main` at commit `76d7660`.

## Inputs

1. **The QA list.** It is `the latest testing CRM MiyoGlobal testing file.md` inside the attached zip (644 items in 7 phases).
   - If `docs/QA-MASTER.md` exists in the repo, it is the same list with progress ticked and "Agent note" lines added. Use it.
   - Otherwise copy the zip's `.md` to `docs/QA-MASTER.md`, then tick the IDs listed under "Already done" below.
2. **Email templates.** The 91 target templates are already in the repo under `email-templates/` (.html + .txt).
   - They compile into `lib/email-templates/catalog.generated.ts`. After editing a template, run `node scripts/build-email-templates.mjs`.

## Rules (from §0 of the QA file, plus what we learned)

### How to work
- Work strictly in order, one item at a time. Read the code each item touches before editing.
  - Many items were already fixed by earlier waves. Check `git log --grep=<ID>` and look for code comments citing the ID first.
  - If an item is already fixed, tick it with a one-line "Agent note" saying where. Do not re-fix it.
- After each item:
  - Run `pnpm typecheck` and the related vitest files.
  - Commit with the item ID first in the message, e.g. `QA-0040: <what changed>`. Body explains why. End with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Tick the checkbox in `docs/QA-MASTER.md`. That file is not tracked in git; keep it local.
- Every ~10 items, run `pnpm lint && pnpm test`.
- An item needing a live/prod check you cannot do: commit the code, leave the box unticked, and add `- **Agent note (date):** …` saying what is left.
- "Also known as" IDs are the same bug. Fix once and tick both.
- After code changes, run `graphify update .` (from CLAUDE.md).

### Pushing
- Tarun pushes to `main` himself unless he asks you to. Commit locally only.

### Never touch
- `.omc/` file contents
- `scripts/generate-miyo-payslips.ts`
- any `.env*` file
- Never print secrets.

### Design and payroll rules
- Design rule for UI changes: simple, clean, not AI-looking. No gradients, glow, glass or emoji.
  - Palette: gold `#D4AF37`, ink `#201E1F`, silver `#D8D8D8`.
  - Times in IST with a label. Use `formatIST` / `getTodayString` / `parseDbTimestamp` from `lib/date-utils.ts`.
- Payroll rules are in §0 item 10 of the QA file.

## Environment facts (save yourself time)

### Database
- The prod DB is the Neon project **"CRM"** (`tiny-night-26058388`, `aws-us-east-2`). The Neon MCP works for read-only checks and idempotent DDL.
- The local `.env` `DATABASE_URL` password is stale (`28P01`). `pnpm db:apply-pending` fails locally.
- Prod migrations are applied through 0161. `drizzle.__drizzle_migrations` has 21 rows.
- To apply a new migration through Neon: run its SQL, then insert its sha256 + journal `when` into `drizzle.__drizzle_migrations`. The deploy step (`pnpm db:migrate:deploy` in `vercel.json`) then skips it.
- New migrations:
  - `pnpm drizzle-kit generate --name x` writes the file as `01xx_…`.
  - Rename it to the next `01NN` after 0161 (file, `meta/<n>_snapshot.json`, journal tag).
  - Use `IF NOT EXISTS`, and check `pnpm db:generate` says "No schema changes".
  - `scripts/apply-pending-migrations.ts` auto-applies every `drizzle/NNNN_*.sql` numbered above 0158.

### Builds and installs
- `pnpm build` cannot run in the sandbox: Turbopack needs port binding, and webpack hung. Vercel's build is the build check. Lint/typecheck/tests must pass.
- `pnpm install` needs network to `registry.npmjs.org`.
  - In the sandbox it can wipe node_modules: EPERM on a `.vscode/settings.json` inside a package. Run it unsandboxed with `CI=true`.

### Auto mode
- Auto mode blocks deleting prod rows. Ask Tarun.

### Services
- Inngest is not connected on prod (`/api/inngest` returns 500). Scheduled jobs run from `vercel.json` cron routes.
- Upstash env vars must be set for the shared rate limiter and cache.

## Already done (ticked): 62 items

SEC-0001 R3-0002 MIYO-0004 MIYO-0010 MIYO-0062 MIYO-0064 MIYO-0065 MIYO-0067 MIYO-0068 MIYO-0069 MIYO-0070 MIYO-0072 MIYO-0073 MIYO-0074 MIYO-0077 MIYO-0078 MIYO-0081 MIYO-0082 MIYO-0083 MIYO-0084 MIYO-0085 MIYO-0086 MIYO-0087 MIYO-0089 MIYO-0090 MIYO-0091 MIYO-0093 MIYO-0094 MIYO-0095 MIYO-0096 MIYO-0097 MIYO-0099 MIYO-0100 QA-0003 QA-0005 QA-0010 QA-0012 QA-0014 QA-0016 QA-0017 QA-0019 QA-0020 QA-0021 QA-0023 QA-0025 QA-0027 QA-0030 QA-0031 QA-0033 R3-0004 R3-0005 R3-0006 R3-0007 R3-0008 R3-0009 R3-0019 SEC-0002 SEC-0003 SEC-0004 SEC-0005 SEC-0006 SEC-0007

## Shared helpers added — reuse them, do not re-create

| Helper | What it is for |
|---|---|
| `lib/auth/role-assignment.ts` `checkRoleAssignment` | Every write of a system role. A test in `lib/auth/role-writers.test.ts` enforces it. |
| `lib/auth/live-session.ts` `liveAuth` / `sessionRevocationState` | Server actions import `liveAuth as auth`. |
| `lib/api/submit-guard.ts` `rejectDuplicateSubmit(scope, userId, body)` | Double-submit 409 for create routes. |
| `lib/db/escape-like.ts` `likePattern` / `escapeLike` | Every ILIKE. |
| `lib/db/encrypted-columns.ts` | `encryptedText` / `encryptedJson`, for PII at rest. Backfill script: `scripts/encrypt-pii-backfill.ts`. Tarun runs it. |
| `lib/email-templates/render.ts` `renderEmail(id, vars)` | Escapes vars in the HTML only. |
| `lib/email/sender.ts` `sendTemplateEmail(id, { to, vars })` | Sends the hand-written .txt part. Move each existing sender onto it (MIYO-0098 and the per-template items). |
| `lib/hr/deduct-leave-balance.ts` `deductApprovedLeaveBalance` / `restoreApprovedLeaveBalance` | Leave balance debit and restore. |
| `lib/constants/roles.ts` | `isPayrollApprover`, `isExitFinalApprover` (CEO or Admin), `canManageHolidays`. |
| `lib/rbac/route-permissions.ts` | Only real permission names. Leave approve/reject are left to the approver chain. |
| `lib/date-utils.ts` `parseDbTimestamp` | Naive DB timestamps are UTC. |
| `next/server` `after()` | For emails sent after a response. |

## Open items to pick up first

### Phase 2 — code done, needs a live check (leave unticked)
- MIYO-0063: dashboard summary endpoint added; widgets still separate, so ≤4 calls not reached.
- MIYO-0066: index applied; EXPLAIN not run.
- MIYO-0088: approvals tab badges.
- QA-0015: `/hr/analytics` 404/500 needs repro.
- R3-0020: historical approved leaves not backfilled.
- R3-0021: `/ai` crash not reproduced.
- MIYO-0098: move remaining senders to `sendTemplateEmail`.

### Phase 2 — not started
- **R3-0200:** dashboard 6–20s, `/api/hr/dashboard/headcount-trends` 25s. Its 12 per-month count queries should be one SQL.
- **R3-0201:** 4 BROKEN responsive cells: `/hr/payroll` @375, `/hr/holidays` @375/@768, `/hr/documents` @1024.

### Blocked
- MIYO-0075: decision D3 (half-day threshold).
- MIYO-0092: D-ENV (connect Inngest).

### Phase 1 — open, all need prod
- MIYO-0002: confirm "applied:" in the next deploy log.
- MIYO-0013: smoke test after deploy.
- MIYO-0017: run `POST /api/hr/payrolls/recompute` on DRAFT payrolls.

### Prod data for Tarun to delete (QA race rows)
- departments 11–16 "QA3 Race Dept"
- holidays 6–8 "QA3 Race Day"

## Then continue in order

1. Phase 3 (90 Medium)
2. Phase 4 (240 Low/design/responsive)
3. Phase 5 (7 hardening steps)
4. Phase 6 ATS build (62 items, MIYO-0626–0687; architecture in the QA file §8, decision D8)
5. Phase 7 Knowledge Base port (169 items; defaults D-KB1..6)

When a phase is done, give Tarun one status line per item, `ITEM-ID | pass/fail | committed`, plus anything blocked.
