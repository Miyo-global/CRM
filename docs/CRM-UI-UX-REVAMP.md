# Miyo Global CRM — Complete UI/UX Revamp Spec (for Claude Code)

> **Who this is for:** Claude Code, running inside `/Users/tarunchintakunta/office/miyoglobal/crm` (repo `github.com/Miyo-global/CRM`).
> **What to do:** Replace 100% of the current visual layer (tokens, colors, fonts, component styling, layouts, page compositions) with the new **Miyo "Gold & Ink"** design system derived from the logo, and improve UX end-to-end — **without changing any behavior, data, API, or business logic.**
> Work through §11 phase by phase and tick every checkbox. Do not skip phases. Do not stop until §12 acceptance criteria all pass.

---

## 0. TL;DR for Claude

1. `git checkout main && git pull && git checkout -b feat/ui-revamp-gold-ink` — never commit to `main`.
2. Rewrite `globals.css` from scratch using §3 (tokens) — delete every legacy class listed in §5.1.
3. Swap fonts to Montserrat (display) + Plus Jakarta Sans (UI) + IBM Plex Mono via `next/font/google` (§3.4).
4. Restyle every primitive in `components/ui/*` (§6), then the app shell (§7), then every route (§8 + Appendix A).
5. Replace all hardcoded colors (902 hex literals, 3,262 raw Tailwind palette classes, 537 `gold` token usages, 1,318 arbitrary `text-[Npx]` sizes) with semantic tokens (§5).
6. Enable real dark mode (it is currently force-disabled) and add a theme switcher (§9.6).
7. After each phase: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Commit per phase. Open a PR to `main` at the end.

---

## 1. Context & current stack (from audit, 11 Oct 2026)

| Item | Current state |
|---|---|
| Framework | Next.js **16.3.8** (App Router, RSC), React **19.2.0**, TypeScript 5 |
| Styling | **Tailwind CSS v4** (CSS-first, no `tailwind.config.*`), `@tailwindcss/postcss` in `postcss.config.mjs`, single stylesheet **`globals.css` at repo root (768 lines, 24.5 KB)** imported by `app/layout.tsx` as `"../globals.css"` |
| Component kit | shadcn/ui "new-york" (`components.json`, baseColor zinc, cssVariables true, iconLibrary lucide), Radix primitives, `class-variance-authority`, `tailwind-merge`, `clsx` (`lib/utils.ts` → `cn`) |
| Theme | `next-themes` via `components/theme-provider.tsx`; **`app/layout.tsx` sets `defaultTheme="light"` + `forcedTheme="light"` → dark mode is impossible today, yet 718 `dark:` variants exist in 94 files** |
| Fonts | Google Fonts `<link>` in `app/layout.tsx` `<head>`: Inter, JetBrains Mono, Playfair Display |
| Motion | `framer-motion` (52 files), `components/providers/motion-provider.tsx` (`reducedMotion="user"`), variants in `lib/motion-variants.ts` |
| Icons | `lucide-react` (393 files), custom `components/ui/svg-icons.tsx` (2 usages), illustrations in `components/illustrations/*` (25 files) + `public/illustrations/*.svg` (undraw set + `auth-hero.svg`) |
| Charts | `recharts` (9 files) + mini charts in `components/charts/*` |
| DnD | `@hello-pangea/dnd` (11 files) — leads, deals, projects, recruitment boards |
| Calendar | `react-big-calendar` (styled by `.calendar-container .rbc-*` overrides in `globals.css`), `react-day-picker` v8 (`components/ui/calendar.tsx`) |
| Rich text | TipTap (`components/editor/tiptap-editor.tsx`, `tiptap-toolbar.tsx`) |
| Toasts | `sonner` (`components/ui/sonner.tsx`) with custom `.vc-toast*` CSS |
| Data | TanStack Query, react-hook-form + zod, Drizzle (`drizzle/`, `lib/db/`), NextAuth v5 beta, Inngest, Sentry |
| Tests | Vitest (`vitest.config.ts`, node env), 72 test files. **UI-sensitive test:** `components/ui/empty-state.test.tsx` asserts root classes `flex-1`, `w-full`, `min-h-[min(50vh,28rem)]`, `justify-center`, and that `compact` omits `min-h-` — keep these classes or update the test only if you also keep the behavior. Also `components/layout/sidebar/sidebar-nav-items.test.ts`, `components/ui/query-error-state.test.tsx`, `components/ui/min-length-hint.test.tsx`. |
| CI | `.github/workflows/pr-check.yml` runs `pnpm lint` + `pnpm build` on PRs to `main`; also `ci.yml`, `merge-protection.yml` |
| Scripts | `pnpm typecheck` (tsc --noEmit), `pnpm lint` (eslint), `pnpm test` (vitest run), `pnpm build`, `pnpm lint:dead-code` |
| Repo notes | `CLAUDE.md` says to use `graphify query` for codebase questions and run `graphify update .` after modifying code. Do that at the end of each phase. |

### 1.1 Blast radius (audit counts across `app components features hooks lib`, *.ts/*.tsx)

| Pattern | Files | Hits |
|---|---:|---:|
| Hex color literals `#abc` / `#aabbcc` | 86 | 902 |
| `rgb()/rgba()/hsl()` literals | 15 | 47 |
| Arbitrary hex classes `bg-[#…]`, `text-[#…]` … | 5 | 13 |
| Inline `style={{…}}` | 74 | 163 |
| Legacy `gold` token utilities (`text-gold`, `bg-gold/15`, …) | 140 | 537 |
| Legacy custom classes (`shadow-noir`, `glow-gold`, `gold-gradient`, …) | 55 | 122 |
| Raw Tailwind palette (`bg-emerald-500/10`, `text-red-700`, …) | 242 | 3,262 |
| `bg-white/black`, `text-white/black` … | 84 | 280 |
| `font-serif` / Playfair | 2 | 2 |
| Arbitrary font sizes `text-[10px]` etc. | 255 | 1,318 |
| `dark:` variants | 94 | 718 |
| `rounded-[…]` / `shadow-[…]` / `z-[N]` arbitrary | 6 / 3 / 3 | 15 / 5 / 4 |
| framer-motion / lucide / recharts / dnd imports | 52 / 393 / 9 / 11 | — |

Raw-palette families by frequency: amber 595, emerald 419, red 354, blue 317, green 248, purple 135, slate 103, orange 80, gray 77, yellow 57, violet 45, rose 34, pink 30, indigo 30, cyan 25, teal 21, sky 20, fuchsia 5, neutral 2.
Arbitrary sizes: `text-[10px]` 695, `text-[11px]` 435, `text-[9px]` 90, `text-[8px]` 28, `text-[13px]` 24, `text-[12px]` 24, `text-[7px]` 8.
Legacy class frequency: `shadow-noir` 64, `shadow-soft` 16, `shadow-gold` 7, `noir-mesh` 6, `gold-text` 5, `gold-gradient` 4, `glow-gold` 4, `press-scale` 3, `vc-toast*` 7, `shadow-medium` 1, `noir-grain` 1 (**used on `<body>` but never defined**), `nav-item` 1, `gradient-gold` 1, `gradient-brand` 1.

**Hotspot files (fix these first; counts = matches):**
- Raw palette: `lib/theme-constants.ts` (76), `features/hr/analytics/analytics-sections.tsx` (76), `features/hr/performance/appraisals-tab.tsx` (31), `features/auth/auth-right-panel.tsx` (31), `app/(public)/offer-acceptance/[token]/page.tsx` (29), `app/(dashboard)/hr/leaves/leaves-shared.tsx` (29), `features/landing/landing-page.tsx` (27), `features/hr/documents/document-table.tsx` (22), `features/crm/leads/detail/lead-types.ts` (19), `app/(public)/interview-booking/[token]/page.tsx` (19), `features/hr/recruitment/kanban/types.ts` (18), `features/dashboard/hr-widgets.tsx` (18), `app/(dashboard)/hr/recognition/page.tsx` (17), `components/dashboard/widgets/announcements-widget.tsx` (16), `app/(dashboard)/crm/reports/page.tsx` (16), `features/hr/expenses/expense-constants.ts` (15), `features/crm/shared/constants.ts` (15), `app/(dashboard)/settings/audit-log/page.tsx` (15), `app/(dashboard)/projects/[projectId]/epics/page.tsx` (15), `app/(dashboard)/crm/deals/win-loss/page.tsx` (15), `app/(dashboard)/ai/page.tsx` (14), `features/hr/recruitment/candidates-list/candidates-list-shared.ts` (13), `features/crm/leads/leads-constants.ts` (13), `features/crm/leads/lead-table/types.ts` (13), `features/crm/leads/lead-detail-sheet.tsx` (13), `app/(dashboard)/hr/incentives/page.tsx` (13), `app/(dashboard)/hr/career-ladders/page.tsx` (13), `app/(dashboard)/hr/career-ladders/[id]/page.tsx` (13), `app/(dashboard)/crm/page.tsx` (13), `features/landing/landing-shared.tsx` (12).
- Color-map `.ts` files (status/priority/tone maps): `lib/theme-constants.ts`, `lib/utils.ts`, `lib/password-utils.ts`, `features/crm/leads/lead-table/types.ts`, `features/crm/leads/detail/lead-types.ts`, `features/crm/leads/leads-constants.ts`, `features/crm/shared/constants.ts`, `features/hr/attendance/attendance-utils.ts`, `features/hr/expenses/expense-constants.ts`, `features/hr/recruitment/candidates-list/candidates-list-shared.ts`, `features/hr/recruitment/kanban/types.ts`, `features/hr/find-expert/constants.ts`, `features/hr/skills/cert-status.ts`.
- `gold` token: `features/hr/find-expert/find-expert-view.tsx` (17), `app/(dashboard)/hr/employees/skills-matrix/page.tsx` (11), `app/(dashboard)/ceo/qr-code/page.tsx` (10), `app/(dashboard)/crm/contacts/page.tsx` (9), `features/crm/leads/csv-upload-dialog.tsx` (8), `app/(dashboard)/support/page.tsx` (7), `app/(dashboard)/notifications/page.tsx` (7), `app/(dashboard)/crm/organizations/[organizationId]/page.tsx` (7), …
- Arbitrary hex classes: `app/(public)/interview-booking/[token]/page.tsx`, `app/(public)/offer-acceptance/[token]/page.tsx`, `features/landing/landing-page.tsx`, `features/landing/landing-footer.tsx`, `features/auth/auth-right-panel.tsx`.
- In-app hex/rgb (charts etc.): `app/(dashboard)/projects/[projectId]/analytics/page.tsx` (31), `app/(dashboard)/crm/analytics/page.tsx` (12), `features/calendar/calendar-view.tsx` (10), `features/landing/landing-page.tsx` (8), `features/crm/shared/constants.ts` (7), `components/projects/burndown-chart.tsx` (7), `components/illustrations/_shared.tsx` (7), `app/(dashboard)/crm/deals/page.tsx` (7), `features/calendar/event-detail-sheet.tsx` (6), `features/crm/analytics/{lead-volume,pipeline-funnel,deal-value}-chart.tsx`, `app/(dashboard)/ceo/qr-code/page.tsx`, `app/(dashboard)/hr/onboarding/[userId]/page.tsx`, `components/hr/self-edit-profile-form.tsx`, `components/ui/button.tsx` (`rgba(200,162,46,0.3)` glow).
- Out-of-app hex (emails/PDFs — see §5.5): `lib/email-templates/*.ts` (13 files), `lib/email.ts`, `lib/email/hr-payroll.ts`, `lib/notifications/email.ts`, `lib/inngest/functions/{candidate-feedback-email,offer-deadline-reminder,interview-reminders,interview-no-show}.ts`, `lib/hr/payslip-html.ts`, `lib/hr/payslip-branded-pdf.tsx`, `lib/hr/offer-letter-branded-pdf.tsx`, `lib/termination-letter-pdf.ts`, `components/expenses/expense-export/pdf-renderer.tsx`, `lib/qr-code.ts`, `lib/calendar-event-notifications.ts`, `app/api/cron/scheduled-reports/route.ts`, `app/api/hr/employees/[employeeId]/profile-pdf/route.ts`.
- **Do not touch:** `lib/db/schema/projects.ts` (`.default("#3B82F6")` column defaults — DB schema), anything in `drizzle/`.

