## Miyo Global CRM

![Miyo Global CRM](public/logo.svg)

**Miyo Global CRM** is an opinionated, enterprise-grade platform for Human Resources, Project Management, CRM, and organizational workflows. It is built for small-to-mid sized companies that want a single, cohesive system for employee lifecycle management, agile delivery, sales pipelines, and executive reporting.

---

## 🚀 Core Capabilities

### 👥 Human Resources (HR)

- **Employee 360°**: Centralized employee records, roles, departments, and history.
- **Onboarding Wizard**: Guided, multi-step onboarding with document collection and role assignment.
- **Attendance & Time**: Clock-in/clock-out, daily and monthly views, and work logs.
- **Leaves & WFH**: Leave policies, approval flows, WFH requests, and balances.
- **Payroll & Payslips**: Salary structure management and payslip access for employees.
- **Org View**: Org chart, department-level views, and HR dashboards.

### 💼 Projects & Delivery

- **Project Workspaces**: Projects with epics, sprints, tickets, and Kanban boards.
- **Backlog & Sprints**: Prioritization, drag-and-drop board, and sprint burndown.
- **Time Tracking**: Timesheets linked to tickets and projects.
- **Reports**: Velocity, work distribution, and basic delivery analytics.

### 🤝 CRM & Sales

- **Leads & Deals**: Pipeline for leads and deals with stages and owners.
- **Clients**: Client directory tied to work and communication.
- **Activity & Targets**: Activity feeds and sales targets with dashboards.

### 📊 Reporting & Automation

- **Scheduled Reports**: Daily, weekly, and monthly emails (attendance, expenses, CEO recaps).
- **AI Assistance**: AI-powered task suggestions and summaries via Vercel AI SDK + Google Generative AI.
- **Exports**: XLSX reports for finance and HR (e.g. monthly expenses).

### 🛡️ Security & Access

