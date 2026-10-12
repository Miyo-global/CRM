# UI revamp baseline (Phase 0, 11 Oct 2026)

Branch `feat/ui-revamp-gold-ink` cut from `main` @ 5f11b3c.

## Checks before any change

| Check | Result |
|---|---|
| `pnpm typecheck` | Clean (first run failed only on stale `.next/types` for removed social-media routes; clean after a fresh build) |
| `pnpm lint` | 0 errors, 501 warnings (pre-existing, mostly `max-lines`) |
| `pnpm test` | 72 files, 662 tests passed |
| `pnpm build` | Passes. Needs local port binding (Turbopack spawns PostCSS workers), so it fails inside a restricted sandbox |

## §5.6 grep counts (matching lines)

```
1 hex:      698
2 rgb:       41
3 arb-color:       10
4 palette:     1544
5 legacy:      546
6 fonts:       11
7 arb-size:     1341
8 bw:      217
9 dark:      718  files-outside-ui:       86
10 oldhex:      140
```

Run `bash scripts/ui-revamp-greps.sh` from the repo root to re-check.

## Screenshots

`docs/ui-revamp-screenshots/before/`: landing, signin, careers (light). Authenticated pages were not captured: the demo accounts from `scripts/seed-demo-accounts.ts` do not exist in the configured database, and seeding it was out of scope.

## Final results (Phase 10)

| Check | Result |
|---|---|
| `pnpm typecheck` | Clean |
| `pnpm lint` | 0 errors (391 warnings, all pre-existing rule hits such as `max-lines`) |
| `pnpm test` | 637 passed (count dropped from 662 because `main` removed the CRM/billing modules and their tests) |
| `pnpm build` | Passes |
| `pnpm lint:dead-code` | 10 unreachable server modules left behind by `main`'s CRM/billing removal (`lib/ai/smart-notification.ts`, `lib/notifications/send.ts`, `server/lib/lead-triggers.ts`, `server/queries/{crm-accounts,duplicate-leads,invoice,leads,sales-dashboard}.ts`, `types/{invoice,leads}.ts`). Not touched here: outside the UI scope. |

### §5.6 greps

```
1 hex:       17
2 rgb:        1
3 arb-color:  0
4 palette:    4
5 legacy:     5
6 fonts:      3
7 arb-size:   0
8 bw:         0
9 dark:       3  files-outside-ui: 2
10 oldhex:    0
```

Every remaining hit is an accepted exception or a false positive:

- **hex (17):** status/label colour defaults written to the database by `app/api/projects/**` (data, not UI); the hex example and placeholder for the organisation brand-colour input; two fixtures in `lib/sanitize.test.ts`.
- **rgb (1):** the `hexRgb()` helper in `lib/termination-letter-pdf.ts`, which pdf-lib requires.
- **palette (4):** `bg-teal-500`/`bg-teal-700`/`border-teal-500` in `lib/design/tones.ts`. `teal` is one of the new Gold & Ink data scales; the grep can't tell it from Tailwind's teal.
- **legacy (5):** three `@/components/ui/filter-chip` import paths, "Have a glass of water nearby" in an interview reminder email, and the `--selection` token.
- **fonts (3):** `lib/security/csp.ts` (security headers, out of scope) and the email template importing Plus Jakarta Sans from Google Fonts. Email clients can't use `next/font`.
- **dark: (3):** the switch track (allowed by §6.1), a JS parameter named `dark` in the theme preview, and the QR library's `dark` colour option.

The spec's grep #5 also matched new scale tokens such as `bg-gold-400` (`-gold\b`), which §5.3 itself prescribes. `scripts/ui-revamp-greps.sh` narrows it to the bare legacy `gold` token.

### Screenshots

`docs/ui-revamp-screenshots/after/`: landing (light and dark), signin, signup, careers, both token pages (error state), 404, and mobile signin (light and dark). Logged-in pages still need a test account to capture.