### 1.2 Inventory covered by this spec
- **172 routes** (`page.tsx`): 9 auth, 155 dashboard, 7 public, 1 root. Plus 6 layouts (`app/layout.tsx`, `app/(auth)/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/(public)/layout.tsx`, `app/(dashboard)/crm/settings/layout.tsx`, `app/(dashboard)/projects/[projectId]/layout.tsx`), 115 `loading.tsx`, 117 `error.tsx`, `app/not-found.tsx`, `app/(dashboard)/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, and 27 route-local components (e.g. `app/(dashboard)/projects/project-card.tsx`, `app/(dashboard)/hr/leaves/*.tsx`, `app/(dashboard)/hr/recruitment/candidates/[candidateId]/_components/*`).
- **~470 component files**: `components/` (172 .tsx incl. 50 ui primitives + 3 ui tests), `features/` (195 .tsx), route-local 27.
- Archetype split (Appendix A): A · Auth: 9, C · Calendar/Timeline: 2, D · Detail: 11, F · Form/Editor: 8, H · Hub: 8, K · Board: 6, L · List/Workspace: 83, M · Marketing: 1, P · Public: 7, R · Report: 11, S · Settings: 23, W · Wrapper: 3.

---

## 2. Hard rules (non-negotiable)

1. **Visual/UX layer only.** Do NOT change: business logic, data fetching/mutations (TanStack Query hooks in `lib/api/hooks/*`, `lib/hooks/*`), API routes (`app/api/**`), server actions, `server/**`, `middleware.ts`, auth (`lib/auth/**`, NextAuth config), RBAC (`lib/rbac/**`, role checks, `components/shared/dashboard-gate.tsx` logic), DB/Drizzle (`lib/db/**`, `drizzle/**`, `drizzle.config.ts`), Inngest functions' logic, env handling, `next.config.ts` security headers, Sentry config.
2. Keep every prop signature and export name of shared components **backward compatible** (you may add optional props / variants). If you rename a file, leave a re-export.
3. Keep all user-visible text/labels/URLs unless the spec explicitly says to change copy. Keep all `aria-*`, `data-testid`, `id`, and `name` attributes.
4. Never commit to `main`. Branch: `feat/ui-revamp-gold-ink`. One commit per phase (`style(ui): phase N – …`). Open a PR to `main` titled **"UI/UX revamp: Gold & Ink design system"** with before/after screenshots of: signin, dashboard, CRM hub, leads board, deal detail, employees, payroll, project board, settings, careers.
5. After every phase run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Zero new errors; fix before moving on. Do not disable lint rules or add `@ts-ignore` to get green.
6. No new heavy dependencies. Allowed additions: none required. (`next/font` is built-in.) Do not remove existing deps.
7. Don't edit `public/logo.svg`, `public/logo.png`, `public/logo-wordmark.png`, `app/icon.svg` (brand masters).
8. Don't touch untracked local files: `scripts/generate-miyo-payslips.ts`, `.omc/`, `.env*`.
9. Accessibility floor: WCAG 2.2 AA for all text and interactive states; never use gold-400 (`#D4AF37`) as a text color on light surfaces or put white text on it.
10. Respect `prefers-reduced-motion` everywhere.

---

## 3. The new design system — "Gold & Ink"

### 3.1 Brand extraction (from the logo files)
- `public/logo.png` / `public/logo.svg` (the SVG embeds a 512×512 PNG; no vector fills): a **gold circle with a bold geometric sans "MI" in near-black**.
- `public/logo-wordmark.png`: "MI" in the gold circle + "YO" in light silver, on a near-black background.
- Sampled (median of opaque pixels):
  - **Miyo Gold `#D4AF37`** (oklch 0.767 0.139 91°) — circle fill (wordmark sample `#D2AE37`).
  - **Miyo Ink `#201E1F`** (oklch 0.238 ~0 —) — letterforms and wordmark background.
  - **Miyo Silver `#D8D8D8`** — "YO" letters in the wordmark.
- Personality: premium, confident, high-contrast, geometric. **Design direction:** warm off-white canvas, ink typography and chrome, gold used sparingly as the single brand accent (primary CTAs, active states, focus, key data), circles as the recurring motif (from the logo's circle).

> The previous palette (gold `#bd882c`/`#d4a23a` + navy `#0f2b7f`, navy-black sidebar `#0f1120`, cool grey `#f8f8fc` canvas, zinc base) is **retired entirely** — including the navy "blue" brand color. Nothing from it survives.

### 3.2 Color scales (generated in OKLCH from the logo colors; hex below is final)

**Brand & neutral**

| Step | gold | ink |
|---|---|---|
| 50 | `#FDF7E4` | `#FBFAF6` |
| 100 | `#F8ECCC` | `#F5F3EF` |
| 200 | `#EFDBA3` | `#E8E6E2` |
| 300 | `#E2C56F` | `#D5D4D0` |
| 400 | `#D4AF37` | `#A6A4A0` |
| 500 | `#BF9A15` | `#7B7A76` |
| 600 | `#9B7C07` | `#5C5B57` |
| 700 | `#796001` | `#43423F` |
| 800 | `#5B4803` | `#2C2B28` |
| 900 | `#423300` | `#201E1F` |
| 950 | `#281E00` | `#100F0D` |

`gold-400` = the exact logo gold; `ink-900` = the exact logo ink. Neutrals ("ink") are warm-tinted at the gold hue so greys harmonize with gold. `silver` = `#D8D8D8` (use only for the wordmark-on-dark and decorative dividers on ink surfaces).

**Semantic & data scales**

| Step | success | warning | danger | info | teal | plum |
|---|---|---|---|---|---|---|
| 50 | `#E9FDEC` | `#FFF5EE` | `#FFF4F2` | `#F3F7FF` | `#EAFBF8` | `#F7F5FF` |
| 100 | `#D5F8DA` | `#FFE8D9` | `#FFE7E3` | `#E4EDFF` | `#D5F5EF` | `#EDEAFF` |
| 200 | `#B1EEBB` | `#FED2B6` | `#FED0C9` | `#CBDDFF` | `#B2E9E1` | `#DDD6FE` |
| 300 | `#84E096` | `#FFB481` | `#FFB0A6` | `#ABC8FE` | `#86D9CE` | `#C9BDFF` |
| 400 | `#5CCE78` | `#FD9444` | `#FE8E82` | `#8AB2FE` | `#5FC7BA` | `#B6A2FF` |
| 500 | `#3BBA60` | `#EC7C11` | `#FF6459` | `#6A9BFD` | `#40B3A6` | `#A486FE` |
| 600 | `#25984A` | `#C16303` | `#DC4039` | `#3E78F2` | `#2B9287` | `#8861E9` |
| 700 | `#137736` | `#974C00` | `#AF2C28` | `#2C5CC1` | `#197269` | `#6A48BA` |
| 800 | `#095A26` | `#733802` | `#861E1B` | `#1E4495` | `#0E564F` | `#50358F` |
| 900 | `#004218` | `#552700` | `#65100E` | `#123071` | `#023F39` | `#3A236C` |
| 950 | `#00280B` | `#351500` | `#420102` | `#051A4C` | `#002622` | `#231049` |

Warning is deliberately **orange** (hue ~55°), not yellow/amber, so it is never confused with brand gold. Teal and Plum exist only for data-viz categories and tag colors.

### 3.3 Semantic tokens (CSS variables). Light & dark.

Keep shadcn's semantic **names** (components depend on them) but **every value is new**. Add the new tokens listed. Remove `--gold`, `--blue`, `--font-inter`, `--font-jetbrains`, `--font-playfair`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | ink-50 `#FBFAF6` | ink-950 `#100F0D` | App canvas |
| `--foreground` | ink-900 `#201E1F` | ink-50 `#FBFAF6` | Body text |
| `--card` / `--card-foreground` | `#FFFFFF` / ink-900 | ink-900 `#201E1F` / ink-50 | Cards, tables |
| `--popover` / `--popover-foreground` | `#FFFFFF` / ink-900 | ink-800 `#2C2B28` / ink-50 | Menus, popovers |
| `--surface-sunken` | ink-100 `#F5F3EF` | `#0A0908` | Wells, table header, code |
| `--surface-raised` | `#FFFFFF` | ink-800 `#2C2B28` | Sheets, dialogs |
| `--primary` | gold-400 `#D4AF37` | gold-400 `#D4AF37` | Primary buttons, active indicators |
| `--primary-hover` | gold-500 `#BF9A15` | gold-300 `#E2C56F` | Hover of primary |
| `--primary-foreground` | ink-900 `#201E1F` | ink-950 `#100F0D` | Text/icons on primary |
| `--brand-text` | gold-700 `#796001` | gold-300 `#E2C56F` | Links, brand-colored text |
| `--brand-soft` / `--brand-soft-foreground` | gold-50 `#FDF7E4` / gold-800 `#5B4803` | gold-950 `#281E00` / gold-300 | Selected rows, brand badges |
| `--secondary` / `--secondary-foreground` | ink-900 / `#FFFFFF` | ink-100 `#F5F3EF` / ink-900 | "Ink" button |
| `--muted` | ink-100 `#F5F3EF` | ink-800 `#2C2B28` | Muted fills |
| `--muted-foreground` | ink-600 `#5C5B57` | ink-400 `#A6A4A0` | Secondary text |
| `--subtle-foreground` | ink-500 `#7B7A76` | ink-500 | Placeholder, disabled text (≥ 4.3:1 on white; use only ≥ 14px or non-essential) |
| `--accent` / `--accent-foreground` | ink-100 / ink-900 | ink-800 / ink-50 | Hover fills for ghost items (NOT gold) |
| `--border` | ink-200 `#E8E6E2` | `color-mix(in oklab, #FFFFFF 9%, transparent)` | Decorative borders/dividers |
| `--border-strong` | ink-300 `#D5D4D0` | `color-mix(in oklab, #FFFFFF 16%, transparent)` | Card hover, table outer border |
| `--input` | ink-500 `#7B7A76` (border of form controls) | ink-500 | Form control borders (≥ 3:1 vs surface) |
| `--ring` | gold-600 `#9B7C07` | gold-400 `#D4AF37` | Focus ring (2px + 2px offset) |
| `--success` / `-foreground` | success-700 `#137736` / `#FFFFFF` | success-400 `#5CCE78` / ink-950 | Solid success |
| `--success-soft` / `--success-strong` | success-50 `#E9FDEC` / success-700 | `color-mix(in oklab, #3BBA60 16%, transparent)` / success-300 `#84E096` | Status pills |
| `--warning` / `-foreground` | warning-700 `#974C00` / `#FFFFFF` | warning-400 `#FD9444` / ink-950 | |
| `--warning-soft` / `--warning-strong` | warning-50 `#FFF5EE` / warning-700 | `color-mix(in oklab, #EC7C11 16%, transparent)` / warning-300 `#FFB481` | |
| `--destructive` / `-foreground` | danger-700 `#AF2C28` / `#FFFFFF` | danger-500 `#FF6459` / ink-950 | |
| `--danger-soft` / `--danger-strong` | danger-50 `#FFF4F2` / danger-700 | `color-mix(in oklab, #FF6459 16%, transparent)` / danger-300 `#FFB0A6` | |
| `--info` / `-foreground` | info-700 `#2C5CC1` / `#FFFFFF` | info-400 `#8AB2FE` / ink-950 | |
| `--info-soft` / `--info-strong` | info-50 `#F3F7FF` / info-700 | `color-mix(in oklab, #6A9BFD 16%, transparent)` / info-300 `#ABC8FE` | |
| `--neutral-soft` / `--neutral-strong` | ink-100 / ink-700 `#43423F` | `color-mix(in oklab, #FFFFFF 8%, transparent)` / ink-300 | Draft / inactive / unknown |
| `--teal-soft` / `--teal-strong` | teal-50 `#EAFBF8` / teal-700 `#197269` | `color-mix(in oklab, #40B3A6 16%, transparent)` / teal-300 `#86D9CE` | Tags |
| `--plum-soft` / `--plum-strong` | plum-50 `#F7F5FF` / plum-700 `#6A48BA` | `color-mix(in oklab, #A486FE 16%, transparent)` / plum-300 `#C9BDFF` | Tags |
| `--sidebar` | ink-900 `#201E1F` | `#0A0908` | Sidebar is ink in BOTH modes (brand surface) |
| `--sidebar-foreground` | ink-300 `#D5D4D0` | ink-300 | Nav labels |
| `--sidebar-muted` | ink-400 `#A6A4A0` | ink-500 | Group labels |
| `--sidebar-primary` / `-foreground` | gold-400 / ink-950 | gold-400 / ink-950 | Active indicator, logo chip |
| `--sidebar-accent` / `-foreground` | `color-mix(in oklab, #FFFFFF 7%, transparent)` / `#FFFFFF` | same | Active/hover row |
| `--sidebar-border` | `color-mix(in oklab, #FFFFFF 8%, transparent)` | same | |
| `--sidebar-ring` | gold-400 | gold-400 | |
| `--chart-1…8` | gold-500 `#BF9A15`, ink-700 `#43423F`, info-600 `#3E78F2`, teal-600 `#2B9287`, plum-600 `#8861E9`, warning-500 `#EC7C11`, success-600 `#25984A`, danger-500 `#FF6459` | gold-400, ink-300 `#D5D4D0`, info-400, teal-400 `#5FC7BA`, plum-400 `#B6A2FF`, warning-400, success-400, danger-400 `#FE8E82` | Categorical series in this order |
| `--chart-grid` / `--chart-axis` | ink-200 / ink-500 | `color-mix(in oklab, #FFFFFF 8%, transparent)` / ink-400 | Recharts grid & ticks |
| `--overlay` | `color-mix(in oklab, #100F0D 55%, transparent)` | `color-mix(in oklab, #000 70%, transparent)` | Dialog/Sheet scrim |
| `--selection` | `color-mix(in oklab, #D4AF37 35%, transparent)` | same | `::selection` |

### 3.4 Contrast verification (WCAG 2.x, computed)

| Pair | Fg | Bg | Ratio | Result |
|---|---|---|---|---|
| L text fg on bg | `#201E1F` | `#FBFAF6` | 15.87:1 | AAA |
| L text fg on card | `#201E1F` | `#FFFFFF` | 16.58:1 | AAA |
| L muted-fg on bg | `#5C5B57` | `#FBFAF6` | 6.51:1 | AA |
| L muted-fg on card | `#5C5B57` | `#FFFFFF` | 6.80:1 | AA |
| L subtle (ink-500) on card | `#7B7A76` | `#FFFFFF` | 4.30:1 | AA-large/UI |
| L primary-fg ink on gold-400 (primary btn) | `#201E1F` | `#D4AF37` | 7.88:1 | AAA |
| L ink on gold-500 (hover) | `#201E1F` | `#BF9A15` | 6.19:1 | AA |
| L white on gold-400 (**forbidden pairing**) | `#FFFFFF` | `#D4AF37` | 2.10:1 | FAIL |
| L brand link gold-700 on card | `#796001` | `#FFFFFF` | 6.02:1 | AA |
| L brand link gold-700 on bg | `#796001` | `#FBFAF6` | 5.77:1 | AA |
| L gold-600 on card | `#9B7C07` | `#FFFFFF` | 3.98:1 | AA-large/UI |
| L secondary white on ink-900 | `#FFFFFF` | `#201E1F` | 16.58:1 | AAA |
| L sidebar fg ink-300 on ink-900 | `#D5D4D0` | `#201E1F` | 11.17:1 | AAA |
| L sidebar muted ink-400 on ink-900 | `#A6A4A0` | `#201E1F` | 6.66:1 | AA |
| L sidebar active gold-400 on ink-900 | `#D4AF37` | `#201E1F` | 7.88:1 | AAA |
| L success-700 on success-50 | `#137736` | `#E9FDEC` | 5.30:1 | AA |
| L warning-700 on warning-50 | `#974C00` | `#FFF5EE` | 5.84:1 | AA |
| L danger-700 on danger-50 | `#AF2C28` | `#FFF4F2` | 6.06:1 | AA |
| L info-700 on info-50 | `#2C5CC1` | `#F3F7FF` | 5.74:1 | AA |
| L white on success-700 | `#FFFFFF` | `#137736` | 5.65:1 | AA |
| L white on danger-600 (→ solid danger uses danger-700) | `#FFFFFF` | `#DC4039` | 4.34:1 | AA-large/UI |
| L white on danger-700 | `#FFFFFF` | `#AF2C28` | 6.53:1 | AA |
| L white on info-700 | `#FFFFFF` | `#2C5CC1` | 6.16:1 | AA |
| L white on warning-700 | `#FFFFFF` | `#974C00` | 6.27:1 | AA |
| L gold-800 on gold-50 (brand badge) | `#5B4803` | `#FDF7E4` | 8.26:1 | AAA |
| L decorative border ink-300 vs card (exempt; not for inputs) | `#D5D4D0` | `#FFFFFF` | 1.48:1 | FAIL |
| L ink-400 vs card (too light for input borders → use ink-500) | `#A6A4A0` | `#FFFFFF` | 2.49:1 | FAIL |
| L gold-500 vs card (too light for ring → ring uses gold-600) | `#BF9A15` | `#FFFFFF` | 2.68:1 | FAIL |
| L focus ring gold-600 vs card | `#9B7C07` | `#FFFFFF` | 3.98:1 | AA-large/UI |
| D fg ink-50 on ink-950 | `#FBFAF6` | `#100F0D` | 18.34:1 | AAA |
| D fg ink-50 on ink-900 card | `#FBFAF6` | `#201E1F` | 15.87:1 | AAA |
| D muted ink-400 on ink-950 | `#A6A4A0` | `#100F0D` | 7.70:1 | AAA |
| D muted ink-400 on ink-900 | `#A6A4A0` | `#201E1F` | 6.66:1 | AA |
| D ink-950 on gold-400 (primary btn) | `#100F0D` | `#D4AF37` | 9.11:1 | AAA |
| D gold-300 link on ink-950 | `#E2C56F` | `#100F0D` | 11.36:1 | AAA |
| D gold-400 on ink-900 | `#D4AF37` | `#201E1F` | 7.88:1 | AAA |
| D success-300 on ink-900 | `#84E096` | `#201E1F` | 10.33:1 | AAA |
| D warning-300 on ink-900 | `#FFB481` | `#201E1F` | 9.55:1 | AAA |
| D danger-300 on ink-900 | `#FFB0A6` | `#201E1F` | 9.48:1 | AAA |
| D info-300 on ink-900 | `#ABC8FE` | `#201E1F` | 9.81:1 | AAA |
| D ink-600 vs ink-900 (too dark for input borders → use ink-500) | `#5C5B57` | `#201E1F` | 2.44:1 | FAIL |
| D focus ring gold-400 vs ink-950 | `#D4AF37` | `#100F0D` | 9.11:1 | AAA |
| L input border ink-500 vs card | `#7B7A76` | `#FFFFFF` | 4.30:1 | ≥ 3:1 UI ✓ |
| D input border ink-500 vs ink-900 | `#7B7A76` | `#201E1F` | 3.86:1 | ≥ 3:1 UI ✓ |
| L focus ring gold-600 vs bg | `#9B7C07` | `#FBFAF6` | 3.81:1 | ≥ 3:1 UI ✓ |
| D muted ink-400 on ink-800 popover | `#A6A4A0` | `#2C2B28` | 5.69:1 | AA ✓ |

**Rules derived from the table:** gold-400 is a *fill*, never light-mode text (white-on-gold fails at 2.10:1 → always ink text on gold). Brand-colored text in light mode = gold-700. Decorative borders (ink-200/300) are exempt from 3:1 but every *form control* border uses `--input` (ink-500). Solid danger button uses danger-700 (white text 6.53:1), not danger-600 (4.34:1 fails).

### 3.5 Typography
Load with `next/font/google` in `app/layout.tsx` (delete the three `<link>` tags and the Google Fonts preconnects):

```ts
import { Montserrat, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
const display = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-montserrat", display: "swap" });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jakarta", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });
// <html className={`${display.variable} ${sans.variable} ${mono.variable}`} …>
```
- **Montserrat** (display) mirrors the logo's bold geometric "MI": page titles, section titles, KPI numbers, auth/landing headlines, empty-state titles. Weight 700 (titles), 800 (hero/KPI). Letter-spacing −0.01em; uppercase eyebrow labels +0.08em.
- **Plus Jakarta Sans** (UI/body): everything else. Enable `font-variant-numeric: tabular-nums` on tables, KPIs, money, dates, timers.
- **IBM Plex Mono**: IDs, ticket keys, invoice numbers, code, OTP inputs.
- **Playfair Display, Inter, JetBrains Mono are removed** (and `font-serif` usages in 2 files → `font-display`).

Type scale (Tailwind v4 `--text-*` in `@theme`); no arbitrary `text-[Npx]` allowed afterwards:

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-3xs` | 10px / 14px | 600 | **Only** count badges, avatar initials ≤ 20px, chart tick labels |
| `text-2xs` | 11px / 16px | 500–600 | Eyebrows (uppercase), table meta, chip text |
| `text-xs` | 12px / 16px | 400–500 | Helper text, captions, dense table cells |
| `text-sm` | 13px / 20px | 400–500 | **Default UI text**, table cells, inputs, buttons |
| `text-base` | 15px / 24px | 400 | Long-form text, descriptions, dialogs body |
| `text-lg` | 17px / 26px | 600 | Card titles |
| `text-xl` | 20px / 28px | 700 display | Section titles |
| `text-2xl` | 24px / 32px | 700 display | Page titles (`PageWrapper` h1) |
| `text-3xl` | 30px / 38px | 800 display | KPI values |
| `text-4xl` | 38px / 44px | 800 display | Auth headline |
| `text-5xl` | 56px / 62px | 800 display | Landing hero |

Mapping for the 1,318 arbitrary sizes: `text-[7px]|[8px]|[9px]` → `text-3xs` (and question whether the element should exist — prefer an icon or tooltip); `text-[10px]` → `text-2xs` (or `text-3xs` if it's a counter badge); `text-[11px]` → `text-2xs`; `text-[12px]` → `text-xs`; `text-[13px]`, `text-[0.8125rem]` → `text-sm`; `text-[0.9375rem]` → `text-base`; `text-[2.75rem]` → `text-4xl`.

### 3.6 Spacing, layout, radius, elevation, motion, z-index

- **Spacing:** Tailwind 4px base. Page gutter: `px-4 sm:px-6 xl:px-8`. Section gap `gap-6`, card inner `p-5`, dense card `p-4`. Max content width for reading pages: `max-w-5xl`; data pages full width.
- **Radius:** `--radius: 0.625rem` (10px). `--radius-xs 4px` (chips inside inputs), `--radius-sm 6px` (checkbox, small buttons), `--radius-md 8px` (inputs, buttons), `--radius-lg 10px` (cards, popovers), `--radius-xl 14px` (dialogs, sheets' inner panels, auth card), `--radius-2xl 20px` (landing/hero cards), `rounded-full` for avatars, status dots, pills, icon chips (**circle motif**).
- **Elevation (new, replaces `shadow-soft/medium/noir/gold`, `glow-gold`):**
  - `--shadow-xs: 0 1px 2px 0 rgb(16 15 13 / 0.05)`
  - `--shadow-sm: 0 1px 3px 0 rgb(16 15 13 / 0.08), 0 1px 2px -1px rgb(16 15 13 / 0.06)` (cards at rest)
  - `--shadow-md: 0 6px 16px -4px rgb(16 15 13 / 0.10), 0 2px 6px -2px rgb(16 15 13 / 0.06)` (hover, popovers, dropdowns)
  - `--shadow-lg: 0 16px 40px -8px rgb(16 15 13 / 0.18), 0 4px 12px -4px rgb(16 15 13 / 0.08)` (dialogs, sheets, command palette)
  - `--shadow-focus: 0 0 0 2px var(--background), 0 0 0 4px var(--ring)`
  - Dark mode: shadows at 2.5× alpha with `rgb(0 0 0 / …)`, plus cards rely on `--border` (1px) rather than shadow.
  - Expose as Tailwind `shadow-xs|sm|md|lg|focus` via `@theme` (`--shadow-*`).
- **Motion:** `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`; durations `--dur-fast 120ms` (hover/press), `--dur-base 180ms` (menus, tabs), `--dur-slow 260ms` (sheets, dialogs), `--dur-page 220ms` (page fade). Rewrite `lib/motion-variants.ts` values to these (keep export names `staggerContainer`, `fadeUp`, `fadeIn`, `slideInLeft`, …; reduce `y` offsets to 8px, stagger to 0.04s). Keep `MotionProvider` (`reducedMotion="user"`). CSS keyframes: keep names used in code (`animate-fade-up`, `animate-fade-in`, `animate-scale-in`, `animate-slide-in-right`, `animate-badge-pop`) but re-implement with new tokens; delete `gold-pulse`, `scan` unless grep shows usage (then rename to `pulse-soft`).
- **Z-index scale** (`@theme` `--z-*` + utilities): `z-base 0`, `z-sticky 20` (sticky table headers, page headers), `z-sidebar 30`, `z-topbar 40`, `z-dropdown 50`, `z-overlay 60` (scrims), `z-modal 70` (dialog/sheet), `z-popover 80` (popover inside modal, combobox), `z-toast 90`, `z-skip-link 100`. Replace the 4 arbitrary `z-[N]` (`z-[100]` mobile sheet → `z-modal`, `z-[200]` skip link → `z-skip-link`) and Sonner's `z-index: 9999` → `var(--z-toast)`.
- **Breakpoints:** Tailwind defaults (`sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`). Sidebar becomes persistent at `lg` (matches `DESKTOP_SIDEBAR_MIN_WIDTH = 1024` in `components/layout/dashboard-shell.tsx`).

### 3.7 Iconography & imagery
- Keep **lucide-react** (no new icon lib). Global defaults: `strokeWidth={1.75}`, sizes `size-4` (inline, buttons, nav), `size-5` (topbar), `size-6` (empty states). Add a `components/ui/icon.tsx` wrapper only if needed for defaults; otherwise set via CSS `[data-slot=button] svg { stroke-width: 1.75 }`.
- **Icon chips:** circular (`rounded-full size-9`) with tone-soft background + tone-strong icon. This is the logo circle motif — use for KPI cards, empty states, notification items, timeline nodes.
- Illustrations (`components/illustrations/*.tsx`, `_shared.tsx` has 7 hex): recolor to tokens via `currentColor` + CSS vars: primary strokes `var(--ink-700)`, accents `var(--gold-400)`, fills `var(--ink-100)` (dark: `var(--ink-800)`). `public/illustrations/undraw-*.svg` contain undraw's default purple (`#6c63ff`-style) — either recolor the files' accent hex to `#D4AF37` (they are static assets, allowed) or stop using them in favor of the component illustrations. `auth-hero.svg`: recolor accents to gold/ink.
- Logo usage: on ink surfaces (sidebar, auth right panel, landing hero, careers header) use `/logo.svg` (gold circle) at 28–32px + text "Miyo Global" in display 700 white with "CRM" in ink-400; on light surfaces same lockup in ink-900. Never apply gradients or `gold-text` to the brand name. Minimum clear space = 0.5× logo height.

### 3.8 The new `globals.css` (write this file from scratch; delete everything that was there)

Move to `app/globals.css`? **No** — keep the path `globals.css` at repo root (it's referenced by `app/layout.tsx` and `components.json`). Split vendor overrides into `styles/vendors/react-big-calendar.css`, `styles/vendors/sonner.css`, `styles/vendors/tiptap.css` and `@import` them from `globals.css` (Tailwind v4 supports `@import` of local CSS).

```css
@import "tailwindcss";
@import "./styles/vendors/sonner.css";
@import "./styles/vendors/react-big-calendar.css";
@import "./styles/vendors/tiptap.css";

@custom-variant dark (&:where(.dark, .dark *));

/* ── 1. Raw scales (theme-independent) ─────────────────────────── */
:root {
  --gold-50: #FDF7E4;
  --gold-100: #F8ECCC;
  --gold-200: #EFDBA3;
  --gold-300: #E2C56F;
  --gold-400: #D4AF37;
  --gold-500: #BF9A15;
  --gold-600: #9B7C07;
  --gold-700: #796001;
  --gold-800: #5B4803;
  --gold-900: #423300;
  --gold-950: #281E00;
  --ink-50: #FBFAF6;
  --ink-100: #F5F3EF;
  --ink-200: #E8E6E2;
  --ink-300: #D5D4D0;
  --ink-400: #A6A4A0;
  --ink-500: #7B7A76;
  --ink-600: #5C5B57;
  --ink-700: #43423F;
  --ink-800: #2C2B28;
  --ink-900: #201E1F;
  --ink-950: #100F0D;
  --success-50: #E9FDEC;
  --success-100: #D5F8DA;
  --success-200: #B1EEBB;
  --success-300: #84E096;
  --success-400: #5CCE78;
  --success-500: #3BBA60;
  --success-600: #25984A;
  --success-700: #137736;
  --success-800: #095A26;
  --success-900: #004218;
  --success-950: #00280B;
  --warning-50: #FFF5EE;
  --warning-100: #FFE8D9;
  --warning-200: #FED2B6;
  --warning-300: #FFB481;
  --warning-400: #FD9444;
  --warning-500: #EC7C11;
  --warning-600: #C16303;
  --warning-700: #974C00;
  --warning-800: #733802;
  --warning-900: #552700;
  --warning-950: #351500;
  --danger-50: #FFF4F2;
  --danger-100: #FFE7E3;
  --danger-200: #FED0C9;
  --danger-300: #FFB0A6;
  --danger-400: #FE8E82;
  --danger-500: #FF6459;
  --danger-600: #DC4039;
  --danger-700: #AF2C28;
  --danger-800: #861E1B;
  --danger-900: #65100E;
  --danger-950: #420102;
  --info-50: #F3F7FF;
  --info-100: #E4EDFF;
  --info-200: #CBDDFF;
  --info-300: #ABC8FE;
  --info-400: #8AB2FE;
  --info-500: #6A9BFD;
  --info-600: #3E78F2;
  --info-700: #2C5CC1;
  --info-800: #1E4495;
  --info-900: #123071;
  --info-950: #051A4C;
  --teal-50: #EAFBF8;
  --teal-100: #D5F5EF;
  --teal-200: #B2E9E1;
  --teal-300: #86D9CE;
  --teal-400: #5FC7BA;
  --teal-500: #40B3A6;
  --teal-600: #2B9287;
  --teal-700: #197269;
  --teal-800: #0E564F;
  --teal-900: #023F39;
  --teal-950: #002622;
  --plum-50: #F7F5FF;
  --plum-100: #EDEAFF;
  --plum-200: #DDD6FE;
  --plum-300: #C9BDFF;
  --plum-400: #B6A2FF;
  --plum-500: #A486FE;
  --plum-600: #8861E9;
  --plum-700: #6A48BA;
  --plum-800: #50358F;
  --plum-900: #3A236C;
  --plum-950: #231049;
  --silver: #D8D8D8;
}