- **Role-Based Access Control (RBAC)**: Permissions based on roles (Owner, Admin, Manager, Member, etc.).
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) v5 (beta) with email and OAuth support.
- **Multi-Org**: Multi-organization support via organization-scoped data and guards.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**:
  - [Tailwind CSS 4](https://tailwindcss.com/)
  - Headless components via [Radix UI](https://www.radix-ui.com/) and custom UI primitives (buttons, dialogs, tables, etc.)
- **State & Data Fetching**:
  - [Zustand](https://github.com/pmndrs/zustand)
  - [TanStack Query](https://tanstack.com/query/latest)
- **API Layer**: [tRPC v11](https://trpc.io/) (end-to-end typesafe APIs)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [NextAuth.js v5 beta](https://next-auth.js.org/)
- **Storage**: Cloudflare R2 (S3-compatible)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/) with Google Generative AI
- **Email**: SendGrid or SMTP (pluggable via `EMAIL_PROVIDER`)
- **Tooling**:
  - [ESLint 9](https://eslint.org/) + `eslint-config-next`
  - [Vitest](https://vitest.dev/) for unit tests
  - [Playwright](https://playwright.dev/) for end-to-end tests

---

## 🏁 Getting Started (Local Development)

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **pnpm** (recommended, repo uses `pnpm-lock.yaml`)
- Running **PostgreSQL** instance

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd miyo-global-crm
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

The project validates environment variables via `lib/env.ts`. Use `env.example` as the source of truth:

```bash
cp env.example .env
```

Then update at least:

- **Database**
  - `DATABASE_URL` — PostgreSQL connection string.
- **Auth**
  - `NEXTAUTH_URL` — usually `http://localhost:3000` in development.
  - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`.
- **Email**
  - `EMAIL_PROVIDER` — one of `sendgrid`, `smtp`, or `azure`.
  - `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`.
  - Provider-specific keys (e.g. `SENDGRID_API_KEY` or SMTP config).
- **Storage**
  - `R2_REGION`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `NEXT_PUBLIC_R2_PUBLIC_URL`.
- **AI**
  - `GOOGLE_GENERATIVE_AI_API_KEY`.
- **App URLs**
  - `NEXT_PUBLIC_APP_URL` — typically `http://localhost:3000`.
  - `NEXT_PUBLIC_QR_REDIRECT_BASE_URL`.

> There is also a legacy `.env.example` file; `env.example` is the more complete template and is recommended for new setups.

### 4. Set up the database

Push the Drizzle schema to your local database:

```bash
pnpm db:push
```

Optional but recommended:

- **Generate migrations from schema**:

  ```bash
  pnpm db:generate
  ```

- **Apply migrations**:

  ```bash
  pnpm db:migrate
  ```

### 5. Seed data (optional)

To quickly explore the app with sample data, you can run the seed scripts:

```bash
# Base seed (organizations, roles, users, etc.)
pnpm tsx scripts/seed.ts

# Additional CRM-specific seed data
pnpm tsx scripts/seed-crm.ts

# Import regional holidays (optional)
pnpm tsx scripts/import-holidays.ts
```

Creating an initial organization can also be done via:

```bash
pnpm tsx scripts/create-organization.ts
```

> Review each script before running in a non-local environment.

### 6. Start the development server

```bash
pnpm dev
```

Visit `http://localhost:3000` in your browser.

---

## 📜 Common Commands

| Command                    | Description                                             |
| :------------------------- | :------------------------------------------------------ |
| `pnpm dev`                 | Start the Next.js development server.                  |
| `pnpm build`               | Build the application for production.                  |
| `pnpm start`               | Run the built app in production mode.                  |
| `pnpm lint`                | Run ESLint over the codebase.                          |
| `pnpm test`                | Run unit tests with Vitest.                            |
| `pnpm test:watch`          | Run Vitest in watch mode.                              |
| `pnpm playwright test`     | Run Playwright end-to-end tests (if configured).       |
| `pnpm db:push`             | Push Drizzle schema to the database (dev/prototyping). |
| `pnpm db:generate`         | Generate migrations from the schema.                   |
| `pnpm db:migrate`          | Apply pending database migrations.                     |
| `pnpm db:studio`           | Open Drizzle Studio to inspect and edit data.          |
| `pnpm db:fix-orphaned`     | Run the script to fix orphaned data.                   |

---

## 📂 Project Structure (High-Level)

```text
miyo-global-crm/
├── app/                    # Next.js App Router layouts, routes, and API handlers
│   ├── (auth)/             # Authentication-related routes (sign-in, verify, etc.)
│   ├── (dashboard)/        # Main dashboard experience (HR, CRM, projects, etc.)
│   ├── api/                # Route handlers (cron jobs, storage, AI, health)
│   └── ...                 # Error / not-found routes and edge handlers
├── components/             # Reusable UI and feature components
│   ├── ui/                 # Design system primitives built on Radix
│   ├── layout/             # Shell elements (sidebar, header, nav)
│   ├── hr/                 # HR-specific components and widgets
│   ├── projects/           # Boards, charts, and dialogs for projects
│   ├── crm/                # CRM visualizations and forms
│   └── ...                 # AI helpers, attendance widgets, etc.
├── server/                 # Backend tRPC routers and server-side actions
│   ├── api/                # tRPC router tree (`server/api/root.ts`, etc.)
│   └── actions/            # Server actions for workflows (HR, reports, etc.)
├── lib/                    # Shared utilities, env, db, RBAC, and hooks
│   ├── db.ts               # Drizzle connection and config
│   ├── db/schema.ts        # Database schema
│   ├── env.ts              # Environment validation
│   ├── rbac/               # Permission model and middleware
│   ├── validations/        # Zod schemas for inputs
│   └── hooks/              # Typed React + tRPC hooks
├── scripts/                # Node scripts (seed, create org, import data)
├── public/                 # Static assets (logo, icons, etc.)
├── types/                  # Global TypeScript types and module augmentations
└── pnpm-lock.yaml          # Lockfile (pnpm)
```

---

## ✅ Production Considerations

- **Secrets**: Never commit `.env` files. Use your cloud provider’s secret manager or CI/CD secrets.
- **Database**: Run `db:generate` + `db:migrate` as part of your deployment pipeline instead of `db:push`.
- **Cron Routes**: Secure cron endpoints via `CRON_SECRET` and your scheduler (e.g. GitHub Actions, cloud cron).
- **Email**: Ensure domain verification and sender authentication (SPF/DKIM) with your email provider.
- **File Storage**: Configure R2 credentials and `NEXT_PUBLIC_R2_PUBLIC_URL` appropriately per environment.

---

## 🧩 Contributing / Customizing

This project is structured to be a strong starting point for a company-internal CRM/HR/Projects tool:

- Swap out providers (email, storage, AI) via environment variables.
- Extend Drizzle schema and tRPC routers under `lib/db/schema.ts` and `server/api`.
- Add or adjust permissions via `lib/rbac/permissions.ts` and `lib/rbac/middleware.ts`.

If you fork or customize it heavily, keep the environment validation in `lib/env.ts` in sync with your `.env` contract.

