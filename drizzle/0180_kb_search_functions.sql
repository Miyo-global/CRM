-- KB-0018: the two search entry points as SQL functions.
--
-- Streamline wraps these in SECURITY DEFINER resolvers under app.* because its
-- row-level-security quals are not leakproof, which stops the planner using
-- idx_kb_pages_fts from the application role (see its migrations 0453, 0498,
-- 1227, 0703, 0714). The CRM has no RLS and one role, so the index is reachable
-- directly and the functions are plain STABLE SQL: what is ported is the lexical
-- behaviour, not the privilege escalation.
--
-- Both take the org explicitly and return ids only, never titles or content. A
-- NULL org returns no rows rather than every org's.

CREATE OR REPLACE FUNCTION "kb_page_fts"(
  p_query text,
  p_org_id text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS SETOF integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_query tsquery;
BEGIN
  IF p_org_id IS NULL OR p_query IS NULL OR btrim(p_query) = '' THEN
    RETURN;
  END IF;

  -- websearch_to_tsquery understands quotes and OR; it can still come back
  -- empty for input that is all punctuation, and plainto_tsquery is the
  -- fallback that still matches something.
  v_query := websearch_to_tsquery('english', p_query);
  IF v_query IS NULL OR v_query::text = '' THEN
    v_query := plainto_tsquery('english', p_query);
  END IF;
  IF v_query IS NULL OR v_query::text = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id
  FROM public.kb_pages p
  WHERE p.org_id = p_org_id
    AND p.deleted_at IS NULL
    AND p.fts @@ v_query
  ORDER BY ts_rank(p.fts, v_query) DESC, p.updated_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$$;--> statement-breakpoint

-- The vector half only exists where kb_chunks does (migration 0179 is guarded).
DO $$
BEGIN
  IF to_regclass('public.kb_chunks') IS NULL THEN
    RAISE NOTICE 'kb_chunks absent; skipping kb_chunk_search';
    RETURN;
  END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION "kb_chunk_search"(
      p_vec vector,
      p_org_id text DEFAULT NULL,
      p_limit integer DEFAULT 20
    )
    RETURNS SETOF integer
    LANGUAGE plpgsql
    STABLE
    AS $body$
    DECLARE
      v_limit integer := GREATEST(COALESCE(p_limit, 20), 1);
      v_count bigint;
    BEGIN
      IF p_org_id IS NULL OR p_vec IS NULL THEN
        RETURN;
      END IF;

      SELECT count(*) INTO v_count FROM public.kb_chunks WHERE org_id = p_org_id;

      -- Up to 8,000 chunks an exact scan is both faster and exact; past that
      -- the HNSW index takes over, with ef_search widened to the request size
      -- so recall does not collapse on a large limit.
      IF v_count > 8000 THEN
        EXECUTE format('SET LOCAL hnsw.ef_search = %s', LEAST(v_limit * 8, 1000));
      END IF;

      RETURN QUERY
      SELECT c.id
      FROM public.kb_chunks c
      WHERE c.org_id = p_org_id
      ORDER BY c.embedding <=> p_vec
      LIMIT v_limit;
    END;
    $body$;
  $fn$;
END $$;