/* ── 2. Semantic tokens — light ────────────────────────────────── */
:root {
  --radius: 0.625rem;
  --background: var(--ink-50);
  --foreground: var(--ink-900);
  --card: #FFFFFF;            --card-foreground: var(--ink-900);
  --popover: #FFFFFF;         --popover-foreground: var(--ink-900);
  --surface-sunken: var(--ink-100);
  --surface-raised: #FFFFFF;
  --primary: var(--gold-400); --primary-hover: var(--gold-500); --primary-foreground: var(--ink-900);
  --brand-text: var(--gold-700);
  --brand-soft: var(--gold-50); --brand-soft-foreground: var(--gold-800);
  --secondary: var(--ink-900); --secondary-foreground: #FFFFFF;
  --muted: var(--ink-100);    --muted-foreground: var(--ink-600);
  --subtle-foreground: var(--ink-500);
  --accent: var(--ink-100);   --accent-foreground: var(--ink-900);
  --border: var(--ink-200);   --border-strong: var(--ink-300);
  --input: var(--ink-500);    --ring: var(--gold-600);
  --success: var(--success-700); --success-foreground: #FFFFFF; --success-soft: var(--success-50); --success-strong: var(--success-700);
  --warning: var(--warning-700); --warning-foreground: #FFFFFF; --warning-soft: var(--warning-50); --warning-strong: var(--warning-700);
  --destructive: var(--danger-700); --destructive-foreground: #FFFFFF; --danger-soft: var(--danger-50); --danger-strong: var(--danger-700);
  --info: var(--info-700); --info-foreground: #FFFFFF; --info-soft: var(--info-50); --info-strong: var(--info-700);
  --neutral-soft: var(--ink-100); --neutral-strong: var(--ink-700);
  --teal-soft: var(--teal-50); --teal-strong: var(--teal-700);
  --plum-soft: var(--plum-50); --plum-strong: var(--plum-700);
  --chart-1: var(--gold-500); --chart-2: var(--ink-700); --chart-3: var(--info-600); --chart-4: var(--teal-600);
  --chart-5: var(--plum-600); --chart-6: var(--warning-500); --chart-7: var(--success-600); --chart-8: var(--danger-500);
  --chart-grid: var(--ink-200); --chart-axis: var(--ink-500);
  --sidebar: var(--ink-900); --sidebar-foreground: var(--ink-300); --sidebar-muted: var(--ink-400);
  --sidebar-primary: var(--gold-400); --sidebar-primary-foreground: var(--ink-950);
  --sidebar-accent: color-mix(in oklab, #FFFFFF 7%, transparent); --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: color-mix(in oklab, #FFFFFF 8%, transparent); --sidebar-ring: var(--gold-400);
  --overlay: color-mix(in oklab, var(--ink-950) 55%, transparent);
  --selection: color-mix(in oklab, var(--gold-400) 35%, transparent);
  --shadow-color: 16 15 13;
}

/* ── 3. Semantic tokens — dark ─────────────────────────────────── */
.dark {
  --background: var(--ink-950);
  --foreground: var(--ink-50);
  --card: var(--ink-900);     --card-foreground: var(--ink-50);
  --popover: var(--ink-800);  --popover-foreground: var(--ink-50);
  --surface-sunken: #0A0908;  --surface-raised: var(--ink-800);
  --primary: var(--gold-400); --primary-hover: var(--gold-300); --primary-foreground: var(--ink-950);
  --brand-text: var(--gold-300);
  --brand-soft: var(--gold-950); --brand-soft-foreground: var(--gold-300);
  --secondary: var(--ink-100); --secondary-foreground: var(--ink-900);
  --muted: var(--ink-800);    --muted-foreground: var(--ink-400);
  --subtle-foreground: var(--ink-500);
  --accent: var(--ink-800);   --accent-foreground: var(--ink-50);
  --border: color-mix(in oklab, #FFFFFF 9%, transparent); --border-strong: color-mix(in oklab, #FFFFFF 16%, transparent);
  --input: var(--ink-500);    --ring: var(--gold-400);
  --success: var(--success-400); --success-foreground: var(--ink-950); --success-soft: color-mix(in oklab, var(--success-500) 16%, transparent); --success-strong: var(--success-300);
  --warning: var(--warning-400); --warning-foreground: var(--ink-950); --warning-soft: color-mix(in oklab, var(--warning-500) 16%, transparent); --warning-strong: var(--warning-300);
  --destructive: var(--danger-500); --destructive-foreground: var(--ink-950); --danger-soft: color-mix(in oklab, var(--danger-500) 16%, transparent); --danger-strong: var(--danger-300);
  --info: var(--info-400); --info-foreground: var(--ink-950); --info-soft: color-mix(in oklab, var(--info-500) 16%, transparent); --info-strong: var(--info-300);
  --neutral-soft: color-mix(in oklab, #FFFFFF 8%, transparent); --neutral-strong: var(--ink-300);
  --teal-soft: color-mix(in oklab, var(--teal-500) 16%, transparent); --teal-strong: var(--teal-300);
  --plum-soft: color-mix(in oklab, var(--plum-500) 16%, transparent); --plum-strong: var(--plum-300);
  --chart-1: var(--gold-400); --chart-2: var(--ink-300); --chart-3: var(--info-400); --chart-4: var(--teal-400);
  --chart-5: var(--plum-400); --chart-6: var(--warning-400); --chart-7: var(--success-400); --chart-8: var(--danger-400);
  --chart-grid: color-mix(in oklab, #FFFFFF 8%, transparent); --chart-axis: var(--ink-400);
  --sidebar: #0A0908; --sidebar-foreground: var(--ink-300); --sidebar-muted: var(--ink-500);
  --overlay: color-mix(in oklab, #000 70%, transparent);
  --shadow-color: 0 0 0;
}

/* ── 4. Tailwind theme mapping ─────────────────────────────────── */
@theme inline {
  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-montserrat), var(--font-jakarta), ui-sans-serif, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular, monospace;

  --color-gold-50: var(--gold-50);
  --color-gold-100: var(--gold-100);
  --color-gold-200: var(--gold-200);
  --color-gold-300: var(--gold-300);
  --color-gold-400: var(--gold-400);
  --color-gold-500: var(--gold-500);
  --color-gold-600: var(--gold-600);
  --color-gold-700: var(--gold-700);
  --color-gold-800: var(--gold-800);
  --color-gold-900: var(--gold-900);
  --color-gold-950: var(--gold-950);
  --color-ink-50: var(--ink-50);
  --color-ink-100: var(--ink-100);
  --color-ink-200: var(--ink-200);
  --color-ink-300: var(--ink-300);
  --color-ink-400: var(--ink-400);
  --color-ink-500: var(--ink-500);
  --color-ink-600: var(--ink-600);
  --color-ink-700: var(--ink-700);
  --color-ink-800: var(--ink-800);
  --color-ink-900: var(--ink-900);
  --color-ink-950: var(--ink-950);
  --color-success-50: var(--success-50);
  --color-success-100: var(--success-100);
  --color-success-200: var(--success-200);
  --color-success-300: var(--success-300);
  --color-success-400: var(--success-400);
  --color-success-500: var(--success-500);
  --color-success-600: var(--success-600);
  --color-success-700: var(--success-700);
  --color-success-800: var(--success-800);
  --color-success-900: var(--success-900);
  --color-success-950: var(--success-950);
  --color-warning-50: var(--warning-50);
  --color-warning-100: var(--warning-100);
  --color-warning-200: var(--warning-200);
  --color-warning-300: var(--warning-300);
  --color-warning-400: var(--warning-400);
  --color-warning-500: var(--warning-500);
  --color-warning-600: var(--warning-600);
  --color-warning-700: var(--warning-700);
  --color-warning-800: var(--warning-800);
  --color-warning-900: var(--warning-900);
  --color-warning-950: var(--warning-950);
  --color-danger-50: var(--danger-50);
  --color-danger-100: var(--danger-100);
  --color-danger-200: var(--danger-200);
  --color-danger-300: var(--danger-300);
  --color-danger-400: var(--danger-400);
  --color-danger-500: var(--danger-500);
  --color-danger-600: var(--danger-600);
  --color-danger-700: var(--danger-700);
  --color-danger-800: var(--danger-800);
  --color-danger-900: var(--danger-900);
  --color-danger-950: var(--danger-950);
  --color-info-50: var(--info-50);
  --color-info-100: var(--info-100);
  --color-info-200: var(--info-200);
  --color-info-300: var(--info-300);
  --color-info-400: var(--info-400);
  --color-info-500: var(--info-500);
  --color-info-600: var(--info-600);
  --color-info-700: var(--info-700);
  --color-info-800: var(--info-800);
  --color-info-900: var(--info-900);
  --color-info-950: var(--info-950);
  --color-teal-50: var(--teal-50);
  --color-teal-100: var(--teal-100);
  --color-teal-200: var(--teal-200);
  --color-teal-300: var(--teal-300);
  --color-teal-400: var(--teal-400);
  --color-teal-500: var(--teal-500);
  --color-teal-600: var(--teal-600);
  --color-teal-700: var(--teal-700);
  --color-teal-800: var(--teal-800);
  --color-teal-900: var(--teal-900);
  --color-teal-950: var(--teal-950);
  --color-plum-50: var(--plum-50);
  --color-plum-100: var(--plum-100);
  --color-plum-200: var(--plum-200);
  --color-plum-300: var(--plum-300);
  --color-plum-400: var(--plum-400);
  --color-plum-500: var(--plum-500);
  --color-plum-600: var(--plum-600);
  --color-plum-700: var(--plum-700);
  --color-plum-800: var(--plum-800);
  --color-plum-900: var(--plum-900);
  --color-plum-950: var(--plum-950);

  --color-background: var(--background);   --color-foreground: var(--foreground);
  --color-card: var(--card);               --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);         --color-popover-foreground: var(--popover-foreground);
  --color-surface-sunken: var(--surface-sunken); --color-surface-raised: var(--surface-raised);
  --color-primary: var(--primary);         --color-primary-hover: var(--primary-hover); --color-primary-foreground: var(--primary-foreground);
  --color-brand-text: var(--brand-text);   --color-brand-soft: var(--brand-soft); --color-brand-soft-foreground: var(--brand-soft-foreground);
  --color-secondary: var(--secondary);     --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);             --color-muted-foreground: var(--muted-foreground);
  --color-subtle-foreground: var(--subtle-foreground);
  --color-accent: var(--accent);           --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);           --color-border-strong: var(--border-strong);
  --color-input: var(--input);             --color-ring: var(--ring);
  --color-success: var(--success); --color-success-foreground: var(--success-foreground); --color-success-soft: var(--success-soft); --color-success-strong: var(--success-strong);
  --color-warning: var(--warning); --color-warning-foreground: var(--warning-foreground); --color-warning-soft: var(--warning-soft); --color-warning-strong: var(--warning-strong);
  --color-destructive: var(--destructive); --color-destructive-foreground: var(--destructive-foreground); --color-danger-soft: var(--danger-soft); --color-danger-strong: var(--danger-strong);
  --color-info: var(--info); --color-info-foreground: var(--info-foreground); --color-info-soft: var(--info-soft); --color-info-strong: var(--info-strong);
  --color-neutral-soft: var(--neutral-soft); --color-neutral-strong: var(--neutral-strong);
  --color-teal-soft: var(--teal-soft); --color-teal-strong: var(--teal-strong);
  --color-plum-soft: var(--plum-soft); --color-plum-strong: var(--plum-strong);
  --color-chart-1: var(--chart-1); --color-chart-2: var(--chart-2); --color-chart-3: var(--chart-3); --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5); --color-chart-6: var(--chart-6); --color-chart-7: var(--chart-7); --color-chart-8: var(--chart-8);
  --color-sidebar: var(--sidebar); --color-sidebar-foreground: var(--sidebar-foreground); --color-sidebar-muted: var(--sidebar-muted);
  --color-sidebar-primary: var(--sidebar-primary); --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent); --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border); --color-sidebar-ring: var(--sidebar-ring);
  --color-overlay: var(--overlay);

  --radius-xs: 4px; --radius-sm: 6px; --radius-md: 8px; --radius-lg: var(--radius); --radius-xl: 14px; --radius-2xl: 20px;

  --text-3xs: 0.625rem;  --text-3xs--line-height: 0.875rem;
  --text-2xs: 0.6875rem; --text-2xs--line-height: 1rem;
  --text-xs: 0.75rem;    --text-xs--line-height: 1rem;
  --text-sm: 0.8125rem;  --text-sm--line-height: 1.25rem;
  --text-base: 0.9375rem; --text-base--line-height: 1.5rem;
  --text-lg: 1.0625rem;  --text-lg--line-height: 1.625rem;
  --text-xl: 1.25rem;    --text-xl--line-height: 1.75rem;
  --text-2xl: 1.5rem;    --text-2xl--line-height: 2rem;
  --text-3xl: 1.875rem;  --text-3xl--line-height: 2.375rem;
  --text-4xl: 2.375rem;  --text-4xl--line-height: 2.75rem;
  --text-5xl: 3.5rem;    --text-5xl--line-height: 3.875rem;

  --shadow-xs: 0 1px 2px 0 rgb(var(--shadow-color) / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(var(--shadow-color) / 0.08), 0 1px 2px -1px rgb(var(--shadow-color) / 0.06);
  --shadow-md: 0 6px 16px -4px rgb(var(--shadow-color) / 0.10), 0 2px 6px -2px rgb(var(--shadow-color) / 0.06);
  --shadow-lg: 0 16px 40px -8px rgb(var(--shadow-color) / 0.18), 0 4px 12px -4px rgb(var(--shadow-color) / 0.08);

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  --animate-fade-up: fade-up 220ms var(--ease-out) both;
  --animate-fade-in: fade-in 180ms var(--ease-out) both;
  --animate-scale-in: scale-in 180ms var(--ease-out) both;
  --animate-slide-in-right: slide-in-right 260ms var(--ease-out) both;
  --animate-badge-pop: badge-pop 260ms var(--ease-out) both;
  --animate-shimmer: shimmer 1.4s linear infinite;
}

