import "server-only";

import { sql } from "drizzle-orm";

import { isAIConfigured, isOpenAIConfigured } from "@/lib/ai/openai";
import { db } from "@/lib/db";
import { getZeptoMailToken } from "@/lib/email/config";
import { logger } from "@/lib/logger";
import { getOrgFeatureFlags } from "@/lib/org-features";
import { isStorageConfigured } from "@/lib/storage";

/**
 * KB-0005: what the Knowledge Base can actually do in this deployment.
 *
 * Booleans only. No env var value ever leaves this file, and nothing here
 * throws: a missing key switches a feature off, it does not break the page.
 */
export interface KbCapabilities {
  /** Ask, page AI and briefs. OpenAI or Gemini. */
  ai: boolean;
  /** Semantic search. OpenAI only; Gemini does not do embeddings here. */
  embeddings: boolean;
  /** R2: uploads, attachments, export zips. */
  storage: boolean;
  /** ZeptoMail. Without it, notifications stay in-app. */
  email: boolean;
  /** The kb_chunks table exists, so vector rows have somewhere to live. */
  vector: boolean;
  /** Org flag knowledgeHelpCentre (KB-0007), off by default. */
  helpCentre: boolean;
}

export function isKbAiConfigured(): boolean {
  return isAIConfigured();
}

export function isKbEmbeddingsConfigured(): boolean {
  return isOpenAIConfigured();
}

export function isKbStorageConfigured(): boolean {
  return isStorageConfigured();
}

export function isKbEmailConfigured(): boolean {
  return !!getZeptoMailToken();
}

/** `to_regclass` is null until the Phase B migration runs; never throws. */
export async function hasKbVectorStore(): Promise<boolean> {
  try {
    const rows = await db.execute<{ present: boolean }>(
      sql`select to_regclass('public.kb_chunks') is not null as present`,
    );
    const row = (Array.isArray(rows) ? rows[0] : (rows as { rows?: { present: boolean }[] }).rows?.[0]) as
      | { present: boolean }
      | undefined;
    return row?.present === true;
  } catch (error) {
    logger.warn("kb.capabilities.vector_probe_failed", { error: String(error) });
    return false;
  }
}

export async function getKbCapabilities(orgId: string | null | undefined): Promise<KbCapabilities> {
  const [vector, flags] = await Promise.all([
    hasKbVectorStore(),
    orgId ? getOrgFeatureFlags(orgId).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    ai: isKbAiConfigured(),
    embeddings: isKbEmbeddingsConfigured(),
    storage: isKbStorageConfigured(),
    email: isKbEmailConfigured(),
    vector,
    helpCentre:
      (flags as { knowledgeHelpCentre?: boolean } | null)?.knowledgeHelpCentre === true,
  };
}
