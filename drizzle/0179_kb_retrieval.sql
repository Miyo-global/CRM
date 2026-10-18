-- KB-0017: the vector store, guarded.
--
-- pgvector is present on Neon but not on every Postgres, and a KB without
-- embeddings still has to work (keyword search only). So: try the extension,
-- swallow the failure, and create the vector tables only if it is actually
-- there. /api/knowledge/capabilities reports vector:false when it is not.
-- Streamline: SB/db/schema/support/kb-chunks.ts, kb-ingestion-checkpoints.ts,
-- kb/indexed-bytes-quota.ts (migrations 0300, 0461, 0701, 1000, 1212).

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector unavailable; the KB will run keyword-only';
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RETURN;
  END IF;

  -- 1536 dims: OpenAI text-embedding-3-small, as in Streamline.
  EXECUTE $ddl$
    CREATE TABLE IF NOT EXISTS "kb_chunks" (
      "id" serial PRIMARY KEY,
      "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "page_id" integer,
      "attachment_id" bigint,
      "source_id" integer,
      "source" text NOT NULL,
      "chunk_index" integer NOT NULL,
      "content" text NOT NULL,
      "content_hash" text,
      "tokens" integer,
      "embedding" vector(1536) NOT NULL,
      "embedding_model" text NOT NULL,
      "page_visibility" text,
      "page_project_id" integer,
      "page_created_by_id" text,
      "acl_revision" integer NOT NULL DEFAULT 1,
      "content_revision" integer,
      "acl_synced_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "uniq_kb_chunks_org_id" UNIQUE ("org_id", "id"),
      CONSTRAINT "chk_kb_chunks_source" CHECK ("source" IN ('page_body', 'attachment', 'source', 'article_body')),
      CONSTRAINT "fk_kb_chunks_org_page" FOREIGN KEY ("org_id", "page_id")
        REFERENCES "kb_pages" ("org_id", "id") ON DELETE CASCADE,
      CONSTRAINT "fk_kb_chunks_org_attachment" FOREIGN KEY ("org_id", "attachment_id")
        REFERENCES "kb_page_attachments" ("org_id", "id") ON DELETE CASCADE,
      CONSTRAINT "fk_kb_chunks_org_source" FOREIGN KEY ("org_id", "source_id")
        REFERENCES "kb_sources" ("org_id", "id") ON DELETE CASCADE
    )
  $ddl$;

  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_kb_chunks_org_page" ON "kb_chunks" ("org_id", "page_id")';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_kb_chunks_org_source" ON "kb_chunks" ("org_id", "source_id")';
  -- The ACL columns are carried on the chunk so a retrieval query can filter
  -- without joining back to kb_pages.
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_kb_chunks_org_page_acl" ON "kb_chunks" ("org_id", "page_visibility", "page_project_id", "page_created_by_id") WHERE "page_id" IS NOT NULL';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kb_chunks_page_chunk" ON "kb_chunks" ("org_id", "page_id", "chunk_index") WHERE "page_id" IS NOT NULL';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_kb_chunks_embedding_hnsw" ON "kb_chunks" USING hnsw ("embedding" vector_cosine_ops)';

  -- Embedding a document again after a crash is the expensive part, so each
  -- chunk's vector is kept keyed by content hash.
  EXECUTE $ddl$
    CREATE TABLE IF NOT EXISTS "kb_ingestion_checkpoints" (
      "id" serial PRIMARY KEY,
      "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "content_type" text NOT NULL,
      "content_id" integer NOT NULL,
      "content_hash" text NOT NULL,
      "chunk_index" integer NOT NULL,
      "content" text NOT NULL,
      "embedding" vector(1536) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "uniq_kb_ingestion_checkpoint" UNIQUE ("org_id", "content_type", "content_id", "chunk_index")
    )
  $ddl$;

  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_kb_ingestion_checkpoint_lookup" ON "kb_ingestion_checkpoints" ("org_id", "content_type", "content_id", "content_hash")';
END $$;--> statement-breakpoint

-- The quota is plain bookkeeping and needs no extension, so it is always made.
CREATE TABLE IF NOT EXISTS "kb_indexed_bytes_quota" (
  "org_id" text PRIMARY KEY REFERENCES "organizations"("id") ON DELETE CASCADE,
  "indexed_bytes" bigint NOT NULL DEFAULT 0,
  "limit_bytes" bigint NOT NULL DEFAULT 536870912,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "chk_kb_indexed_bytes_quota_non_negative" CHECK ("indexed_bytes" >= 0 AND "limit_bytes" >= 0)
);
