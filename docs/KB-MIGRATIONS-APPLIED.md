# KB migrations: applied and verified

Applied to the CRM Neon project (`tiny-night-26058388`, default branch) on
2026-10-18 through the Neon MCP server. The sandbox cannot open a Postgres
connection (DNS and raw TCP are blocked, and `tsx` cannot bind its IPC socket),
so `pnpm db:apply-pending` was not usable from here; every statement of
`drizzle/0172`–`0185` was executed server-side instead, each file's statements in
one transaction, and the fourteen file hashes were then recorded in
`drizzle."__drizzle_migrations"` so the next deploy skips them.

## State after the run

| Check | Result |
|---|---|
| `kb_*` tables in `public` | 36 (39 with `tenant_ai_credits`, `tenant_ai_credit_transactions`, `support_knowledge_gaps`) |
| pgvector | installed, 0.8.6 — `kb_chunks` and `kb_ingestion_checkpoints` exist with the HNSW index |
| SQL functions | `kb_page_fts`, `kb_chunk_search` |
| Append-only triggers on `kb_page_versions` | 2 (row guard, truncate guard) |
| Legacy `pages` rows | 1, all 1 migrated to `kb_pages` with `external_source='crm_pages'` |
| Project spaces created | 1 |
| Rows awaiting the KB-0033 `content_text` backfill | 0 |

## Behaviour proved against the live schema, not just applied

- `kb_page_fts('leave policy', org, 10)` returns the probe page; the same call
  with a NULL org returns nothing, so the default argument cannot leak
  another org's rows.
- `UPDATE kb_page_versions SET title = …` and a direct `DELETE` both fail with
  SQLSTATE 42501, while `UPDATE … SET author_id = NULL` succeeds — the guard
  blocks a rewrite of history without blocking the attribution redaction that
  user deletion and DPDP erasure depend on.
- Deleting a page cascades to its versions and chunks.
- `kb_pages.status = 'nonsense'` is refused by the check constraint.
- A 1536-dim chunk inserts and `kb_chunk_search` returns it.

All probe rows were deleted in the same transaction that made them.
