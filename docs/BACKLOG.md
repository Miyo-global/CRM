# Backlog — hardening pass

Every ticket below is backed by a measurement, not a hunch. Numbers come from
`node scripts/find-dead-code.mjs`, a resolved-import-graph scan of the 692 API
routes, and row counts taken against the live database.

## Context: what is already good

Measured before proposing any work, because the cheapest ticket is the one you
do not open:

| Property | Measured |
|---|---|
| API routes accepting unvalidated input | 0 of 692 (after MIYO-1 in the previous pass) |
| Routes missing an auth wrapper | 0 genuine — cron uses `verifyCronSecret` + idempotency, webhooks verify signatures, public endpoints are rate-limited |
| Uploads | size + MIME allowlist + magic-byte sniffing |
| Unreachable modules | 0 of 2202 |
| DB tables unreferenced by code | 3 of 236 |

The architecture is sound. These tickets target the one real gap: **business
logic that computes money or produces legally binding documents, with no tests
behind it.**

---

## MIYO-2 — Drop three orphaned tables

**Type:** chore · **Risk:** medium (irreversible) · **Status:** DONE

`module_links` (0 rows), `crm_views` (0 rows) and `employee_devices` (4 rows)
have no reference anywhere in application code. Confirmed against `git grep` at
HEAD, so this is not fallout from the previous deletion pass.

**Acceptance**
- All three tables removed from the Drizzle schema and from the database.
- Rows backed up (with DDL) before the drop; backup path reported to the owner.
- `pnpm typecheck`, `next build` and the full test suite stay green.

---

## MIYO-3 — Payslip view model is untested and computes money

**Type:** bug-risk · **Risk:** high · **Status:** DONE — 3 defects found and fixed

`lib/hr/payslip-view-model.ts` (223 lines, zero I/O dependencies) turns a
payroll row into the figures an employee actually reads on their payslip. It
has no tests. Reading it surfaced three suspected defects:

1. `ptAmount` falls back to `"200"` when the column is null, so a payroll row
   with no professional tax still shows a ₹200 deduction line. The itemised
   lines then disagree with `totalDeductions`, which is read straight from the
   database — an internally inconsistent payslip.
2. `monthLabel` calls date-fns `format()` on `new Date(month + "-01")` without
   checking validity. A malformed `month` throws `RangeError` and takes down
   payslip generation instead of degrading.
3. `toWordsInr()` is undefined for negative input — `helper()` never handles a
   sign, so a negative net produces silent nonsense rather than an error.

**Seam under test:** the module's public exports —
`buildPayslipViewModelFromPayroll()`, `toWordsInr()`, `fmtInr()`. Pure
functions, no mocking required.

**Acceptance**
- Each defect above is reproduced by a failing test before it is fixed.
- Itemised deductions reconcile with the stated total, or the mismatch is
  surfaced rather than hidden.
- Malformed input degrades to a readable label instead of throwing.

---

## MIYO-4 — Letter token substitution is untested and produces legal documents

**Type:** bug-risk · **Risk:** high · **Status:** DONE — prototype-chain leak found and fixed

`applyOfferTokens()` and `applyHrLetterTokens()` substitute `{{token}}`
placeholders into offer letters, appointment letters and termination letters.
Untested. A missed token ships a legally binding document reading
"Dear {{candidateName}}", and a wrong salary token misstates compensation.

**Seam under test:** `applyOfferTokens(body, vars)`,
`buildOfferLetterVars(...)`, `normalizeVariableKey()`, `isValidVariableKey()`,
`applyHrLetterTokens(body, vars)`. Pure functions.

**Acceptance**
- Known tokens substitute; unknown tokens have defined, tested behaviour.
- Whitespace variants (`{{ name }}`) resolve identically to `{{name}}`.
- Substituted values cannot themselves be re-interpreted as tokens.

---

## MIYO-5 — Test coverage is the standing weakness

**Type:** epic · **Risk:** high · **Status:** open, not addressed in this pass

52 test files for ~308k lines, concentrated in `lib/validations`. Almost none
of the 692 routes have an integration test. This is what makes future
refactoring risky, and it is a bigger body of work than one pass. MIYO-3 and
MIYO-4 are the first two slices.

---

## Outcome of this pass

| Ticket | Result |
|---|---|
| MIYO-2 | 3 tables + 1 orphaned enum dropped via `drizzle/0150_drop_orphaned_tables.sql`. Rows exported with DDL first. Zero inbound FKs verified before the drop. |
| MIYO-3 | 3 defects found by test, all fixed: fabricated professional-tax line, malformed month silently rendering as "January 2001", negative net rendering as " Rupees Only". |
| MIYO-4 | Prototype-chain leak in both letter-token paths: `{{toString}}` rendered "function toString() { [native code] }" into offer and termination letters. Fixed with `Object.hasOwn`. |

Test count over the pass: 473 → 495. Suite, typecheck, lint (0 errors), production
build and `lint:dead-code` all green at every commit.

**MIYO-5 remains open** and is the largest standing risk.