/* ── 5. Base ───────────────────────────────────────────────────── */
@layer base {
  * { @apply border-border; }
  html { height: 100%; color-scheme: light; }
  html.dark { color-scheme: dark; }
  body { @apply bg-background text-foreground font-sans text-sm antialiased; font-feature-settings: "ss01", "cv11"; }
  html:has(#dashboard-content), body:has(#dashboard-content) { height: 100%; overflow: hidden; overscroll-behavior: none; }
  h1, h2, h3 { @apply font-display tracking-tight; font-weight: 700; text-wrap: balance; }
  h4, h5, h6 { font-weight: 600; text-wrap: balance; }
  p { text-wrap: pretty; }
  ::selection { background: var(--selection); color: var(--foreground); }
  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  * { scrollbar-width: thin; scrollbar-color: color-mix(in oklab, var(--foreground) 18%, transparent) transparent; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: color-mix(in oklab, var(--foreground) 16%, transparent); border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box; }
  ::-webkit-scrollbar-thumb:hover { background-color: color-mix(in oklab, var(--foreground) 28%, transparent); }
  .tabular, table, [data-numeric] { font-variant-numeric: tabular-nums; }
}

/* ── 6. Keyframes (names kept for existing usages) ─────────────── */
@keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes scale-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes slide-in-right { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
@keyframes badge-pop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
@keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}

/* ── 7. Utilities that replace legacy helpers (only these survive) ─ */
@utility brand-mark-bg { background: radial-gradient(60% 60% at 85% 10%, color-mix(in oklab, var(--gold-400) 14%, transparent), transparent 70%), var(--ink-950); }
@utility surface-sunken { background: var(--surface-sunken); }
@utility kanban-scroll { scrollbar-width: auto; scrollbar-color: color-mix(in oklab, var(--foreground) 22%, transparent) transparent; }
@utility hide-native-password-reveal { &::-ms-reveal, &::-ms-clear { display: none; } &::-webkit-credentials-auto-fill-button { visibility: hidden; pointer-events: none; position: absolute; right: 0; } }

/* Compact density (toggled by features/settings/settings-preferences.tsx → html.compact) */
.compact { --row-h: 2rem; --cell-py: 0.375rem; --card-p: 0.75rem; }
:root { --row-h: 2.5rem; --cell-py: 0.625rem; --card-p: 1.25rem; }

/* Radix ScrollArea fix (keep: functional) */
[data-radix-scroll-area-viewport] > div { display: block !important; min-height: 0 !important; }
```
Notes:
- `.compact` used to override `.p-4/.gap-4/...` globally — that's fragile. Replace with the CSS vars above and consume them in `Table` (`py-[var(--cell-py)]`), `Card` (`p-[var(--card-p)]`), list rows (`h-[var(--row-h)]`). Keep the class name `compact` on `<html>` (set by `settings-preferences.tsx`, line ~69) so behavior is unchanged.
- `kanban-scroll-container` is used by board components; rename usages to `kanban-scroll` utility (grep `kanban-scroll-container`).
- The `[data-radix-scroll-area-viewport] { overflow-x:auto!important }` and `.sticky { z-index:50!important }` hacks: remove the sticky z-index hack (use `z-sticky` on the actual sticky elements); keep the `display:block` one only if removing it breaks tables (verify visually in `components/ui/scroll-area.tsx` consumers).

---

## 4. Theme wiring

1. `app/layout.tsx`:
   - Remove `forcedTheme="light"`; set `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`.
   - Remove the Google Fonts `<link>`/preconnect tags; add `next/font` variables on `<html>`.
   - `<body className="font-sans h-full min-h-0 bg-background text-foreground antialiased">` — delete `selection:bg-gold/30 selection:text-gold noir-grain` (noir-grain was never defined).
   - Add `export const viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FBFAF6" }, { media: "(prefers-color-scheme: dark)", color: "#100F0D" }] }`.
   - Keep metadata/`resolveMetadataBase` untouched.
2. New `components/layout/theme-toggle.tsx` (client): `useTheme()` from `next-themes`; 3-way segmented control (Sun / Moon / Monitor icons) with `aria-label`s; mounted-guard to avoid hydration mismatch. Place in `sidebar-user-menu.tsx` dropdown (as a submenu row) and in `features/settings/settings-preferences.tsx` (as 3 radio cards with mini previews).
3. Dark-mode QA every page (§12). Because the sidebar is ink in both modes, it should look identical in both.

---

## 5. Removal plan — delete every old style, token and hardcoded color

### 5.1 Legacy CSS to delete (all from old `globals.css`)
`--gold`, `--blue`, `--color-gold`, `--color-blue`, `--font-inter`, `--font-jetbrains`, `--font-playfair`, `.glass`, `.dark .glass`, `.gold-gradient`, `.gold-text`, `.gold-border`, `.shadow-soft`, `.shadow-medium`, `.shadow-noir`, `.shadow-gold`, `.glow-gold`, `.press-scale`, `.noir-mesh`, `.auth-bg`, `.deco-line`, `.deco-line-subtle`, `.sidebar-deco`, `.gradient-gold`, `.gradient-brand`, `.gradient-green`, `.gradient-wizard`, `.gradient-dark`, `.nav-item` (+ `.nav-icon` rules), `.page-enter`, `.filter-chip` (+ `.active`), `.vc-toast*` (re-implemented in `styles/vendors/sonner.css` under new names `.mg-toast*`), `@keyframes gold-pulse`, `@keyframes scan`, the `.compact .p-4/.gap-4/...` overrides, `.kanban-scroll-container*`, every `.calendar-container .rbc-*` rule (re-implemented in `styles/vendors/react-big-calendar.css`).

### 5.2 Class replacement map (apply in TSX/TS)

| Old | New |
|---|---|
| `shadow-noir`, `shadow-soft` | `shadow-sm` (cards) / remove if card already has border |
| `shadow-medium`, `shadow-gold`, `glow-gold`, `hover:shadow-[0_0_20px_rgba(200,162,46,0.3)]` | `hover:shadow-md hover:border-border-strong` (interactive cards only) |
| `gold-gradient` (buttons/badges) | `bg-primary text-primary-foreground hover:bg-primary-hover` |
| `gold-text` (brand name, headings) | `text-foreground font-display` (brand name) or `text-brand-text` (accent words) |
| `gold-border` | `border-primary` |
| `gradient-gold` / `gradient-brand` / `gradient-wizard` | `bg-primary` / `brand-mark-bg` / progress uses `bg-primary` |
| `gradient-green` | `bg-success` |
| `gradient-dark`, `noir-mesh`, `auth-bg` | `bg-background` (app) or `brand-mark-bg` (auth/landing hero) |
| `glass` | `bg-background/85 backdrop-blur-md border-b border-border` (topbar only) |
| `press-scale` | `active:scale-[0.98] transition-transform duration-100` built into Button |
| `filter-chip` / `.active` | `<FilterChip>` component (§6) |
| `nav-item` | `<SidebarNavItem>` styles (§7.1) |
| `page-enter` | `animate-fade-up` |
| `text-gold`, `text-gold/NN` | `text-brand-text` |
| `bg-gold`, `bg-gold/10…/20` | `bg-primary` (solid) / `bg-brand-soft` (tints) |
| `border-gold/NN`, `ring-gold/NN` | `border-primary/40` / `ring-ring` |
| `selection:bg-gold/30` | removed (global `::selection`) |
| `font-serif` | `font-display` |
| `text-[7–9px]` / `[10px]` / `[11px]` / `[12px]` / `[13px]` | `text-3xs` / `text-2xs` / `text-2xs` / `text-xs` / `text-sm` |
| `rounded-[…]` (15) | nearest radius token |
| `shadow-[…]` (5) | `shadow-xs|sm|md|lg` |
| `z-[100]`, `z-[200]`, other `z-[N]` | `z-modal`, `z-skip-link`, scale in §3.6 |
| `bg-white` on cards/surfaces | `bg-card` / `bg-surface-raised` |
| `text-white` on colored fills | the matching `*-foreground` token (e.g. `text-primary-foreground`, `text-destructive-foreground`) |
| `bg-black/NN` scrims | `bg-overlay` |
| `text-black` | `text-foreground` |

### 5.3 Status/tone system (replaces 3,262 raw palette classes)

Create `lib/design/tones.ts` (new file, pure constants — not business logic):

```ts
export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "teal" | "plum";
export const toneSoft: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral-strong",
  brand:   "bg-brand-soft text-brand-soft-foreground",
  success: "bg-success-soft text-success-strong",
  warning: "bg-warning-soft text-warning-strong",
  danger:  "bg-danger-soft text-danger-strong",
  info:    "bg-info-soft text-info-strong",
  teal:    "bg-teal-soft text-teal-strong",
  plum:    "bg-plum-soft text-plum-strong",
};
export const toneDot: Record<Tone, string> = {
  neutral: "bg-ink-400", brand: "bg-gold-400", success: "bg-success-500", warning: "bg-warning-500",
  danger: "bg-danger-500", info: "bg-info-500", teal: "bg-teal-500", plum: "bg-plum-500",
};
export const toneSolid: Record<Tone, string> = {
  neutral: "bg-ink-700 text-white", brand: "bg-primary text-primary-foreground", success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground", danger: "bg-destructive text-destructive-foreground", info: "bg-info text-info-foreground",
  teal: "bg-teal-700 text-white", plum: "bg-plum-700 text-white",
};
export const toneBar: Record<Tone, string> = { /* progress/heat bars */ neutral: "bg-ink-300", brand: "bg-gold-400", success: "bg-success-500", warning: "bg-warning-500", danger: "bg-danger-500", info: "bg-info-500", teal: "bg-teal-500", plum: "bg-plum-500" };
```
Then **rewrite every color map to return tone classes** — keep the exported names and key sets identical so callers don't change:
- `lib/theme-constants.ts`: `priorityColors` (URGENT→danger, HIGH→warning, MEDIUM→brand, LOW→neutral), `projectStatusColors` (ACTIVE→success, PLANNING→info, COMPLETED→neutral, ON_HOLD→warning), `stageColors` (Discovery→info, Qualified→teal, Proposal→plum, Negotiation→brand, Closed Won→success), `eventStatusColors`, `onlineStatusColors` (→ `toneDot`), `campaignStatusConfig`, `rankStyles` (1st gold: `bg-brand-soft text-brand-soft-foreground ring-gold-400/40`, bar `bg-gold-400`, badge `bg-primary text-primary-foreground`; 2nd silver: `bg-ink-100 text-ink-700`, bar `bg-ink-300`; 3rd bronze: `bg-warning-soft text-warning-strong`, bar `bg-warning-600`), `sprintStatusColors`, `sparkColors` (→ `"var(--chart-1)"` etc. strings), `leaveStatusColors`, `payrollStatusColors`, `expenseStatusColors`, `deviceStatusColors`, `documentTypeColors` (CONTRACT info, CERTIFICATE plum, ID_PROOF teal, PAYSLIP brand, POLICY neutral, OFFER_LETTER success, RESUME plum, OTHER neutral), `healthStatusColors`/`healthDotColors` (healthy success, at_risk warning, critical danger), `roleBadgeConfig`, `projectProgressBarColors`, `FALLBACK_COLOR` (→ `toneSoft.neutral`).
- Same treatment for every file in the "color-map .ts" list in §1.1.
- **Semantic mapping rules** used throughout: success/approved/paid/won/active/present/healthy → `success`; pending/at-risk/late/on-hold/expiring → `warning`; rejected/lost/overdue/critical/absent/terminated/error → `danger`; info/planning/in-review/scheduled/new → `info`; draft/inactive/archived/unknown/cancelled → `neutral`; featured/selected/top/brand/high-value → `brand`; free categorical tags → cycle `info, teal, plum, brand, warning, success`.
- Borders on pills: none (soft fill only). Remove all `border-emerald-200 dark:border-emerald-800`-style pairs.
- After conversion, `dark:` variants for color must disappear (tokens already switch). Allowed remaining `dark:` usages: ≤ 20 total, only for non-color tweaks (e.g. `dark:opacity-80` on images) and only inside `components/ui/*`.

### 5.4 Hex/rgb in TSX
- Charts (recharts `stroke`, `fill`, `<Cell fill>`, gradients): use `"var(--chart-1)"` … `"var(--chart-8)"`, grid `"var(--chart-grid)"`, ticks `{ fill: "var(--chart-axis)", fontSize: 11 }`. For `<linearGradient>` stops use `stopColor="var(--chart-1)"` with `stopOpacity` 0.24 → 0.
- Calendar event colors in `features/calendar/calendar-view.tsx` / `event-detail-sheet.tsx`: map event types to tones; render via CSS vars.
- User-chosen colors stored in DB (project `color` default `#3B82F6`, labels): **keep rendering the stored value** (that's data). Only change the color *picker presets* to the 8 chart tokens' hex values.
- `components/illustrations/_shared.tsx`: replace hex with `var(--ink-700)`, `var(--gold-400)`, `var(--ink-100)`, `var(--ink-300)`.
- `app/(dashboard)/ceo/qr-code/page.tsx`: QR must stay `#201E1F` on `#FFFFFF` (scannability) — define these two as constants `QR_FG`, `QR_BG` with a comment; that's the only allowed in-app hex besides DB data.
- Inline `style={{…}}` (163): keep only for truly dynamic values (widths %, transforms, user colors, DnD-provided styles from `@hello-pangea/dnd`, `sidebarW`). Static colors/spacing → classes.

### 5.5 Generated documents & emails (Phase 9 — color constants only)
Emails (`lib/email-templates/*.ts`, `lib/email.ts`, `lib/email/hr-payroll.ts`, `lib/notifications/email.ts`, `lib/inngest/functions/*email*|*reminder*|*no-show*`, `app/api/cron/scheduled-reports/route.ts`) and PDFs (`lib/hr/payslip-html.ts`, `lib/hr/payslip-branded-pdf.tsx`, `lib/hr/offer-letter-branded-pdf.tsx`, `lib/termination-letter-pdf.ts`, `components/expenses/expense-export/pdf-renderer.tsx`, `app/api/hr/employees/[employeeId]/profile-pdf/route.ts`, `lib/qr-code.ts`): create `lib/design/brand-hex.ts` exporting `BRAND = { gold: "#D4AF37", goldDark: "#796001", ink: "#201E1F", inkMuted: "#5C5B57", border: "#E8E6E2", canvas: "#FBFAF6", success: "#137736", warning: "#974C00", danger: "#AF2C28", info: "#2C5CC1" }` and swap literal hex values to these constants. **Do not change structure, copy, variables, subjects, recipients, or sending logic.** Inline CSS in emails must stay inline (email clients). Old navy `#0f2b7f`/`#1e3a8a` and old gold `#bd882c`/`#d4a23a`/`#c8a22e` must be gone. Run existing tests for these modules.

### 5.6 Verification commands (must all return **0** at the end, except where noted)
Run from repo root (use `rg` if installed, else the `grep -rE` variant):

```bash
D="app components features hooks lib"
# 1. hex literals in UI code (allowed: lib/design/brand-hex.ts, lib/db/**, QR constants file)
grep -rnE --include='*.tsx' --include='*.ts' '#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b' $D | grep -vE 'lib/design/brand-hex.ts|lib/db/|QR_(FG|BG)' | grep -vE '^\S+:\s*//' | wc -l
# 2. rgb/hsl literals
grep -rnE --include='*.tsx' --include='*.ts' '(rgba?|hsla?)\(' $D | grep -v 'lib/design/' | wc -l
# 3. arbitrary color classes
grep -rnE --include='*.tsx' --include='*.ts' '(bg|text|border|from|to|via|fill|stroke|ring|shadow|outline|decoration)-\[(#|rgb|hsl)' $D | wc -l
# 4. raw Tailwind palette
grep -rnE --include='*.tsx' --include='*.ts' '\b(bg|text|border|from|to|via|ring|fill|stroke|divide|outline|shadow|decoration|placeholder|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}' $D | wc -l
# 5. legacy tokens/classes
grep -rnE --include='*.tsx' --include='*.ts' --include='*.css' '\b(glass|gold-gradient|gold-text|gold-border|shadow-soft|shadow-medium|shadow-noir|shadow-gold|glow-gold|press-scale|noir-mesh|noir-grain|auth-bg|deco-line|deco-line-subtle|sidebar-deco|gradient-gold|gradient-brand|gradient-green|gradient-wizard|gradient-dark|nav-item|filter-chip|page-enter|vc-toast[a-z-]*|kanban-scroll-container)\b|(text|bg|border|ring|from|to|via|fill|stroke|outline|shadow)-gold\b|-gold/|--gold\b|--blue\b|selection:' $D globals.css styles | wc -l
# 6. old fonts
grep -rnE 'Playfair|JetBrains|family=Inter|"Inter"|font-inter|font-serif|fonts.googleapis' app components features lib globals.css styles | wc -l
# 7. arbitrary font sizes / radii / shadows / z
grep -rnE --include='*.tsx' --include='*.ts' 'text-\[[0-9.]+(px|rem)\]|rounded-\[|shadow-\[|z-\[[0-9]+\]' $D | wc -l
# 8. black/white utilities (allowed: inside lib/design/tones.ts toneSolid only)
grep -rnE --include='*.tsx' '\b(bg|text|border|from|to|via)-(white|black)\b' $D | wc -l
# 9. dark: variants (target ≤ 20, all in components/ui)
grep -rnoE --include='*.tsx' --include='*.ts' 'dark:' $D | wc -l
grep -rlE --include='*.tsx' --include='*.ts' 'dark:' $D | grep -v '^components/ui/'   # must print nothing
# 10. old palette hex anywhere (incl. emails/PDFs)
grep -rniE '#(bd882c|d4a23a|c8a22e|0f2b7f|1e3a8a|0f1120|0d0f1a|161825|1a1d2e|f8f8fc)\b' app components features lib globals.css styles | wc -l
```
Paste the final outputs into the PR description.

---

## 6. Component-by-component redesign

General rules for every component: use only semantic tokens; focus = `focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]` → define as `@utility focus-ring { outline: none; box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring); }` and apply `focus-visible:focus-ring`; disabled = `opacity-50 pointer-events-none`; invalid = `aria-invalid:border-destructive aria-invalid:focus-ring` with ring color danger; transitions `transition-[color,background-color,border-color,box-shadow] duration-150`. Keep every `data-slot` attribute.

### 6.1 `components/ui/*` primitives (50 files)

| File | New design |
|---|---|
| `button.tsx` | cva variants: **default** `bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-xs`; **secondary** (ink) `bg-secondary text-secondary-foreground hover:bg-secondary/90`; **outline** `border border-border-strong bg-card hover:bg-accent`; **ghost** `hover:bg-accent text-foreground`; **destructive** `bg-destructive text-destructive-foreground hover:bg-destructive/90`; **link** `text-brand-text underline-offset-4 hover:underline`; new **soft** `bg-brand-soft text-brand-soft-foreground hover:bg-gold-100`. Sizes: `xs h-7 px-2.5 text-xs`, `sm h-8 px-3`, `default h-9 px-4`, `lg h-11 px-5 text-base`, `icon size-9`, `icon-sm size-8`, `icon-lg size-11`, `icon-xs size-7`. Radius `rounded-md`. Press: `active:scale-[0.98]`. Add optional `loading?: boolean` prop → spinner (`Loader2 animate-spin`) replaces leading icon, `aria-busy`, disabled. Remove `press-scale`, `gold-gradient`, rgba glow. |
| `badge.tsx` | Pill `rounded-full h-5 px-2 text-2xs font-semibold gap-1`, no border. Variants: `default` → brand tone, `secondary` → neutral, `destructive` → danger, `success`, `warning`, `info`, `outline` (`border border-border-strong text-muted-foreground`), new `teal`, `plum`, `solid` (toneSolid brand). Add optional `dot?: boolean` (6px circle `toneDot`). Implement via `toneSoft` from `lib/design/tones.ts`. Remove `text-red-700 dark:text-red-400`. |
| `card.tsx` | `rounded-lg border border-border bg-card text-card-foreground shadow-xs`; remove `shadow-noir glow-gold transition-all duration-300`. New optional prop `interactive` → `hover:border-border-strong hover:shadow-md cursor-pointer transition`. `CardHeader px-5 pt-5 pb-3`, `CardTitle text-lg font-semibold`, `CardDescription text-sm text-muted-foreground`, `CardContent px-5 pb-5`, `CardFooter px-5 py-3 border-t bg-surface-sunken/50 rounded-b-lg`. |
| `input.tsx` | `h-9 rounded-md border border-input bg-card px-3 text-sm placeholder:text-subtle-foreground shadow-xs focus-visible:focus-ring focus-visible:border-ring`; file inputs styled; dark `bg-surface-sunken`. Leading/trailing icon support via wrapper class `has-[svg]:pl-9` pattern (document). |
| `textarea.tsx` | Same tokens as input; `min-h-24 py-2 leading-relaxed`; `field-sizing-content` for auto-grow. |
| `label.tsx` | `text-sm font-medium text-foreground`; required marker `after:content-['*'] after:ml-0.5 after:text-destructive` when `data-required`. |
| `form.tsx` | `FormItem gap-1.5`; `FormDescription text-xs text-muted-foreground`; `FormMessage text-xs font-medium text-destructive` with `AlertCircle size-3.5` icon. |
| `select.tsx` | Trigger = input styles + `ChevronDown text-muted-foreground`; content `rounded-lg border bg-popover shadow-md p-1 z-popover`; item `rounded-sm h-8 px-2 text-sm data-[highlighted]:bg-accent`, selected check in `text-brand-text`. |
| `searchable-select.tsx`, `searchable-combobox.tsx`, `searchable-multi-select.tsx` | Same trigger as select; popover with search input (no border, bottom divider), list max-h-72, multi-select chips inside trigger = `Badge variant="secondary"` with × button (aria-label "Remove X"); "N selected" overflow chip. |
| `checkbox.tsx` | `size-4 rounded-sm border border-input bg-card data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground`; indeterminate supported. |
| `radio-group.tsx` | `size-4 rounded-full border-input`; checked = gold ring 1.5px + inner 8px gold-400 dot (logo circle). Add `RadioCard` styling helper for theme picker. |
| `switch.tsx` | Track `h-5 w-9 rounded-full bg-ink-300 dark:bg-ink-700`(only allowed dark: in ui) `data-[state=checked]:bg-primary`; thumb `size-4 bg-white shadow-sm`, checked thumb `bg-ink-900`. |
| `slider.tsx` | Track `h-1.5 bg-muted rounded-full`, range `bg-primary`, thumb `size-4 rounded-full bg-card border-2 border-primary shadow-sm focus-visible:focus-ring`. |
| `progress.tsx`, `progress-bar.tsx` | Track `h-1.5 rounded-full bg-muted`; indicator `bg-primary` default, `tone` prop → `toneBar`. Animated width 260ms ease-out. |
| `dialog.tsx` | Overlay `bg-overlay backdrop-blur-xs z-overlay`, content `rounded-xl bg-surface-raised border shadow-lg z-modal w-[calc(100%-2rem)] max-w-lg p-0`; header `px-6 pt-6 pb-2` title `text-xl font-display`, body `px-6 py-2`, footer `px-6 py-4 border-t bg-surface-sunken/60 rounded-b-xl flex justify-end gap-2`. Close button top-right ghost icon-sm. Animation scale-in 180ms. Sizes via `size` prop: sm 400 / md 512 / lg 640 / xl 800 / full. |
| `alert-dialog.tsx`, `confirm-dialog.tsx` | Same as dialog sm; leading 40px circle icon chip (danger tone for destructive, warning for caution); confirm button variant matches intent. |
| `sheet.tsx` | Overlay as dialog; panel `bg-surface-raised border-l shadow-lg z-modal`; widths: `sm 400`, `md 560` (default), `lg 720`, `xl 960`; header sticky `px-6 py-4 border-b`, footer sticky `px-6 py-3 border-t bg-surface-sunken/60`. Mobile (<sm) = full-width bottom sheet with rounded-t-xl. Slide 260ms ease-out. |
| `popover.tsx`, `tooltip.tsx` | Popover = `rounded-lg border bg-popover shadow-md p-3 z-popover`. Tooltip = `bg-ink-900 text-white text-xs rounded-md px-2 py-1 shadow-md` in both modes (dark: `bg-ink-100 text-ink-900` via tokens `--tooltip`/`--tooltip-foreground` — add these two tokens), delay 300ms, arrow hidden. |
| `dropdown-menu.tsx` | Content as select content; items `h-8 rounded-sm px-2 gap-2 text-sm`, icons `text-muted-foreground size-4`; destructive items `text-destructive focus:bg-danger-soft`; shortcut hint `ml-auto text-2xs text-subtle-foreground font-mono`; separators `-mx-1 my-1 h-px bg-border`; labels `text-2xs uppercase tracking-wider text-subtle-foreground px-2 py-1.5`. |
| `command.tsx` | Used by command palette & comboboxes: input row `h-12 border-b px-4 text-base`, groups headings like dropdown labels, items `h-9 rounded-md px-3 data-[selected=true]:bg-accent` (remove `bg-white/20 text-white` from `components/layout/command-palette.tsx` line ~57). |
| `tabs.tsx` | Two styles via `variant`: **underline** (default for page-level tabs): list `border-b gap-6 h-10`, trigger `text-sm font-medium text-muted-foreground data-[state=active]:text-foreground` + 2px bottom bar `bg-primary` (animated with framer `layoutId` only if already using motion there; else CSS). **segmented** (view toggles): list `bg-muted rounded-md p-0.5 h-8`, trigger `rounded-sm px-3 data-[state=active]:bg-card data-[state=active]:shadow-xs`. |
| `table.tsx` | Wrapper `rounded-lg border bg-card overflow-hidden`; `thead` `bg-surface-sunken sticky top-0 z-sticky`; `th` `h-9 px-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground text-left`; `td` `px-3 py-[var(--cell-py)] text-sm border-t border-border`; row hover `hover:bg-accent/60`; selected `data-[state=selected]:bg-brand-soft`; numeric cells `text-right tabular-nums`. Add `TableEmpty` helper row (colSpan, EmptyState compact). |
| `components/shared/data-table-pagination.tsx` | Left: "Showing 1–25 of 312" `text-xs text-muted-foreground`; right: rows-per-page select (sm) + icon-sm prev/next + page input. Sticky bottom inside table card `border-t px-3 h-11`. |
| `avatar.tsx`, `avatar-stack.tsx`, `avatar-crop-dialog.tsx` | Avatar `rounded-full bg-ink-200 text-ink-700 font-semibold` fallback initials (text-3xs ≤20px, text-2xs 24–28, text-xs 32, text-sm 40, text-lg 64+); optional `ring` prop → `ring-2 ring-gold-400 ring-offset-2 ring-offset-background` (for managers/current user). Stack overlap `-space-x-2` with `ring-2 ring-card`; overflow "+N" chip neutral tone. Crop dialog uses Dialog lg; crop area bg `bg-ink-950`. |
| `calendar.tsx` (react-day-picker v8) | Day cells `size-9 rounded-md text-sm`; today `font-semibold text-brand-text` + 4px gold dot below; selected `bg-primary text-primary-foreground`; range middle `bg-brand-soft rounded-none`; outside days `text-subtle-foreground`; nav buttons ghost icon-sm. Keep the classNames API (v8 `classNames` prop). |
| `date-picker.tsx`, `date-range-picker.tsx`, `future-datetime-input.tsx` | Trigger = input style with `CalendarDays` icon left; range picker shows 2 months ≥md with preset column (Today, Last 7 days, This month, Last month, This quarter, YTD) — presets are UI only and must call the same `onChange`. |
| `phone-input.tsx` | Country select as attached left segment (`rounded-l-md border-r`), shares input focus ring via `focus-within:focus-ring` on wrapper; override `react-phone-number-input` CSS vars in `styles/vendors/phone-input.css` (add import). |
| `skeleton.tsx`, `dashboard-skeleton.tsx`, `kanban-skeleton.tsx` | `bg-muted rounded-md` + shimmer gradient `linear-gradient(90deg, transparent, color-mix(in oklab, var(--foreground) 6%, transparent), transparent)` `bg-[length:200%_100%] animate-shimmer`. Dashboard/kanban skeletons must mirror the **new** layouts (§7/§8). |
| `empty-state.tsx` | Keep classes asserted by `empty-state.test.tsx` (`flex-1 w-full min-h-[min(50vh,28rem)] justify-center`, compact without `min-h-`). New look: 56px circular icon chip `bg-brand-soft text-brand-soft-foreground` (or illustration if passed) → title `text-lg font-display font-bold` → description `text-sm text-muted-foreground max-w-sm` → actions row (primary + ghost). Compact: 40px chip, `text-sm` title. |
| `query-error-state.tsx`, `route-error-boundary.tsx` | Danger icon chip, title "Something went wrong", message, `Retry` (default) + `Copy error ID` (ghost, only if an id exists already). Keep test expectations in `query-error-state.test.tsx`. |
| `min-length-hint.tsx` | `text-2xs text-subtle-foreground`, turns `text-success-strong` with `Check` icon when satisfied. Keep test behavior. |
| `stat-card.tsx` | KPI card: label `text-2xs uppercase tracking-wider text-muted-foreground`; value `text-3xl font-display font-extrabold tabular-nums`; delta chip (success/danger tone with `TrendingUp/Down` icon); optional 36px circular icon chip top-right (tone prop); optional sparkline (recharts `Area`, `var(--chart-1)`, 32px tall). Remove the 2px top color bar (`absolute top-0 … h-[2px]`). |
| `page-wrapper.tsx` | See §7.3 (page header). Keep all props (`title, subtitle, badge, actions, filters, stickyHeader, noInternalScroll, contentClassName`). Add optional `eyebrow?: ReactNode` and `breadcrumbs?: {label, href?}[]` props (render `<Breadcrumbs>`); default breadcrumbs derived from pathname + nav labels when not passed. |
| `page-back-button.tsx` | Ghost `sm` button with `ArrowLeft`, label "Back"; keep `lib/navigation/resolve-back-href.ts` logic. |
| `export-button.tsx` | Outline button with `Download` icon + dropdown (CSV/XLSX/PDF as existing). |
| `scroll-area.tsx`, `separator.tsx` | Scrollbar thumb `bg-foreground/15 hover:bg-foreground/25 rounded-full w-2`; separator `bg-border`. |
| `sonner.tsx` + `styles/vendors/sonner.css` | Position bottom-right (top-center on mobile), `--width: 22rem`, class `mg-toast`: `bg-popover border rounded-lg shadow-lg p-3 pl-4`, leading 28px circle tone icon (success/danger/warning/info/loading spinner), title `text-sm font-semibold`, description `text-xs text-muted-foreground`, action button `Button size=xs`. Remove gradient backgrounds and left-border stripe. z-index `var(--z-toast)`. Keep the existing toast helper API. |
| `svg-icons.tsx` | Recolor to `currentColor`; keep exports. |
| **New** `components/ui/filter-chip.tsx` | Replaces `.filter-chip`: `h-7 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent`; active `bg-brand-soft border-gold-300 text-brand-soft-foreground`; optional count + remove ×. |
| **New** `components/ui/breadcrumbs.tsx` | `nav aria-label="Breadcrumb"` → `ol` of links `text-xs text-muted-foreground hover:text-foreground`, separators `ChevronRight size-3`, last item `text-foreground font-medium aria-current="page"`. Truncate middle items on <md. |
| **New** `components/ui/kbd.tsx` | `inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-sunken px-1 font-mono text-3xs text-muted-foreground`. |
| **New** `components/ui/status-pill.tsx` | `({ tone, children, dot })` → Badge with tone; used by all status maps. |
| **New** `components/ui/icon-chip.tsx` | `({ tone, size: "sm"|"md"|"lg", icon })` circular chip (logo motif). |

### 6.2 Custom component folders

| Folder / files | Redesign |
|---|---|
| `components/layout/*` | See §7 (shell). |
| `components/charts/metric-card.tsx`, `mini-area-chart.tsx`, `mini-donut-chart.tsx`, `activity-feed.tsx` | Metric card = `StatCard`. Mini area: 1.5px stroke `var(--chart-1)`, gradient fill 24%→0, no axes. Donut: 8 chart tokens, 10px ring thickness, center total in display font. Activity feed = timeline (§6.3). |
| `components/dashboard/widgets/*` (10: executive-kpi, team-attendance, upcoming-leaves, widget-skeleton, my-tasks, project-health, pending-approvals, leave-balance, announcements, quick-actions) | All share a new `WidgetCard` (Card + header row: 32px icon chip, title `text-sm font-semibold`, count badge, right-aligned "View all →" link `text-xs text-brand-text`). Lists: 44px rows with avatar/icon, primary text, meta `text-xs text-muted-foreground`, trailing status pill. Quick actions: 2×3 grid of 72px tiles (icon chip + label), hover `bg-accent`. Announcements: remove 16 raw palette classes → tones. Leave balance: circular progress rings (logo motif) in gold/ink. |
| `components/projects/*` (28) | `kanban-board.tsx`/`kanban-ticket-card.tsx`/`kanban-quick-add.tsx`: see §8.4. `table-view.tsx`/`list-view.tsx`: Table primitive. `gantt-view.tsx`: bars `rounded-sm h-6` in tone by status, today line `bg-primary w-px`, weekend columns `bg-surface-sunken/60`, header sticky. `calendar-view.tsx`: shared calendar styles. `burndown-chart.tsx`/`velocity-chart.tsx`: chart tokens (ideal line `var(--chart-axis)` dashed, actual `var(--chart-1)`). `shared/priority-badge.tsx` (icon + tone: Urgent danger `ChevronsUp`, High warning `ChevronUp`, Medium brand `Equal`, Low neutral `ChevronDown`), `shared/status-badge.tsx` (StatusPill + dot), `shared/ticket-type-icon.tsx` (Bug danger, Story success, Task info, Epic plum, Subtask neutral — 16px icon in 20px rounded-sm chip), `shared/ticket-filter-bar.tsx` (FilterChips + search). `ticket-details/*` → large Sheet (720px): header (type icon, key in mono, title editable), two columns: content (description, subtasks, relations, activity) / 280px property rail (status, assignee, priority, sprint, labels, time tracker, watchers). Create/edit dialogs (ticket, epic, sprint) → Dialog md with 2-col fields on ≥sm. `view-switcher.tsx` → segmented Tabs. `label-picker.tsx` → searchable multi-select with color dots. |
| `components/hr/*` (22) | Onboarding wizard (`onboarding-wizard.tsx`, `_onboarding/step-*.tsx`): left vertical stepper (circles: done = gold fill + check, current = gold ring, upcoming = ink-200), content card max-w-2xl, sticky footer with Back/Next (`components/onboarding/form-nav-buttons.tsx`). `onboarding-progress-ring.tsx`: SVG ring stroke `var(--gold-400)`, track `var(--ink-200)`. Recruitment kanbans (`recruitment/pipeline-kanban.tsx`, `job-pipeline-kanban.tsx`) per §8.4. `candidate-comparison-dialog.tsx`: Dialog xl, sticky first column, best value per row highlighted `bg-brand-soft`. `interviewer-availability-grid.tsx`: free = success-soft, busy = neutral-soft, selected = primary. Comboboxes (`department-combobox`, `job-role-combobox`, `employee-assign-combobox`) → searchable-combobox styles. `handover-photo-capture.tsx`: dark capture frame `bg-ink-950 rounded-xl`, gold capture button 56px circle. Lists (`employee-attendance-history`, `employee-projects-list`, `employee-tickets-list`) → Table primitive. `self-edit-profile-form.tsx`: remove rgb(), use Form layout §8.6. |
| `components/illustrations/*` (25) | Recolor via tokens (§3.7); keep exports from `index.ts`. |
| `components/auth/*` (4) | `password-input.tsx` (eye toggle ghost icon-sm inside input, `aria-pressed`), `password-confirm-field.tsx`, `password-strength-indicator.tsx` (4 segments + label), `not-activated-page.tsx` (centered status card, warning tone). |
| `components/shared/access-denied.tsx`, `dashboard-gate.tsx` | Access denied = EmptyState with `ShieldAlert` danger chip + "Go to dashboard". Gate keeps logic, only its fallback UI changes. |
| `components/storage/file-upload.tsx`, `document-file-upload.tsx` | Dropzone `rounded-lg border-2 border-dashed border-border-strong bg-surface-sunken/40 p-6 text-center`, drag-over `border-primary bg-brand-soft`; file rows with type icon, name, size, progress bar, remove. |
| `components/timesheets/*` (3), `components/expenses/*` (3, UI parts only), `components/attendance/clock-in-widget.tsx`, `components/settings/mfa-settings.tsx`, `components/editor/*` | Dialogs/Sheets per §6.1. Clock-in: pill with live timer (mono, tabular) + primary "Clock in" / secondary (ink) "Clock out"; state dot (success when clocked in, pulsing respecting reduced-motion). MFA: QR in white card with 16px padding; recovery codes in mono grid. TipTap: toolbar `h-10 border-b bg-surface-sunken/60 px-2 gap-0.5` with ghost icon-sm toggles (`data-[active=true]:bg-accent text-foreground`), content `prose` replaced by token-based typography in `styles/vendors/tiptap.css` (h1/h2 display font, links `--brand-text`, blockquote left border gold-400, code `bg-surface-sunken font-mono`). |
| `features/**` (195 files) | Covered per page in §8/Appendix A; all use primitives above. Key shared ones: `features/hr/hr-sheet.tsx` (generic HR sheet → new Sheet md with sticky header/footer), `features/hr/confirm-action-dialog.tsx` (→ AlertDialog), `features/crm/analytics/analytics-chart-card.tsx` (single chart shell: title, subtitle, legend chips, period select, body 280px), `features/crm/shared/constants.ts` (tones + chart tokens), `features/auth/auth-right-panel.tsx` (§8.1), `features/landing/*` (§8.10), `features/careers/*` (§8.10), `features/calendar/*` (§8.9). |

### 6.3 Shared patterns (build once, reuse)
- **Timeline** (`activity-timeline.tsx`, `lead-activity-timeline.tsx`, `account-timeline.tsx`, `ticket-details/activity-feed.tsx`, `charts/activity-feed.tsx`, `exit/progress-timeline.tsx`): vertical 1px `bg-border` line; 28px circular nodes (icon chip by activity type tone); content `text-sm`, actor bold, timestamp `text-xs text-muted-foreground` relative with absolute in tooltip; day separators sticky `text-2xs uppercase`.
- **Property list** (detail rails): `dl` grid `grid-cols-[120px_1fr] gap-y-2.5 text-sm`, `dt text-muted-foreground`, `dd` with inline-edit affordance on hover (pencil ghost icon) where editing already exists.
- **Toolbar** (list pages): `flex flex-wrap items-center gap-2` — search input (w-64, `Search` icon, `⌘/` Kbd hint) → FilterChips → spacer → view toggle (segmented) → secondary actions (outline) → primary action.
- **Stats strip**: horizontal row of compact metrics inside one Card divided by `divide-x` (label `text-2xs uppercase`, value `text-xl font-display tabular-nums`) — replaces rows of big colorful stat cards on list pages (`leads-stats-bar.tsx`, `deals-stats-bar.tsx`, `features/hr/bonuses/bonus-stats.tsx`, `features/hr/expenses/expense-stats.tsx`, `features/timesheets/team/team-summary.tsx`).

---

## 7. App shell redesign

### 7.1 Sidebar — `components/layout/app-sidebar.tsx`, `sidebar/sidebar-section.tsx`, `sidebar/sidebar-user-menu.tsx`, `notification-bell.tsx`
- Surface: `bg-sidebar text-sidebar-foreground` (ink in both themes). Width expanded `16rem` (change `SIDEBAR_EXPANDED_W` from `17rem` → `16rem` in `dashboard-shell.tsx`), collapsed `4rem` (from `3.5rem`). Keep cookie logic.
- **Header (h-14):** logo chip = `/logo.svg` 28px (it is already a gold circle — no extra ring/bg) + "Miyo Global" `font-display font-bold text-white text-sm` + "CRM" `text-sidebar-muted text-2xs`. Collapse button = ghost icon-sm `ChevronsLeft` (rotates when collapsed), tooltip "Collapse sidebar ( [ )".
- **Org switcher** (if `organizations.length > 1`): row under header, `h-9 rounded-md bg-sidebar-accent px-2` with org initials avatar + name + `ChevronsUpDown`.
- **Search trigger:** `h-9 rounded-md border border-sidebar-border bg-sidebar-accent/50` + `Search` icon + "Search…" + `⌘K` Kbd (opens command palette). Collapsed: icon button.
- **Groups** (from `sidebar-nav-items.ts`, unchanged data): label row `h-7 px-3 text-2xs font-semibold uppercase tracking-[0.08em] text-sidebar-muted` with chevron to collapse (keep localStorage `sidebar-groups`). Group containing the active route auto-expands.
- **Item:** `h-8 rounded-md px-2.5 gap-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-white`; icon `size-4 stroke-[1.75] text-sidebar-muted group-hover:text-white`. **Active:** `bg-sidebar-accent text-white` + icon `text-sidebar-primary` + 6px gold circle indicator at left edge (`before:absolute before:-left-2.5 before:size-1.5 before:rounded-full before:bg-sidebar-primary` — the logo circle motif) and `aria-current="page"`. Sub-items (`isSubItem`): `pl-9 h-7 text-sm text-sidebar-foreground/80`, connected by a 1px `bg-sidebar-border` vertical guide at `left-[18px]`. Badges (e.g. `badge: "leaves"`): `ml-auto h-5 min-w-5 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-3xs font-bold`.
- **Collapsed mode:** icons centered 40px hit area, tooltip with label (side right), group labels become 1px dividers, active indicator becomes left 3px gold bar rounded.
- **Footer:** notification bell (ghost icon with gold count dot) + theme toggle (icon) + user menu (`sidebar-user-menu.tsx`: avatar 28px with ring when active, name `text-sm text-white`, role `text-2xs text-sidebar-muted`; dropdown: Profile, Preferences, Theme ▸ (Light/Dark/System), Keyboard shortcuts (?), Sign out (destructive)).
- Scroll area for nav with top/bottom fade masks (`mask-image: linear-gradient(...)`).
- Delete `.sidebar-deco` dividers; use `border-sidebar-border`.

### 7.2 Topbar (new) — inside `components/layout/dashboard-shell.tsx`
Add a sticky topbar at the top of `#dashboard-content` for **all breakpoints**: `h-14 border-b border-border bg-background/85 backdrop-blur-md z-topbar px-4 sm:px-6 flex items-center gap-3`:
- Mobile (<lg): menu button (opens existing Sheet with `AppSidebar`, now `side="left" w-[16rem] z-modal`), logo lockup, spacer, search icon (opens palette), bell.
- Desktop: breadcrumbs (from `components/ui/breadcrumbs.tsx`, derived from pathname + nav labels via `getLongestMatchingNavPath`), spacer, global search button (`w-72`, "Search or jump to…", `⌘K`), "Create" split button (New lead / New deal / New ticket / Log time / Apply leave — **links/openers to existing routes/dialogs only, do not add new mutations**; show only items the role's nav already contains), bell, theme toggle.
- Keep the skip link (restyle: `focus:z-skip-link focus:bg-primary focus:text-primary-foreground`).
- `PageWrapper` header sits under topbar; with `stickyHeader` it sticks at `top-14`.

### 7.3 Page header — `components/ui/page-wrapper.tsx`
`px-4 sm:px-6 xl:px-8 pt-6 pb-4`; eyebrow (optional) `text-2xs uppercase tracking-[0.08em] text-brand-text font-semibold`; h1 `text-2xl font-display font-bold`; badge = neutral pill; subtitle `text-sm text-muted-foreground mt-1 max-w-3xl`; actions right (wrap on mobile, primary last). Filters row below: `border-y border-border bg-background px-4 sm:px-6 py-2` horizontally scrollable with fade edges. Content padding `px-4 sm:px-6 xl:px-8 pb-10`.

### 7.4 Command palette — `components/layout/command-palette.tsx`
Dialog `max-w-xl top-[15vh] rounded-xl shadow-lg p-0`. Input row with `Search` icon, placeholder "Search pages, people, deals…", `Esc` Kbd. Groups: **Recent** (last 5 visited routes from `localStorage` key `cmdk-recent` — UI-only), **Navigation** (existing nav groups, item shows group label right-aligned `text-2xs text-subtle-foreground`), **Actions** (theme toggle, toggle compact density, sign out — reuse existing handlers), plus any existing search results (keep data hooks unchanged). Item icons in 24px rounded-md `bg-muted` chips; selected item `bg-accent` with left 2px gold bar. Footer hint bar `h-9 border-t px-3 text-2xs text-muted-foreground`: `↑↓ navigate · ↵ open · esc close`. Keep `⌘K / Ctrl+K` binding (line ~92).

### 7.5 Project secondary nav — `components/layout/project-sidebar.tsx` + `app/(dashboard)/projects/[projectId]/layout.tsx`
Convert to a horizontal **project header + tab bar** under the topbar on ≥lg (project avatar (colored circle using stored project color) + name + key mono + member stack + settings icon), tabs: Board, Backlog, Sprints, Cycles, Epics, Modules, Timeline, Views, Pages, Intake, Milestones, Budget, Analytics, My tickets, Settings (same hrefs; overflow into "More" dropdown). On <lg: a select dropdown. Keep existing `access-denied-view.tsx` logic.

### 7.6 CRM settings nav — `app/(dashboard)/crm/settings/layout.tsx`
Left sub-nav (200px) on ≥md: Assignment rules, Email templates, Scoring rules, SLA — `h-8 rounded-md` items, active `bg-accent font-medium` + gold dot. <md: underline Tabs.

### 7.7 Error/404/global — `app/not-found.tsx`, `app/(dashboard)/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`, all 117 `error.tsx`
404: large "404" display 800 in `text-brand-text`, gold circle motif behind (decorative, `aria-hidden`), "Page not found", buttons "Go to dashboard" (primary) / "Go back" (ghost). Route `error.tsx` files all render `components/ui/route-error-boundary.tsx` — restyle that one component and ensure each `error.tsx` uses it (if any `error.tsx` has inline custom markup, switch it to `RouteErrorBoundary` keeping its `reset` wiring). `global-error.tsx` must include its own `<html><body>` with inline minimal styles using brand hex (no Tailwind available) — ink background, gold button.

### 7.8 Loading — all 115 `loading.tsx`
Each must render an archetype skeleton matching the new layout: `PageHeaderSkeleton` + one of `TableSkeleton` (toolbar + 8 rows), `BoardSkeleton` (`kanban-skeleton.tsx`, 4 columns × 3 cards), `DetailSkeleton` (header + 2-col), `DashboardSkeleton` (`dashboard-skeleton.tsx`, bento), `FormSkeleton`, `ChartGridSkeleton`. Put these in `components/ui/skeletons.tsx` (new) and use them in every `loading.tsx`. Add missing `loading.tsx` to routes flagged in Appendix A.

---

## 8. Page archetypes (every route maps to one — see Appendix A for the full list with route-specific notes)

Every page must define all four states: **loading** (skeleton of the final layout, no spinners for whole pages), **empty** (`EmptyState` with a contextual illustration from `components/illustrations` + primary action if the role can create), **error** (`RouteErrorBoundary` / `QueryErrorState` with retry), **populated**. Filtered-to-zero shows a *different* empty state ("No results for these filters" + "Clear filters").

### 8.1 A · Auth (9 routes) — `app/(auth)/layout.tsx`, `features/auth/auth-right-panel.tsx`
- Layout: 2 columns ≥lg (form 50% / brand panel 50%); <lg: form only with logo lockup top.
- Left: logo lockup top-left (not centered) `h-16 px-8`; form column centered `max-w-[400px] w-full`; headline `text-4xl font-display font-extrabold` (signin: "Welcome back"), subhead `text-base text-muted-foreground`; fields stacked `gap-4`; primary submit full width `lg`; secondary links `text-sm text-brand-text`. **Remove `*:text-center` on `<main>`** — forms are left-aligned. Footer `© {new Date().getFullYear()} Miyo Global` (was hardcoded 2025) `text-xs text-subtle-foreground`.
- Right (`auth-right-panel.tsx`): `brand-mark-bg` (ink-950 + gold radial), giant decorative gold circle (logo motif) partially off-canvas at 8% opacity, wordmark (`/logo-wordmark.png` is on ink bg — use it here at 160px), 3 product value props with gold icon chips, testimonial/quote card `bg-sidebar-accent border border-sidebar-border rounded-xl`. Text `text-white`/`text-sidebar-foreground` (tokens). Remove its 31 raw-palette classes and arbitrary hex.
- States: inline field errors; top-of-form `Alert` (danger-soft) for auth failures; button loading state; success screens (verify email, reset sent) use centered icon chip + title + body + action.

### 8.2 H · Hub / Dashboard
- Grid: `grid grid-cols-12 gap-4 xl:gap-6`. Row 1 KPIs: 4 × `StatCard` (`col-span-12 sm:col-span-6 xl:col-span-3`). Below: bento of `WidgetCard`s (8/4, 4/4/4, 6/6). Each widget max 6 rows + "View all".
- Header shows greeting/date (dashboard) or module description (hubs) and a primary action.
- Empty widgets use compact EmptyState (keep the `compact` prop behavior).

### 8.3 L · List / Workspace (most routes)
- `PageWrapper` (title, count badge, subtitle, actions: secondary outline buttons + one primary) → **Toolbar** (§6.3) in `filters` slot (sticky with `stickyHeader`) → optional **Stats strip** → content: Table (default) or card grid (directories like `/hr`, `/projects`, `/crm/organizations`, `/hr/assets` grid mode) → pagination.
- Tables: sticky header, first column = primary entity (avatar/icon + name + secondary line), status column = StatusPill, numeric right-aligned tabular, dates `text-muted-foreground` relative ("3d ago") with absolute in `title`, row actions = ghost `MoreHorizontal` icon-sm dropdown appearing on hover/focus (always visible on touch). Clickable rows get `cursor-pointer` and keyboard `Enter` (only if row click already exists). Bulk selection bar (if selection exists today): floating bottom-center `bg-secondary text-secondary-foreground rounded-full shadow-lg px-4 h-11` with count + actions.
- Card grids: `grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`, cards `interactive`.
- Sheets for create/edit (Sheet md) — never navigate away for small edits if a Sheet exists already.

### 8.4 K · Board / Kanban (`@hello-pangea/dnd` — leads, deals, project board, recruitment pipeline/hub, sprints, views)
Files: `features/crm/leads/leads-kanban.tsx`, `features/crm/leads/kanban-card.tsx`, `features/crm/deals/kanban-column.tsx`, `features/crm/deals/deal-kanban-card.tsx`, `components/projects/kanban-board.tsx`, `components/projects/kanban-ticket-card.tsx`, `components/projects/kanban-quick-add.tsx`, `components/hr/recruitment/pipeline-kanban.tsx`, `components/hr/recruitment/job-pipeline-kanban.tsx`, `features/hr/recruitment/kanban/candidate-card.tsx`, `features/hr/recruitment/kanban/column-skeleton.tsx`, `features/projects/sprints/sprint-planning-panel.tsx`.
- **Do not change** `DragDropContext`/`Droppable`/`Draggable` structure, `onDragEnd` handlers, ids, or `provided.draggableProps.style` spreading.
- Board canvas: `bg-surface-sunken` full-bleed under the toolbar, horizontal scroll with `kanban-scroll`, `gap-3 p-4`.
- Column: `w-[296px] shrink-0 rounded-lg bg-muted/60` (light) with header `h-11 px-3`: 8px tone dot + stage name `text-sm font-semibold` + count pill + right: summed value (`text-xs tabular-nums text-muted-foreground`) + ghost `Plus`/`MoreHorizontal`. Droppable area `min-h-24 p-2 space-y-2`; `isDraggingOver` → `bg-brand-soft/60 ring-1 ring-gold-300 ring-inset`.
- Card: `rounded-md border bg-card p-3 shadow-xs hover:shadow-md hover:border-border-strong`; title `text-sm font-medium line-clamp-2`; meta row `text-xs text-muted-foreground` (company / value / due); footer: avatar 20px + priority icon + tags (max 2 + "+N"). `isDragging` → `shadow-lg rotate-[1deg] ring-1 ring-gold-400` (keep transform from dnd). Focus visible ring for keyboard dragging.
- Column WIP/empty: dashed placeholder "Drop here" `text-xs text-subtle-foreground`.
- Quick add (`kanban-quick-add.tsx`): ghost row "+ Add" expands into inline input card.

### 8.5 D · Detail / Record
- Header block: back button + breadcrumbs (topbar) → identity row (64px avatar/icon chip, title `text-2xl font-display`, subtitle, status pill, key meta inline) → action bar (primary + secondary + overflow).
- Body `grid lg:grid-cols-[1fr_320px] gap-6`: main = underline Tabs (Overview / Activity / … existing tabs) with cards; right rail = property list cards (sticky `top-20`). <lg: rail moves above tabs as collapsible card.
- Destructive actions in overflow menu → AlertDialog.

### 8.6 F · Form / Editor
- Max width `max-w-3xl` (forms) / full width (editors). Sections as Cards with `CardHeader` title + description on the left column on ≥lg (`grid lg:grid-cols-[240px_1fr]`), fields in 1–2 columns.
- Sticky action footer `sticky bottom-0 border-t bg-background/90 backdrop-blur px-6 py-3 flex justify-end gap-2` (Cancel ghost, Save primary with loading). Dirty-state indicator "Unsaved changes" `text-xs text-warning-strong` (only if form already tracks `isDirty` via react-hook-form — read `formState`, no logic changes).
- Multi-step (onboarding, `features/onboarding/*`, `components/hr/onboarding-wizard.tsx`): stepper per §6.2.
- Document editors (`/hr/documents/editor/*`, templates): toolbar sticky; page canvas `bg-surface-sunken` with A4 white sheet `max-w-[816px] shadow-sm` centered; variables panel (`org-variables-panel.tsx`) as right rail 280px.

### 8.7 S · Settings
- Settings index `/settings/[[...rest]]` and `/settings/*`: two-level — global settings nav (from sidebar "System" group) + content `max-w-4xl`. Each setting = row card: title + description left, control right (switch/select/button). Danger zone card `border-danger-soft` with `text-destructive` title.
- Lists inside settings (members, roles, webhooks, custom fields, job roles, termination reasons, branches, locations) use Table + Sheet pattern.
- Permission matrix (`features/settings/roles/permission-matrix.tsx`): sticky first column + header, checkboxes centered, row group headers `bg-surface-sunken text-2xs uppercase`, column hover highlight.

### 8.8 R · Report / Analytics
- Header with date-range picker + export in actions. Top: Stats strip. Body: `grid gap-4 lg:grid-cols-2` of `analytics-chart-card` shells; full-width tables at bottom.
- **Chart style (recharts):** no chart borders; `CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3"`; axes `tickLine={false} axisLine={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }}`; series colors `var(--chart-1..8)` in order; bars `radius={[4,4,0,0]}` max 28px; lines 2px with `dot={false}` `activeDot={{ r: 4 }}`; areas gradient 24%→0; tooltip custom component = popover card (`bg-popover border rounded-md shadow-md px-3 py-2 text-xs`, colored 8px circles); legend = custom chips above chart. Funnel (`pipeline-funnel-chart.tsx`): horizontal bars descending with conversion % between steps. Heatmaps (`attendance-heatmap.tsx`, `hr/skills`/skills-matrix): gold scale 50→700 (5 buckets) with legend; zero = `bg-muted`.
- Number formatting unchanged (use existing `lib/format-utils.ts`).

### 8.9 C · Calendar / Timeline (`/calendar`, `/projects/[projectId]/timeline`)
- `styles/vendors/react-big-calendar.css` (new) re-implements `.calendar-container .rbc-*`: header cells `text-2xs uppercase text-muted-foreground h-9`, month cells min-h-28, date number top-left `text-xs` (today = 24px gold circle with ink text — logo motif), off-range `bg-surface-sunken/60 text-subtle-foreground`, events `rounded-sm px-1.5 text-2xs font-medium` with tone-soft bg + 2px left tone border, "+N more" `text-brand-text`, time grid lines `var(--border)`, now indicator `var(--primary)` 2px with circle head. Toolbar replaced by custom header: Today (outline) / prev-next (ghost icons) / title (display text-xl) / view segmented (Month/Week/Day/Agenda).
- Gantt per §6.2.

### 8.10 P · Public & M · Marketing (`/`, `/careers*`, `/interview-booking/[token]`, `/offer-acceptance/[token]`)
- `app/(public)/layout.tsx`: add a slim public header (ink, logo lockup, "Careers" link) and footer — **only for /careers routes** via `features/careers/careers-header.tsx`/`careers-footer.tsx` (already exist); token pages get a minimal centered layout with logo top.
- Light theme forced for public token pages? **No** — respect system theme; ensure both look right.
- Landing (`features/landing/landing-page.tsx`, `landing-shared.tsx`, `landing-footer.tsx`): ink hero (`brand-mark-bg`), H1 `text-5xl font-display font-extrabold text-white` with one gold word (`text-gold-400` is OK on ink: 7.88:1), subcopy `text-sidebar-foreground`, CTA primary + outline-on-dark (new Button `variant="outline-inverse"`: `border border-sidebar-border text-sidebar-accent-foreground hover:bg-sidebar-accent`). Feature grid on light background, 3 columns, icon chips. Footer ink. Keep all copy/links.

---

## 9. UX improvements (cross-cutting)

1. **Navigation:** breadcrumbs in topbar; active group auto-expand; sidebar search → palette; "Create" menu; project tab bar; consistent Back buttons on detail pages (`page-back-button.tsx`).
2. **Keyboard shortcuts** (new `components/layout/shortcuts-provider.tsx`, mounted in `DashboardShell`; ignore when focus is in input/textarea/contenteditable; all UI-only):
   - `⌘/Ctrl K` command palette (existing) · `/` focus page search input (elements with `data-page-search`) · `[` toggle sidebar (`handleToggleSidebar`) · `g d` dashboard · `g l` leads · `g p` deals (pipeline) · `g e` employees · `g j` projects · `g c` calendar · `g n` notifications · `g s` settings · `?` shortcuts dialog (Dialog md listing all, with `Kbd`) · `Esc` closes overlays (Radix default).
   - Only navigate to routes present in the user's role nav (`getNavGroupsForRole`).
3. **Feedback:** every mutation button shows `loading`; toasts for success/failure (existing calls keep working with restyled Sonner); destructive actions always via AlertDialog; optimistic UI unchanged.
4. **Density:** default comfortable; Compact toggle (existing) now drives `--row-h/--cell-py/--card-p`.
5. **Accessibility (WCAG 2.2 AA):** contrast per §3.4; focus visible everywhere (`focus-ring`); hit targets ≥ 32px desktop / 44px touch; icon-only buttons have `aria-label` + tooltip; status never by color alone (pill text/dot + label); `aria-current` on nav; `aria-live="polite"` for toasts (Sonner default) and async table updates; forms: `aria-describedby` errors (shadcn `Form` already) ; reduced motion honored; skip link; landmarks (`nav`, `main`, `aside`, `header`); headings hierarchical (one h1 per page = PageWrapper title). Charts: `role="img"` + `aria-label` summary, and a "View as table" toggle where a table equivalent already exists in the page data.
6. **Responsive:** <sm: single column, tables become horizontally scrollable with sticky first column (or card list where the component already has a mobile variant); toolbars wrap, filters move into a "Filters" Sheet; Sheets become bottom sheets; topbar replaces sidebar <lg; boards scroll horizontally with snap (`snap-x snap-mandatory`, column `snap-start`). Test widths 375, 768, 1024, 1280, 1536.
7. **Dark mode:** enabled (§4); verify every page; charts, calendar, TipTap, phone input, react-day-picker, Sonner, illustrations all themed.
8. **Microcopy & numbers:** tabular nums; currency right-aligned; truncate with tooltip (`title`) for long names; relative dates with absolute tooltip.
9. **Empty states:** contextual illustration + one-line explanation + primary action (only when the role can act).

---

## 10. File plan (new / rewritten files)

New: `styles/vendors/sonner.css`, `styles/vendors/react-big-calendar.css`, `styles/vendors/tiptap.css`, `styles/vendors/phone-input.css`, `lib/design/tones.ts`, `lib/design/brand-hex.ts`, `components/ui/filter-chip.tsx`, `components/ui/breadcrumbs.tsx`, `components/ui/kbd.tsx`, `components/ui/status-pill.tsx`, `components/ui/icon-chip.tsx`, `components/ui/skeletons.tsx`, `components/layout/theme-toggle.tsx`, `components/layout/topbar.tsx`, `components/layout/shortcuts-provider.tsx`, `components/layout/shortcuts-dialog.tsx`, `components/dashboard/widgets/widget-card.tsx`, missing `loading.tsx` files (Appendix A).
Rewritten: `globals.css`, `app/layout.tsx` (fonts/theme/body classes only), every file in `components/ui/`, `components/layout/*`, `lib/theme-constants.ts` (values only), `lib/motion-variants.ts` (values only), all color-map `.ts` files (values only).
Touched for class swaps: every file listed by the §5.6 greps.

---

## 11. Phased execution (tick every box; commit after each phase)

**Phase 0 — Setup**
- [ ] `git status` clean except known untracked (`.omc/`, `scripts/generate-miyo-payslips.ts`); `git checkout -b feat/ui-revamp-gold-ink`
- [ ] `pnpm install`; baseline `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → record results in `docs/ui-revamp-baseline.md` (pre-existing failures are not yours, but don't add new ones)
- [ ] Run the §5.6 greps and record baseline counts in the same file
- [ ] `pnpm dev`, capture "before" screenshots of the 10 PR pages (light)

**Phase 1 — Tokens, fonts, theme**
- [ ] Rewrite `globals.css` (§3.8) + create `styles/vendors/*.css`
- [ ] `app/layout.tsx`: next/font (Montserrat, Plus Jakarta Sans, IBM Plex Mono), remove Google `<link>`s, remove `forcedTheme`, body classes, viewport themeColor
- [ ] `lib/design/tones.ts`, `lib/design/brand-hex.ts`
- [ ] `components/layout/theme-toggle.tsx`
- [ ] Build passes (expect visual breakage of legacy classes — fixed next phases)

**Phase 2 — Primitives** (`components/ui/*`, all 50 + new ones in §6.1)
- [ ] button, badge, card, input, textarea, label, form
- [ ] select, searchable-select, searchable-combobox, searchable-multi-select, checkbox, radio-group, switch, slider
- [ ] dialog, alert-dialog, confirm-dialog, sheet, popover, tooltip, dropdown-menu, command
- [ ] tabs, table, data-table-pagination, avatar, avatar-stack, avatar-crop-dialog
- [ ] calendar, date-picker, date-range-picker, future-datetime-input, phone-input
- [ ] skeleton, dashboard-skeleton, kanban-skeleton, skeletons (new), empty-state, query-error-state, route-error-boundary, min-length-hint
- [ ] stat-card, page-wrapper, page-back-button, export-button, scroll-area, separator, sonner, svg-icons, progress, progress-bar
- [ ] new: filter-chip, breadcrumbs, kbd, status-pill, icon-chip
- [ ] `pnpm test` (empty-state, query-error-state, min-length-hint tests green)

**Phase 3 — App shell**
- [ ] `dashboard-shell.tsx` (widths, topbar, mobile sheet z), `topbar.tsx`
- [ ] `app-sidebar.tsx`, `sidebar-section.tsx`, `sidebar-user-menu.tsx`, `notification-bell.tsx`
- [ ] `command-palette.tsx` (recent, actions, footer hints)
- [ ] `project-sidebar.tsx` → project header/tabs; `projects/[projectId]/layout.tsx`
- [ ] `crm/settings/layout.tsx` sub-nav
- [ ] shortcuts provider + dialog
- [ ] not-found (2), `app/error.tsx`, `global-error.tsx`, route-error-boundary wiring in all 117 `error.tsx`
- [ ] `sidebar-nav-items.test.ts` still green (data untouched)

**Phase 4 — Global sweeps (mechanical, whole repo)**
- [ ] Rewrite all color-map `.ts` files to tones (§5.3 list)
- [ ] Replace legacy classes (§5.2) everywhere — grep #5 → 0
- [ ] Replace raw palette classes — grep #4 → 0 (work hotspot list first)
- [ ] Replace `text-[Npx]`, `rounded-[…]`, `shadow-[…]`, `z-[N]` — grep #7 → 0
- [ ] Replace `bg-white/black`, `text-white/black` — grep #8 → 0 (except tones.ts)
- [ ] Remove color `dark:` variants — grep #9 targets met
- [ ] Charts/hex/rgb → tokens — greps #1–#3 → 0 (allowed exceptions only)
- [ ] Illustrations recolor; `public/illustrations/*.svg` accent hex → `#D4AF37`
- [ ] typecheck/lint/test/build

**Phase 5 — Auth, public, landing** (routes A, P, M in Appendix A)
- [ ] `app/(auth)/layout.tsx`, `features/auth/auth-right-panel.tsx`, 9 auth pages + their loading/error
- [ ] `features/landing/*`, `app/(public)/layout.tsx`, `features/careers/*`, 7 public pages

**Phase 6 — Dashboard & CRM** (`/dashboard*`, `/crm*`, `/billing*`, `/ai`, `/ceo/qr-code`, `/reports`, `/notifications`, `/calendar`)
- [ ] Dashboard widgets + WidgetCard
- [ ] Leads (board, table, detail sheet, detail page, distribute, duplicates, smart-search, source-report)
- [ ] Deals (board, table, side panel, detail, approvals, aging, win-loss)
- [ ] Organizations, clients, contacts, targets, territories, quotes, web-forms, analytics, reports, CRM settings (4)
- [ ] Billing, invoices (list/new/detail), AI hub, QR, notifications, calendar
- [ ] Add missing loading.tsx for this group

**Phase 7 — HR & Recruitment** (`/hr*`, `/onboarding`)
- [ ] Employees (directory, detail, skills-matrix, find-expert, terminated, org-chart, teams)
- [ ] Attendance, leaves, payroll, my-payslips, bonuses, my-bonuses, incentives, loans, expenses, reimbursements, fnf
- [ ] Documents (list, editors, templates, types, review, handbook), email templates, offer-letter templates
- [ ] Assets, asset-returns, my-assets, devices, helpdesk, compliance, certifications, background-verification
- [ ] Performance, recognition, career ladders/profiles/evaluations/promotions, skills, learning-paths, training, assessments, surveys, enps, team-events, alumni, analytics
- [ ] Onboarding (hub, [userId], my-tasks, /onboarding), exit, termination
- [ ] Recruitment hub, jobs (list/new/edit), candidates (list/detail), pipeline, interviews, question bank, hiring flows, diversity report, interviewer performance
- [ ] Add missing loading.tsx for this group

**Phase 8 — Projects, timesheets, support, settings**
- [ ] Projects list, templates, resource allocation, project workspace + 14 sub-routes
- [ ] Timesheets (mine, team), tasks/overdue
- [ ] Support (hub, inbox)
- [ ] Settings: profile/security/preferences (theme radio cards), organization, members, roles, permissions, audit-log, webhooks, ai, notifications, custom-fields, data-hub, integrations/recruitment, job-office-locations, job-roles, payroll-schedule, termination-reasons, branches, email-templates
- [ ] Add missing loading.tsx for this group

**Phase 9 — Emails & PDFs color alignment** (§5.5) — constants only; run related tests.

**Phase 10 — QA & PR**
- [ ] All §5.6 greps at target; paste outputs into PR
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green; `pnpm lint:dead-code` no new dead code (delete now-unused legacy helpers)
- [ ] Manual QA checklist §12.2 in light + dark at 375 / 1024 / 1440
- [ ] `graphify update .` (per `CLAUDE.md`)
- [ ] Push branch, open PR "UI/UX revamp: Gold & Ink design system" with before/after screenshots, grep results, list of new files, and a "No logic changes" statement with `git diff --stat` excluding UI files reviewed

---

## 12. Acceptance criteria & QA

### 12.1 Definition of done
1. Zero legacy tokens/classes/fonts/colors (all §5.6 greps at target).
2. Every one of the 172 routes renders in the new shell with loading/empty/error/populated states styled; every route listed in Appendix A as missing `loading.tsx` now has one.
3. Light and dark themes both complete; theme switcher works (sidebar menu, settings, command palette); preference persists (next-themes localStorage).
4. All text/background pairs meet AA (spot-check with browser devtools contrast on: body text, muted text, links, badges of each tone, primary/secondary/destructive buttons, sidebar items, table header, chart axis labels) in both themes.
5. Keyboard: every interactive element reachable and visibly focused; shortcuts from §9.2 work; palette ⌘K works; no focus traps outside modals.
6. No behavior change: same API calls (check Network tab on leads/deals/payroll pages before vs after), same routes, same RBAC visibility, DnD moves still persist, forms submit the same payloads.
7. CI (`pr-check.yml`: lint + build) green; `pnpm test` green; typecheck clean.
8. Lighthouse (desktop, `/signin` and `/dashboard`): Accessibility ≥ 95; no CLS from font loading (next/font `display: swap` with size-adjust).

### 12.2 Manual QA checklist (each in light + dark; 375px, 1024px, 1440px)
- [ ] Sign in → dashboard (all widgets, clock-in)
- [ ] Sidebar: collapse/expand (cookie persists), group collapse (localStorage), active item indicator, badges, collapsed tooltips, mobile sheet
- [ ] Topbar: breadcrumbs correct on nested routes (e.g. `/crm/deals/[dealId]`, `/hr/recruitment/candidates/[candidateId]`, `/projects/[projectId]/sprints`)
- [ ] Command palette: open, search, navigate, actions, recent
- [ ] Leads board: drag card between columns (persists), open detail sheet, table view, filters, export/import dialogs
- [ ] Deals board: drag, stage-skip dialog, win/loss dialog, side panel, forecast widget
- [ ] Deal & lead detail pages: tabs, timeline, quick actions, edit forms
- [ ] CRM analytics/reports/win-loss/source-report charts (tooltips, legends, colors in dark)
- [ ] Employees directory/detail, org chart, skills matrix heatmap
- [ ] Attendance heatmap/calendar, leaves request sheet + approvals, payroll run + payslip sheet
- [ ] Recruitment pipeline drag, candidate detail tabs, interview availability grid
- [ ] Documents editor (TipTap) + template editor
- [ ] Project board/list/table/calendar/gantt views, ticket sheet, sprints burndown/velocity
- [ ] Timesheets weekly grid, log time dialog
- [ ] Calendar month/week/day/agenda
- [ ] Settings: preferences theme + compact toggle, members table, roles permission matrix, audit log
- [ ] Toasts: success/error/warning/info/loading
- [ ] 404, route error boundary (simulate by throwing in dev only, revert), global-error
- [ ] Public: careers list/detail/apply, interview booking, offer acceptance, landing
- [ ] Reduced motion (OS setting) → no animations
- [ ] Zoom 200% → no clipped content

---
## Appendix A — Every route (172) with archetype, current loading/error coverage, and route-specific notes

Legend: L/E = `loading.tsx` / `error.tsx` present today (✓/✗). Features = detected UI features in the page file. Routes without a specific note follow their archetype in §8 exactly. Files referenced in notes are the components that page composes.

| Route | File | Archetype | L / E | Features | Redesign notes |
|---|---|---|---|---|---|
| `/` | `app/page.tsx` | M · Marketing | ✗ / ✓ | landing | Landing (`features/landing/landing-page.tsx`, `landing-shared.tsx`, `landing-footer.tsx`): ink-950 hero with wordmark, gold "MI" circle motif as large background mark at 6% opacity, H1 in display font 56/64, gold primary CTA "Sign in", ghost secondary. Remove every `bg-[#...]`/raw palette in landing files. |
| `/account-deactivated` | `app/(auth)/account-deactivated/page.tsx` | A · Auth | ✗ / ✗ | — | Centered danger-soft status card, contact-admin text, sign-out button. |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | A · Auth | ✓ / ✗ | form | Auth shell; single centered card form; see §8.1. |
| `/invitation/[token]` | `app/(auth)/invitation/[token]/page.tsx` | A · Auth | ✓ / ✓ | form | Show org name + inviter avatar in a brand-subtle callout above the password form; error.tsx shows expired-invite state with illustration. |
| `/mfa` | `app/(auth)/mfa/page.tsx` | A · Auth | ✗ / ✗ | form | 6-digit OTP: six 48×56 boxes, mono font, auto-advance, paste support (UI only), countdown text muted. |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | A · Auth | ✗ / ✗ | form | Auth shell; single centered card form; see §8.1. |
| `/setup-password` | `app/(auth)/setup-password/page.tsx` | A · Auth | ✗ / ✗ | form | Auth shell; single centered card form; see §8.1. |
| `/signin` | `app/(auth)/signin/page.tsx` | A · Auth | ✓ / ✗ | form | Split layout from `app/(auth)/layout.tsx`. Left: form card max-w 400, title "Welcome back" display-xl, email+password (`components/auth/password-input.tsx`), primary full-width button, "Forgot password?" link in brand-text. Inline field errors, submit shows spinner inside button, disable while pending. Right: `features/auth/auth-right-panel.tsx` rebuilt as ink-950 panel with wordmark, 3 rotating value-props, subtle gold radial glow; no raw palette classes (it has 31 today). |
| `/signup` | `app/(auth)/signup/page.tsx` | A · Auth | ✗ / ✗ | form | Same shell as /signin; multi-field form in 2 columns ≥sm; password strength via `components/auth/password-strength-indicator.tsx` restyled as 4 segmented bars (danger→warning→info→success tokens). |
| `/verify-email` | `app/(auth)/verify-email/page.tsx` | A · Auth | ✓ / ✗ | form | Centered status card: icon in 56px gold-soft circle, title, body, resend button (ghost) with cooldown label. |
| `/ai` | `app/(dashboard)/ai/page.tsx` | L · List/Workspace | ✗ / ✗ | form,tabs,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/billing` | `app/(dashboard)/billing/page.tsx` | H · Hub | ✓ / ✓ | table | Hub archetype §8.2. |
| `/billing/invoices` | `app/(dashboard)/billing/invoices/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/billing/invoices/new` | `app/(dashboard)/billing/invoices/new/page.tsx` | F · Form/Editor | ✓ / ✓ | form | Form/Editor archetype §8.6. |
| `/billing/invoices/[invoiceId]` | `app/(dashboard)/billing/invoices/[invoiceId]/page.tsx` | D · Detail | ✓ / ✓ | table,form,overlays | Detail/Record archetype §8.5. |
| `/calendar` | `app/(dashboard)/calendar/page.tsx` | C · Calendar/Timeline | ✓ / ✓ | calendar | `features/calendar/*` + `.rbc-*` overrides rewritten in `styles/vendors/react-big-calendar.css` (see §6). Today cell gold-50, events tinted by tone, header toolbar uses new segmented control. |
| `/ceo/qr-code` | `app/(dashboard)/ceo/qr-code/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | Generator form left, live QR preview card right; QR foreground stays ink-900 on white for scannability (do not theme the QR itself). |
| `/crm` | `app/(dashboard)/crm/page.tsx` | H · Hub | ✓ / ✓ | charts | CRM Hub: KPI strip (pipeline value, open deals, win rate, new leads 7d) → `features/crm/shared/crm-pipeline-mini.tsx` as horizontal stage bar with stage tones → recent activity (`crm-recent-activity.tsx`) as timeline. Quick actions: New lead, New deal, Import CSV. |
| `/crm/analytics` | `app/(dashboard)/crm/analytics/page.tsx` | R · Report | ✓ / ✓ | charts,table | Report archetype; 2-col chart grid using `analytics-chart-card.tsx` as the single chart shell; date range picker top-right; rep table (`rep-performance-table.tsx`) full width. All chart colors from `--chart-*` tokens (remove hex/rgb in `lead-volume-chart.tsx`, `pipeline-funnel-chart.tsx`, `deal-value-chart.tsx`, `features/crm/shared/constants.ts`). |
| `/crm/clients` | `app/(dashboard)/crm/clients/page.tsx` | L · List/Workspace | ✓ / ✓ | table,form,overlays | List/Workspace archetype §8.3. |
| `/crm/clients/[clientId]` | `app/(dashboard)/crm/clients/[clientId]/page.tsx` | D · Detail | ✓ / ✓ | form,overlays | Detail/Record archetype §8.5. |
| `/crm/contacts` | `app/(dashboard)/crm/contacts/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/crm/deals` | `app/(dashboard)/crm/deals/page.tsx` | K · Board | ✓ / ✓ | kanban,table,overlays | Pipeline board (`kanban-column.tsx`, `deal-kanban-card.tsx`) with column header = stage name + count + summed value (tabular-nums); forecast widget (`deal-forecast-widget.tsx`) collapsible above board; filter bar (`kanban-filter-bar.tsx`); side panel (`deal-side-panel.tsx`) as Sheet; table view (`deal-table-view.tsx`). Win/loss + stage-skip dialogs restyled to new Dialog. |
| `/crm/deals/[dealId]` | `app/(dashboard)/crm/deals/[dealId]/page.tsx` | D · Detail | ✓ / ✓ | form,overlays | Record page like lead detail: stage progress stepper across top (circles = brand motif; completed = gold fill, current = gold ring, future = ink-200), value + close date + probability KPIs, activity timeline, meetings card, edit form in Sheet. |
| `/crm/deals/aging` | `app/(dashboard)/crm/deals/aging/page.tsx` | R · Report | ✓ / ✓ | table | Report archetype §8.8. |
| `/crm/deals/approvals` | `app/(dashboard)/crm/deals/approvals/page.tsx` | L · List/Workspace | ✓ / ✓ | table,tabs,overlays | List/Workspace archetype §8.3. |
| `/crm/deals/win-loss` | `app/(dashboard)/crm/deals/win-loss/page.tsx` | R · Report | ✓ / ✓ | charts | Report archetype §8.8. |
| `/crm/leads` | `app/(dashboard)/crm/leads/page.tsx` | K · Board | ✓ / ✓ | kanban,table,form,overlays | Primary workspace. Toolbar (`leads-toolbar.tsx`): search (⌘/), saved views, filter chips, view toggle Board/Table (segmented control), density toggle, Export, Import, primary "New lead". Stats (`leads-stats-bar.tsx`) as compact inline metrics row (not big cards). Board (`leads-kanban.tsx`, `kanban-card.tsx`) + table (`lead-table-view.tsx`, `lead-table/*`). Lead detail opens in right Sheet (`lead-detail-sheet.tsx`) 560px. |
| `/crm/leads/[leadId]` | `app/(dashboard)/crm/leads/[leadId]/page.tsx` | D · Detail | ✓ / ✓ | form | Record page: header (`detail/lead-detail-header.tsx`) with avatar initials circle, name, company, status pill, score ring, owner; action bar (`lead-quick-actions.tsx`). Two-column: main = tabs Activity/Details/Emails, timeline (`lead-activity-timeline.tsx`); right rail 320px = `lead-info-card.tsx` + `lead-sidebar.tsx` as stacked property lists. |
| `/crm/leads/distribute` | `app/(dashboard)/crm/leads/distribute/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/crm/leads/duplicates` | `app/(dashboard)/crm/leads/duplicates/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/crm/leads/smart-search` | `app/(dashboard)/crm/leads/smart-search/page.tsx` | L · List/Workspace | ✓ / ✓ | table | List/Workspace archetype §8.3. |
| `/crm/leads/source-report` | `app/(dashboard)/crm/leads/source-report/page.tsx` | R · Report | ✓ / ✓ | charts | Report archetype §8.8. |
| `/crm/organizations` | `app/(dashboard)/crm/organizations/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/crm/organizations/[organizationId]` | `app/(dashboard)/crm/organizations/[organizationId]/page.tsx` | D · Detail | ✗ / ✗ | charts,tabs,overlays | Detail/Record archetype §8.5. **Add `loading.tsx`** (archetype skeleton). |
| `/crm/quotes` | `app/(dashboard)/crm/quotes/page.tsx` | L · List/Workspace | ✗ / ✗ | table,form,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/crm/quotes/[quoteId]` | `app/(dashboard)/crm/quotes/[quoteId]/page.tsx` | D · Detail | ✗ / ✗ | table,overlays | Detail/Record archetype §8.5. **Add `loading.tsx`** (archetype skeleton). |
| `/crm/reports` | `app/(dashboard)/crm/reports/page.tsx` | R · Report | ✓ / ✓ | charts | Report archetype §8.8. |
| `/crm/settings/assignment-rules` | `app/(dashboard)/crm/settings/assignment-rules/page.tsx` | S · Settings | ✓ / ✓ | form,overlays | Settings archetype §8.7. |
| `/crm/settings/email-templates` | `app/(dashboard)/crm/settings/email-templates/page.tsx` | S · Settings | ✓ / ✓ | form,overlays | Settings archetype §8.7. |
| `/crm/settings/scoring-rules` | `app/(dashboard)/crm/settings/scoring-rules/page.tsx` | S · Settings | ✓ / ✓ | table,form,overlays | Settings archetype §8.7. |
| `/crm/settings/sla` | `app/(dashboard)/crm/settings/sla/page.tsx` | S · Settings | ✓ / ✓ | table,form,overlays | Settings archetype §8.7. |
| `/crm/targets` | `app/(dashboard)/crm/targets/page.tsx` | L · List/Workspace | ✓ / ✓ | charts,overlays | List/Workspace archetype §8.3. |
| `/crm/territories` | `app/(dashboard)/crm/territories/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/crm/web-forms` | `app/(dashboard)/crm/web-forms/page.tsx` | L · List/Workspace | ✓ / ✓ | charts,form,overlays | List/Workspace archetype §8.3. |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | H · Hub | ✓ / ✓ | widgets | Role-aware home. Row 1: greeting (display-lg) + date + `components/attendance/clock-in-widget.tsx` as a compact pill on the right. Row 2: 4 KPI `StatCard`s. Row 3: 12-col bento grid — My tasks (8) / Pending approvals (4); Team attendance (4) / Upcoming leaves (4) / Leave balance (4); Announcements, recent projects, sprint, activity. Every widget in `components/dashboard/widgets/*` and `features/dashboard/*` uses the new Card + WidgetHeader (title, count chip, "View all" link). Skeletons mirror final layout (`widget-skeleton.tsx`). |
| `/dashboard/admin-health` | `app/(dashboard)/dashboard/admin-health/page.tsx` | H · Hub | ✗ / ✗ | — | Hub archetype §8.2. **Add `loading.tsx`** (archetype skeleton). |
| `/dashboard/branches` | `app/(dashboard)/dashboard/branches/page.tsx` | L · List/Workspace | ✗ / ✗ | charts,table,tabs | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr` | `app/(dashboard)/hr/page.tsx` | H · Hub | ✓ / ✓ | hub | People hub: employee directory with search, department filter chips, Grid/Table toggle; employee cards show avatar with gold ring for managers, role, dept, status dot. |
| `/hr/alumni` | `app/(dashboard)/hr/alumni/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/analytics` | `app/(dashboard)/hr/analytics/page.tsx` | R · Report | ✓ / ✓ | tabs | Report archetype §8.8. |
| `/hr/assessments` | `app/(dashboard)/hr/assessments/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/asset-returns` | `app/(dashboard)/hr/asset-returns/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/hr/assets` | `app/(dashboard)/hr/assets/page.tsx` | L · List/Workspace | ✓ / ✓ | table,form,tabs,overlays | List/Workspace archetype §8.3. |
| `/hr/attendance` | `app/(dashboard)/hr/attendance/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | `attendance-content.tsx`: today summary strip, heatmap (`attendance-heatmap.tsx`) using gold scale 100→600 for intensity, calendar (`attendance-calendar.tsx`), team monitor table. |
| `/hr/background-verification` | `app/(dashboard)/hr/background-verification/page.tsx` | L · List/Workspace | ✓ / ✓ | charts,tabs,overlays | List/Workspace archetype §8.3. |
| `/hr/bonuses` | `app/(dashboard)/hr/bonuses/page.tsx` | L · List/Workspace | ✓ / ✓ | table,form,overlays | List/Workspace archetype §8.3. |
| `/hr/career-evaluations` | `app/(dashboard)/hr/career-evaluations/page.tsx` | L · List/Workspace | ✗ / ✗ | table,form,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/career-ladders` | `app/(dashboard)/hr/career-ladders/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/hr/career-ladders/[id]` | `app/(dashboard)/hr/career-ladders/[id]/page.tsx` | D · Detail | ✗ / ✗ | form,overlays | Detail/Record archetype §8.5. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/career-profiles` | `app/(dashboard)/hr/career-profiles/page.tsx` | L · List/Workspace | ✗ / ✗ | table,form,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/career-promotions` | `app/(dashboard)/hr/career-promotions/page.tsx` | L · List/Workspace | ✗ / ✗ | table,form,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/certifications` | `app/(dashboard)/hr/certifications/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/compliance` | `app/(dashboard)/hr/compliance/page.tsx` | L · List/Workspace | ✓ / ✓ | — | List/Workspace archetype §8.3. |
| `/hr/devices` | `app/(dashboard)/hr/devices/page.tsx` | W · Wrapper | ✗ / ✗ | wrapper | Thin wrapper/redirect: no visual work beyond confirming it renders inside the new shell. |
| `/hr/document-review` | `app/(dashboard)/hr/document-review/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/hr/document-types` | `app/(dashboard)/hr/document-types/page.tsx` | L · List/Workspace | ✓ / ✓ | table,form,overlays | List/Workspace archetype §8.3. |
| `/hr/documents` | `app/(dashboard)/hr/documents/page.tsx` | L · List/Workspace | ✓ / ✓ | table,form,overlays | List/Workspace archetype §8.3. |
| `/hr/documents/editor/[documentId]` | `app/(dashboard)/hr/documents/editor/[documentId]/page.tsx` | F · Form/Editor | ✓ / ✗ | editor | Form/Editor archetype §8.6. |
| `/hr/documents/editor/new` | `app/(dashboard)/hr/documents/editor/new/page.tsx` | F · Form/Editor | ✓ / ✗ | editor | Form/Editor archetype §8.6. |
| `/hr/documents/templates` | `app/(dashboard)/hr/documents/templates/page.tsx` | L · List/Workspace | ✗ / ✗ | table,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/documents/templates/[templateId]/edit` | `app/(dashboard)/hr/documents/templates/[templateId]/edit/page.tsx` | F · Form/Editor | ✗ / ✗ | editor | Form/Editor archetype §8.6. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/documents/templates/new` | `app/(dashboard)/hr/documents/templates/new/page.tsx` | F · Form/Editor | ✗ / ✗ | editor | Form/Editor archetype §8.6. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/email-templates` | `app/(dashboard)/hr/email-templates/page.tsx` | L · List/Workspace | ✓ / ✓ | form,tabs,overlays | List/Workspace archetype §8.3. |
| `/hr/employees` | `app/(dashboard)/hr/employees/page.tsx` | L · List/Workspace | ✓ / ✓ | table | List/Workspace archetype §8.3. |
| `/hr/employees/[employeeId]` | `app/(dashboard)/hr/employees/[employeeId]/page.tsx` | D · Detail | ✓ / ✓ | detail | Profile: cover band (ink-900 with subtle gold radial), 96px avatar overlapping band, name/role/status, tabs (Overview, Personal, Professional, Bank, Assets, Projects, Attendance, Tickets). Sections from `features/hr/employees/detail/*` become property-list cards. |
| `/hr/employees/find-expert` | `app/(dashboard)/hr/employees/find-expert/page.tsx` | W · Wrapper | ✗ / ✗ | wrapper | Thin wrapper/redirect: no visual work beyond confirming it renders inside the new shell. |
| `/hr/employees/skills-matrix` | `app/(dashboard)/hr/employees/skills-matrix/page.tsx` | L · List/Workspace | ✗ / ✗ | overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/employees/terminated` | `app/(dashboard)/hr/employees/terminated/page.tsx` | L · List/Workspace | ✗ / ✗ | table,form | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/enps` | `app/(dashboard)/hr/enps/page.tsx` | R · Report | ✓ / ✓ | charts,overlays | Report archetype §8.8. |
| `/hr/exit` | `app/(dashboard)/hr/exit/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/hr/expenses` | `app/(dashboard)/hr/expenses/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/fnf` | `app/(dashboard)/hr/fnf/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/handbook` | `app/(dashboard)/hr/handbook/page.tsx` | L · List/Workspace | ✓ / ✓ | form,tabs,overlays | List/Workspace archetype §8.3. |
| `/hr/helpdesk` | `app/(dashboard)/hr/helpdesk/page.tsx` | L · List/Workspace | ✓ / ✓ | table,form,overlays | List/Workspace archetype §8.3. |
| `/hr/holidays` | `app/(dashboard)/hr/holidays/page.tsx` | L · List/Workspace | ✗ / ✗ | form,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/incentives` | `app/(dashboard)/hr/incentives/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/hr/learning-paths` | `app/(dashboard)/hr/learning-paths/page.tsx` | L · List/Workspace | ✓ / ✓ | charts,overlays | List/Workspace archetype §8.3. |
| `/hr/leaves` | `app/(dashboard)/hr/leaves/page.tsx` | W · Wrapper | ✓ / ✓ | wrapper | Thin wrapper → `app/(dashboard)/hr/leaves/leaves-wfh-content.tsx`, `leaves-tab-content.tsx`, `wfh-tab-content.tsx`, `leave-approvals.tsx`, `leaves-shared.tsx` (29 raw palette hits). Tabs Leaves/WFH/Approvals; balance cards; request Sheet. |
| `/hr/loans` | `app/(dashboard)/hr/loans/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/my-assets` | `app/(dashboard)/hr/my-assets/page.tsx` | L · List/Workspace | ✗ / ✗ | — | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/my-bonuses` | `app/(dashboard)/hr/my-bonuses/page.tsx` | L · List/Workspace | ✓ / ✗ | — | List/Workspace archetype §8.3. |
| `/hr/my-payslips` | `app/(dashboard)/hr/my-payslips/page.tsx` | L · List/Workspace | ✓ / ✓ | — | List/Workspace archetype §8.3. |
| `/hr/offer-letter-templates` | `app/(dashboard)/hr/offer-letter-templates/page.tsx` | L · List/Workspace | ✗ / ✗ | form,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/onboarding` | `app/(dashboard)/hr/onboarding/page.tsx` | L · List/Workspace | ✓ / ✓ | tabs,overlays | List/Workspace archetype §8.3. |
| `/hr/onboarding/[userId]` | `app/(dashboard)/hr/onboarding/[userId]/page.tsx` | D · Detail | ✗ / ✗ | — | Detail/Record archetype §8.5. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/onboarding/my-tasks` | `app/(dashboard)/hr/onboarding/my-tasks/page.tsx` | L · List/Workspace | ✗ / ✓ | — | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/org-chart` | `app/(dashboard)/hr/org-chart/page.tsx` | L · List/Workspace | ✓ / ✓ | charts,tabs | Tree on dotted-grid canvas (ink-200 dots), node cards 220px with avatar, name, title; zoom controls bottom-right; minimap optional (only if already present). |
| `/hr/payroll` | `app/(dashboard)/hr/payroll/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | Run-centric: period selector, status stepper (Draft→Pending approval→Approved→Paid using status tones), totals KPI strip, table (`features/hr/payroll/payroll-table.tsx`) with sticky first column and right-aligned tabular amounts; payslip opens in Sheet. |
| `/hr/performance` | `app/(dashboard)/hr/performance/page.tsx` | L · List/Workspace | ✓ / ✓ | form,tabs,overlays | List/Workspace archetype §8.3. |
| `/hr/recognition` | `app/(dashboard)/hr/recognition/page.tsx` | L · List/Workspace | ✓ / ✓ | table,tabs,overlays | List/Workspace archetype §8.3. |
| `/hr/recruitment` | `app/(dashboard)/hr/recruitment/page.tsx` | H · Hub | ✓ / ✓ | kanban,charts | Hub archetype §8.2. |
| `/hr/recruitment/candidates` | `app/(dashboard)/hr/recruitment/candidates/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/hr/recruitment/candidates/[candidateId]` | `app/(dashboard)/hr/recruitment/candidates/[candidateId]/page.tsx` | D · Detail | ✓ / ✗ | form,tabs,overlays | Detail/Record archetype §8.5. |
| `/hr/recruitment/diversity-report` | `app/(dashboard)/hr/recruitment/diversity-report/page.tsx` | R · Report | ✗ / ✗ | charts | Report archetype §8.8. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/recruitment/hiring-flows` | `app/(dashboard)/hr/recruitment/hiring-flows/page.tsx` | L · List/Workspace | ✗ / ✗ | form,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/recruitment/interviewer-performance` | `app/(dashboard)/hr/recruitment/interviewer-performance/page.tsx` | R · Report | ✗ / ✗ | table | Report archetype §8.8. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/recruitment/interviews` | `app/(dashboard)/hr/recruitment/interviews/page.tsx` | L · List/Workspace | ✓ / ✓ | charts,table,form,overlays | List/Workspace archetype §8.3. |
| `/hr/recruitment/jobs` | `app/(dashboard)/hr/recruitment/jobs/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/hr/recruitment/jobs/new` | `app/(dashboard)/hr/recruitment/jobs/new/page.tsx` | F · Form/Editor | ✗ / ✗ | form | Form/Editor archetype §8.6. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/recruitment/jobs/[jobId]/edit` | `app/(dashboard)/hr/recruitment/jobs/[jobId]/edit/page.tsx` | F · Form/Editor | ✗ / ✗ | form | Form/Editor archetype §8.6. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/recruitment/pipeline` | `app/(dashboard)/hr/recruitment/pipeline/page.tsx` | K · Board | ✓ / ✓ | kanban,form,overlays | Candidate board (`components/hr/recruitment/pipeline-kanban.tsx`, `features/hr/recruitment/kanban/*`). Cards show avatar, name, role, AI score chip, days in stage. |
| `/hr/recruitment/question-bank` | `app/(dashboard)/hr/recruitment/question-bank/page.tsx` | L · List/Workspace | ✗ / ✗ | table,form,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/reimbursements` | `app/(dashboard)/hr/reimbursements/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/hr/skills` | `app/(dashboard)/hr/skills/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/surveys` | `app/(dashboard)/hr/surveys/page.tsx` | R · Report | ✓ / ✓ | charts,overlays | Report archetype §8.8. |
| `/hr/team-events` | `app/(dashboard)/hr/team-events/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/teams/[teamId]` | `app/(dashboard)/hr/teams/[teamId]/page.tsx` | D · Detail | ✗ / ✗ | — | Detail/Record archetype §8.5. **Add `loading.tsx`** (archetype skeleton). |
| `/hr/termination` | `app/(dashboard)/hr/termination/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/hr/training` | `app/(dashboard)/hr/training/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/hr/work-logs` | `app/(dashboard)/hr/work-logs/page.tsx` | L · List/Workspace | ✓ / ✓ | form | List/Workspace archetype §8.3. |
| `/notifications` | `app/(dashboard)/notifications/page.tsx` | L · List/Workspace | ✓ / ✓ | tabs | Inbox list: tabs All/Unread/Mentions, grouped by Today/Yesterday/Earlier, unread = 6px gold dot + bolder title; "Mark all read" ghost button. |
| `/onboarding` | `app/(dashboard)/onboarding/page.tsx` | F · Form/Editor | ✓ / ✓ | form,tabs | Form/Editor archetype §8.6. |
| `/projects` | `app/(dashboard)/projects/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/projects/resource-allocation` | `app/(dashboard)/projects/resource-allocation/page.tsx` | L · List/Workspace | ✗ / ✗ | — | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/projects/templates` | `app/(dashboard)/projects/templates/page.tsx` | L · List/Workspace | ✗ / ✗ | kanban,overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/projects/[projectId]` | `app/(dashboard)/projects/[projectId]/page.tsx` | K · Board | ✓ / ✓ | kanban,table,overlays | Project workspace with `components/layout/project-sidebar.tsx` as secondary nav. View switcher (`view-switcher.tsx`) as segmented control: Board/List/Table/Calendar/Gantt. Board = `kanban-board.tsx` + `kanban-ticket-card.tsx`; ticket dialog (`ticket-details/*`) becomes a large right Sheet (720px) with header, main description, right property rail. |
| `/projects/[projectId]/analytics` | `app/(dashboard)/projects/[projectId]/analytics/page.tsx` | R · Report | ✓ / ✓ | charts | Report archetype §8.8. |
| `/projects/[projectId]/backlog` | `app/(dashboard)/projects/[projectId]/backlog/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/projects/[projectId]/budget` | `app/(dashboard)/projects/[projectId]/budget/page.tsx` | L · List/Workspace | ✗ / ✗ | form | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/projects/[projectId]/cycles` | `app/(dashboard)/projects/[projectId]/cycles/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/projects/[projectId]/epics` | `app/(dashboard)/projects/[projectId]/epics/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | List/Workspace archetype §8.3. |
| `/projects/[projectId]/intake` | `app/(dashboard)/projects/[projectId]/intake/page.tsx` | L · List/Workspace | ✓ / ✓ | form,tabs,overlays | List/Workspace archetype §8.3. |
| `/projects/[projectId]/milestones` | `app/(dashboard)/projects/[projectId]/milestones/page.tsx` | L · List/Workspace | ✗ / ✗ | overlays | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/projects/[projectId]/modules` | `app/(dashboard)/projects/[projectId]/modules/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/projects/[projectId]/my-tickets` | `app/(dashboard)/projects/[projectId]/my-tickets/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | List/Workspace archetype §8.3. |
| `/projects/[projectId]/pages` | `app/(dashboard)/projects/[projectId]/pages/page.tsx` | L · List/Workspace | ✓ / ✓ | form,overlays | List/Workspace archetype §8.3. |
| `/projects/[projectId]/settings` | `app/(dashboard)/projects/[projectId]/settings/page.tsx` | S · Settings | ✓ / ✓ | form,overlays | Settings archetype §8.7. |
| `/projects/[projectId]/sprints` | `app/(dashboard)/projects/[projectId]/sprints/page.tsx` | K · Board | ✓ / ✓ | kanban,charts,overlays | Board archetype §8.4. |
| `/projects/[projectId]/timeline` | `app/(dashboard)/projects/[projectId]/timeline/page.tsx` | C · Calendar/Timeline | ✓ / ✓ | overlays | Calendar/Timeline archetype §8.9. |
| `/projects/[projectId]/views` | `app/(dashboard)/projects/[projectId]/views/page.tsx` | K · Board | ✓ / ✓ | kanban,form,overlays | Board archetype §8.4. |
| `/reports` | `app/(dashboard)/reports/page.tsx` | H · Hub | ✓ / ✓ | — | Hub archetype §8.2. |
| `/settings/[[...rest]]` | `app/(dashboard)/settings/[[...rest]]/page.tsx` | S · Settings | ✓ / ✓ | profile/security/preferences | Personal settings: left sub-nav (Profile, Security, Preferences) + content max-w 720. Preferences (`features/settings/settings-preferences.tsx`) gains Theme (Light/Dark/System) radio cards and keeps the Compact toggle. |
| `/settings/ai` | `app/(dashboard)/settings/ai/page.tsx` | S · Settings | ✗ / ✗ | charts | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/audit-log` | `app/(dashboard)/settings/audit-log/page.tsx` | S · Settings | ✓ / ✓ | table,overlays | Settings archetype §8.7. |
| `/settings/branches` | `app/(dashboard)/settings/branches/page.tsx` | S · Settings | ✓ / ✓ | form,overlays | Settings archetype §8.7. |
| `/settings/custom-fields` | `app/(dashboard)/settings/custom-fields/page.tsx` | S · Settings | ✓ / ✓ | form,tabs,overlays | Settings archetype §8.7. |
| `/settings/data-hub` | `app/(dashboard)/settings/data-hub/page.tsx` | S · Settings | ✗ / ✓ | form | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/email-templates` | `app/(dashboard)/settings/email-templates/page.tsx` | S · Settings | ✗ / ✗ | tabs | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/integrations/recruitment` | `app/(dashboard)/settings/integrations/recruitment/page.tsx` | S · Settings | ✗ / ✗ | — | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/job-office-locations` | `app/(dashboard)/settings/job-office-locations/page.tsx` | S · Settings | ✗ / ✗ | form | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/job-roles` | `app/(dashboard)/settings/job-roles/page.tsx` | S · Settings | ✗ / ✗ | overlays | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/members` | `app/(dashboard)/settings/members/page.tsx` | S · Settings | ✓ / ✓ | table,form,tabs,overlays | Settings archetype §8.7. |
| `/settings/notifications` | `app/(dashboard)/settings/notifications/page.tsx` | S · Settings | ✗ / ✓ | — | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/organization` | `app/(dashboard)/settings/organization/page.tsx` | S · Settings | ✓ / ✓ | form | Settings archetype §8.7. |
| `/settings/payroll-schedule` | `app/(dashboard)/settings/payroll-schedule/page.tsx` | S · Settings | ✗ / ✓ | — | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/permissions` | `app/(dashboard)/settings/permissions/page.tsx` | S · Settings | ✗ / ✗ | — | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/roles` | `app/(dashboard)/settings/roles/page.tsx` | S · Settings | ✓ / ✓ | overlays | Settings archetype §8.7. |
| `/settings/termination-reasons` | `app/(dashboard)/settings/termination-reasons/page.tsx` | S · Settings | ✗ / ✗ | form,overlays | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/settings/webhooks` | `app/(dashboard)/settings/webhooks/page.tsx` | S · Settings | ✗ / ✓ | overlays | Settings archetype §8.7. **Add `loading.tsx`** (archetype skeleton). |
| `/support` | `app/(dashboard)/support/page.tsx` | H · Hub | ✓ / ✓ | charts | Hub archetype §8.2. |
| `/support/inbox` | `app/(dashboard)/support/inbox/page.tsx` | L · List/Workspace | ✓ / ✓ | overlays | 3-pane mail-style: list (360px) / conversation / properties rail; collapses to stacked on <lg. |
| `/tasks/overdue` | `app/(dashboard)/tasks/overdue/page.tsx` | L · List/Workspace | ✗ / ✗ | table | List/Workspace archetype §8.3. **Add `loading.tsx`** (archetype skeleton). |
| `/timesheets` | `app/(dashboard)/timesheets/page.tsx` | L · List/Workspace | ✓ / ✓ | table,overlays | Week grid table: sticky project column, 7 day columns, total column; today column header gold-50; log-time dialog restyled. |
| `/timesheets/team` | `app/(dashboard)/timesheets/team/page.tsx` | L · List/Workspace | ✓ / ✓ | charts,table,overlays | List/Workspace archetype §8.3. |
| `/careers` | `app/(public)/careers/page.tsx` | P · Public | ✗ / ✗ | — | Public careers: ink-950 header (`careers-header.tsx`) with wordmark, hero, job list (`careers-job-list.tsx`, `careers-job-card.tsx`) as cards with location/type chips, footer (`careers-footer.tsx`). Light content area. |
| `/careers/[jobId]` | `app/(public)/careers/[jobId]/page.tsx` | P · Public | ✗ / ✗ | — | Public shell; see §8.10. |
| `/careers/[jobId]/apply` | `app/(public)/careers/[jobId]/apply/page.tsx` | P · Public | ✗ / ✗ | form | Public shell; see §8.10. |
| `/careers/[jobId]/[slug]` | `app/(public)/careers/[jobId]/[slug]/page.tsx` | P · Public | ✗ / ✗ | wrapper | Public shell; see §8.10. |
| `/careers/[jobId]/[slug]/apply` | `app/(public)/careers/[jobId]/[slug]/apply/page.tsx` | P · Public | ✗ / ✗ | wrapper | Public shell; see §8.10. |
| `/interview-booking/[token]` | `app/(public)/interview-booking/[token]/page.tsx` | P · Public | ✗ / ✗ | — | Slot picker: date strip + time chips (selected = gold-400 fill/ink text); confirm card. Remove arbitrary hex classes. |
| `/offer-acceptance/[token]` | `app/(public)/offer-acceptance/[token]/page.tsx` | P · Public | ✗ / ✗ | form | Document-style page (max-w 760): letter preview card, accept/decline sticky footer bar. Remove `bg-[#...]` (file has arbitrary hex + 29 raw palette hits). |

**Route-local components** (restyle with their page): `app/(dashboard)/projects/{project-card,project-list-row,project-filter-bar,project-pagination,projects-empty-state,new-project-dialog}.tsx`, `app/(dashboard)/projects/[projectId]/access-denied-view.tsx`, `app/(dashboard)/hr/attendance/attendance-content.tsx`, `app/(dashboard)/hr/leaves/{leave-approvals,wfh-tab-content,leaves-tab-content,leaves-wfh-content,leaves-shared}.tsx`, `app/(dashboard)/hr/expenses/{create-expense-dialog,import-expense-sheet}.tsx`, `app/(dashboard)/hr/documents/upload-document-dialog.tsx`, `app/(dashboard)/hr/employees/[employeeId]/{edit-employee-form,employee-details-view}.tsx`, `app/(dashboard)/hr/termination/_components/termination-card.tsx`, `app/(dashboard)/hr/email-templates/_components/template-form.tsx`, `app/(dashboard)/hr/recruitment/candidates/[candidateId]/_components/{ai-score-card,interviews-tab,candidate-profile-card,applications-tab,candidate-sheets}.tsx`, `app/(dashboard)/settings/organization/_components/pay-policy-card.tsx`, `app/(dashboard)/settings/job-roles/_components/job-role-sheet.tsx`.

---

## Appendix B — Brand quick reference

| Name | Hex | Role |
|---|---|---|
| Miyo Gold (gold-400) | `#D4AF37` | Primary fill, active indicators, focus (dark), logo circle |
| Gold text (gold-700) | `#796001` | Brand text/links on light |
| Gold text (gold-300) | `#E2C56F` | Brand text/links on dark |
| Miyo Ink (ink-900) | `#201E1F` | Text, sidebar, secondary button, text on gold |
| Ink canvas (ink-50) | `#FBFAF6` | Light app background |
| Ink night (ink-950) | `#100F0D` | Dark app background |
| Silver | `#D8D8D8` | Wordmark "YO", decorative on ink |

*Generated 11 Oct 2026 from a read-only audit of `/Users/tarunchintakunta/office/miyoglobal/crm` (branch `main`, HEAD `c1104a9`).*
