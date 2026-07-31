-- Additive CRM indexes for hot list/filter queries.
-- All CREATE INDEX IF NOT EXISTS — idempotent and safe to re-run.
-- Apply with `pnpm db:migrate`. Production: prefer CONCURRENTLY (Postgres requires running
-- each CREATE INDEX outside a transaction, which drizzle-kit does for non-IF-NOT-EXISTS too).
-- Index DDL is metadata-only; it does not block reads but will scan the table once.

-- clientAccounts: assignedCrmId is filtered by `getClientAccounts` for CUSTOMER_SUPPORT role
CREATE INDEX IF NOT EXISTS "idx_client_accounts_assigned_crm" ON "client_accounts" ("assigned_crm_id");

-- crmPeople / crmCompanies / crmDeals / crmLeads / crmContent / crmEvents / crmActivities / crmSupportTickets / crmMonthlyMetrics:
-- These tables had no orgId index. All queries filter by orgId.
CREATE INDEX IF NOT EXISTS "idx_crm_people_org" ON "crm_people" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_crm_people_org_slug" ON "crm_people" ("org_id","slug");
CREATE INDEX IF NOT EXISTS "idx_crm_people_email" ON "crm_people" ("email");

CREATE INDEX IF NOT EXISTS "idx_crm_companies_org" ON "crm_companies" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_crm_companies_csm" ON "crm_companies" ("csm_id");

CREATE INDEX IF NOT EXISTS "idx_crm_deals_org_stage" ON "crm_deals" ("org_id","stage");
CREATE INDEX IF NOT EXISTS "idx_crm_deals_sales_rep" ON "crm_deals" ("sales_rep_id");

CREATE INDEX IF NOT EXISTS "idx_crm_leads_org_status" ON "crm_leads" ("org_id","status");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_campaign" ON "crm_leads" ("campaign_id");

CREATE INDEX IF NOT EXISTS "idx_crm_content_org" ON "crm_content" ("org_id");
CREATE INDEX IF NOT EXISTS "idx_crm_events_org" ON "crm_events" ("org_id");

CREATE INDEX IF NOT EXISTS "idx_crm_activities_org_created" ON "crm_activities" ("org_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_person" ON "crm_activities" ("person_id");

CREATE INDEX IF NOT EXISTS "idx_crm_support_tickets_org_status" ON "crm_support_tickets" ("org_id","status");
CREATE INDEX IF NOT EXISTS "idx_crm_support_tickets_assignee" ON "crm_support_tickets" ("assignee_id");

CREATE INDEX IF NOT EXISTS "idx_crm_monthly_metrics_org_month" ON "crm_monthly_metrics" ("org_id","month");
