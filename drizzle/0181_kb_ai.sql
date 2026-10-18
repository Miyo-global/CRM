-- KB-0019: Ask conversations, the AI interaction log, research briefs, credits
-- and the analytics event log.
-- Streamline: SB/db/schema/kb/chat.ts, ai-interactions.ts, research-briefs.ts,
-- credits.ts, events.ts (migrations 0794, 1208, 1209, 1218, 1233, 1235).
-- Per D7, monthly_allowance is nullable and NULL means unlimited.

CREATE TABLE IF NOT EXISTS "kb_chat_conversations" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_chat_conversations_org_id" UNIQUE ("org_id", "id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_chat_conversations_org_user" ON "kb_chat_conversations" ("org_id", "user_id", "updated_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_chat_messages" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "conversation_id" integer,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "citations" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_chat_messages_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_chat_messages_role" CHECK ("role" IN ('user', 'assistant')),
  CONSTRAINT "fk_kb_chat_messages_org_conversation" FOREIGN KEY ("org_id", "conversation_id")
    REFERENCES "kb_chat_conversations" ("org_id", "id") ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_chat_messages_org_user" ON "kb_chat_messages" ("org_id", "user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_chat_messages_conversation" ON "kb_chat_messages" ("conversation_id");--> statement-breakpoint

-- One row per AI call: which sources it saw (with their ACL revision at the
-- time), what it cost and how it ended.
CREATE TABLE IF NOT EXISTS "kb_ai_interactions" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "correlation_id" text NOT NULL,
  "actor_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "conversation_id" integer,
  "message_id" integer,
  "provider" text,
  "model" text,
  "prompt_policy_version" integer,
  "source_ids_with_revisions" jsonb,
  "prompt_tokens" integer,
  "completion_tokens" integer,
  "total_tokens" integer,
  "latency_ms" integer,
  "result_state" text NOT NULL,
  "feedback" text,
  "cost_credits" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_ai_interactions_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_ai_interactions_result_state" CHECK ("result_state" IN (
    'answered', 'no_context', 'credits_exhausted', 'provider_unavailable', 'error'
  ))
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_ai_interactions_org_time" ON "kb_ai_interactions" ("org_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_ai_interactions_org_actor" ON "kb_ai_interactions" ("org_id", "actor_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "kb_research_briefs" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "topic" text NOT NULL,
  "space_id" integer,
  "status" text NOT NULL DEFAULT 'queued',
  "job_id" text,
  "source_count" integer NOT NULL DEFAULT 0,
  "report" text,
  "citations" jsonb,
  "error_message" text,
  "rating" text,
  "cost_credits" integer,
  "provider" text,
  "model" text,
  "approved_at" timestamptz,
  "approved_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_research_briefs_org_id" UNIQUE ("org_id", "id"),
  CONSTRAINT "chk_kb_research_briefs_status" CHECK ("status" IN ('queued', 'running', 'completed', 'failed')),
  CONSTRAINT "chk_kb_research_briefs_rating" CHECK ("rating" IS NULL OR "rating" IN ('helpful', 'not_helpful')),
  CONSTRAINT "fk_kb_research_briefs_org_space" FOREIGN KEY ("org_id", "space_id")
    REFERENCES "kb_spaces" ("org_id", "id") ON DELETE SET NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_research_briefs_org_user" ON "kb_research_briefs" ("org_id", "user_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_research_briefs_job" ON "kb_research_briefs" ("job_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tenant_ai_credits" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
  "balance" integer NOT NULL DEFAULT 0,
  -- NULL means unlimited (D7): enforcement exists but is off by default.
  "monthly_allowance" integer,
  "last_reset_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_tenant_ai_credits_org_id" UNIQUE ("org_id", "id")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tenant_ai_credit_transactions" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "delta" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "reason" text NOT NULL,
  "feature" text,
  "actor_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_tenant_ai_credit_txns_org_id" UNIQUE ("org_id", "id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_tenant_ai_credit_txns_org_time" ON "tenant_ai_credit_transactions" ("org_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tenant_ai_credit_txns_org_actor" ON "tenant_ai_credit_transactions" ("org_id", "actor_id");--> statement-breakpoint

-- The analytics log: views, searches, votes, AI answers, deflections.
CREATE TABLE IF NOT EXISTS "kb_events" (
  "id" serial PRIMARY KEY,
  "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "actor_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "page_id" integer,
  "query" text,
  "metadata" jsonb,
  "correlation_id" text,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uniq_kb_events_org_id" UNIQUE ("org_id", "id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_kb_events_org_type_time" ON "kb_events" ("org_id", "event_type", "occurred_at");
