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
