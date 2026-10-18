/**
 * KB-0031: the analytics log.
 *
 * Fire and forget. An analytics write must never be the reason a page fails to
 * load or an answer fails to return, so every failure is logged and swallowed,
 * and the call is not awaited by its callers.
 *
 * Streamline: SB/modules/kb/core/kb-events.service.ts,
 * help-centre/kb-analytics-event-scope.ts.
 */
import "server-only";

import { db } from "@/lib/db";
import { kbEvents, type KbEventType } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export type { KbEventType };

export interface KbEventInput {
  actorId?: string | null;
  pageId?: number | null;
  query?: string | null;
  metadata?: Record<string, unknown>;
  correlationId?: string | null;
}

/** Long search strings are noise in the log and in the gap clustering. */
const MAX_QUERY_LENGTH = 200;

export async function logKbEvent(
  orgId: string,
  type: KbEventType,
  input: KbEventInput = {},
): Promise<void> {
  try {
    await db.insert(kbEvents).values({
      orgId,
      eventType: type,
      actorId: input.actorId ?? null,
      pageId: input.pageId ?? null,
      query: input.query ? input.query.slice(0, MAX_QUERY_LENGTH) : null,
      metadata: input.metadata ?? null,
      correlationId: input.correlationId ?? null,
    });
  } catch (error) {
    logger.warn("kb.event.write_failed", { orgId, type, error: String(error) });
  }
}
