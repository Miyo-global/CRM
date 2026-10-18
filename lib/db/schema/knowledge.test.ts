import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";

import * as knowledge from "./knowledge";

/**
 * KB-0025: the Drizzle definitions and the SQL migrations have to agree.
 *
 * pnpm db:check-drift does this properly, but it needs a database with every
 * migration replayed. This reads the KB migration files instead, so a column
 * added to one side and not the other fails in plain `pnpm test`.
 */
const DRIZZLE = join(__dirname, "..", "..", "..", "drizzle");

function kbMigrationSql(): string {
  return readdirSync(DRIZZLE)
    .filter((f) => /^\d{4}_.*kb.*\.sql$/.test(f))
    .sort()
    .map((f) => readFileSync(join(DRIZZLE, f), "utf-8"))
    .join("\n");
}

/**
 * Column names per table, as the CREATE TABLE statements declare them. The
 * body is read by balancing parentheses, since a generated column and a check
 * constraint both contain their own.
 */
function migrationColumns(sql: string): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  const re = /CREATE TABLE IF NOT EXISTS "([a-z_]+)" \(/g;
  for (const match of sql.matchAll(re)) {
    const table = match[1];
    let depth = 1;
    let i = (match.index ?? 0) + match[0].length;
    const start = i;
    while (i < sql.length && depth > 0) {
      if (sql[i] === "(") depth += 1;
      else if (sql[i] === ")") depth -= 1;
      i += 1;
    }
    const body = sql.slice(start, i - 1);
    const columns = new Set<string>();
    let lineDepth = 0;
    for (const line of body.split("\n")) {
      // Only top-level lines declare a column; nested ones belong to the
      // expression above them.
      const column = line.match(/^\s*"([a-z_0-9]+)"\s+\S/);
      if (lineDepth === 0 && column) columns.add(column[1]);
      for (const ch of line) {
        if (ch === "(") lineDepth += 1;
        else if (ch === ")") lineDepth -= 1;
      }
    }
    tables.set(table, columns);
  }
  return tables;
}

const sql = kbMigrationSql();
const fromSql = migrationColumns(sql);

const declared = Object.values(knowledge)
  .filter((value) => value instanceof PgTable)
  .map((table) => getTableConfig(table as PgTable));

describe("knowledge schema", () => {
  it("declares the KB tables", () => {
    const names = declared.map((t) => t.name);
    for (const expected of [
      "kb_spaces",
      "kb_space_members",
      "kb_space_acl_versions",
      "kb_pages",
      "kb_page_favorites",
      "kb_page_visits",
      "kb_page_links",
      "kb_page_versions",
      "kb_page_comments",
      "kb_page_templates",
      "kb_page_grants",
      "kb_page_restrictions",
      "kb_page_reviews",
      "kb_import_jobs",
      "kb_export_jobs",
      "kb_export_object_attempts",
      "kb_page_purge_ledger",
      "kb_settings",
      "kb_page_attachments",
      "kb_sources",
      "kb_tags",
      "kb_page_tags",
      "kb_page_translations",
      "kb_chunks",
      "kb_ingestion_checkpoints",
      "kb_indexed_bytes_quota",
      "kb_chat_conversations",
      "kb_chat_messages",
      "kb_ai_interactions",
      "kb_research_briefs",
      "tenant_ai_credits",
      "tenant_ai_credit_transactions",
      "kb_events",
      "kb_health_items",
      "kb_page_feedback",
      "kb_linked_documents",
      "kb_linked_document_audiences",
      "kb_categories",
      "support_knowledge_gaps",
    ]) {
      expect(names, expected).toContain(expected);
    }
  });

  it("creates every declared table in a migration", () => {
    for (const table of declared) {
      expect([...fromSql.keys()], table.name).toContain(table.name);
    }
  });

  it("matches the migration column for column", () => {
    for (const table of declared) {
      const columns = fromSql.get(table.name);
      if (!columns) continue;
      for (const column of table.columns) {
        expect(columns, `${table.name}.${column.name} is missing from the migration`).toContain(
          column.name,
        );
      }
      for (const column of columns) {
        expect(
          table.columns.map((c) => c.name),
          `${table.name}.${column} is in the migration but not in Drizzle`,
        ).toContain(column);
      }
    }
  });

  it("keeps the embedding width at 1536, the text-embedding-3-small width", () => {
    expect(knowledge.KB_EMBEDDING_DIMENSIONS).toBe(1536);
    expect(sql).toContain("vector(1536)");
  });
});
