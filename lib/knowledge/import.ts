/**
 * KB-0062: importing pages.
 *
 * The duplicate policy is the heart of it. An import is usually run twice —
 * once to see what happens, once for real — and often against a source that
 * has not changed. `externalId` plus `externalSource` is what makes the second
 * run recognisable: skip leaves the existing page alone, update rewrites its
 * content. Without that pair, every run would make a fresh copy.
 *
 * Streamline: SB/modules/kb/wiki/dto/kb-import-export.schemas.ts,
 * kb-import-export.service.ts, kb-import-process.consumer.ts.
 */
import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { htmlToPlate, markdownToPlate } from "@/components/editor/plate/plate-value-convert";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";

import { buildExcerpt, extractContentText } from "./content";

export const IMPORT_MAX_ITEMS = 100;

export const importItemSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    contentText: z.string().max(50_000),
    parentPageId: z.coerce.number().int().positive().optional(),
    externalId: z.string().trim().max(200).optional(),
    externalSource: z.string().trim().max(100).optional(),
  })
  .strict()
  // The pair is what identifies a re-import, so half of it is useless.
  .refine((item) => !!item.externalId === !!item.externalSource, {
    message: "externalId and externalSource go together.",
  });

export const importRequestSchema = z
  .object({
    sourceType: z.enum(["markdown", "html", "zip"]),
    items: z.array(importItemSchema).min(1).max(IMPORT_MAX_ITEMS),
    spaceId: z.coerce.number().int().positive().optional(),
    visibility: z.enum(["private", "org", "public"]).default("org"),
    duplicatePolicy: z.enum(["skip", "update"]).default("skip"),
  })
  .strict();

export type ImportRequest = z.infer<typeof importRequestSchema>;
export type ImportItem = z.infer<typeof importItemSchema>;

export interface ImportPlanItem {
  title: string;
  outcome: "new" | "duplicate" | "invalid";
  reason?: string;
  existingPageId?: number;
}

export interface ImportPlan {
  total: number;
  new: number;
  duplicate: number;
  invalid: number;
  items: ImportPlanItem[];
}

function contentFor(sourceType: ImportRequest["sourceType"], text: string) {
  // A zip is unpacked in the browser and arrives as markdown bodies.
  return sourceType === "html" ? htmlToPlate(text) : markdownToPlate(text);
}

/** What an import would do, without doing it. */
export async function planImport(orgId: string, request: ImportRequest): Promise<ImportPlan> {
  const refs = request.items
    .filter((item) => item.externalId && item.externalSource)
    .map((item) => `${item.externalSource}:${item.externalId}`);

  const existing = refs.length
    ? await db
        .select({
          id: kbPages.id,
          externalId: kbPages.externalId,
          externalSource: kbPages.externalSource,
        })
        .from(kbPages)
        .where(
          and(
            eq(kbPages.orgId, orgId),
            inArray(
              kbPages.externalId,
              request.items.map((item) => item.externalId ?? "").filter(Boolean),
            ),
          ),
        )
    : [];

  const byRef = new Map(
    existing.map((row) => [`${row.externalSource}:${row.externalId}`, row.id]),
  );

  const items: ImportPlanItem[] = request.items.map((item) => {
    if (!item.contentText.trim()) {
      return { title: item.title, outcome: "invalid", reason: "The body is empty." };
    }
    const ref =
      item.externalId && item.externalSource
        ? `${item.externalSource}:${item.externalId}`
        : null;
    const existingPageId = ref ? byRef.get(ref) : undefined;
    return existingPageId
      ? { title: item.title, outcome: "duplicate", existingPageId }
      : { title: item.title, outcome: "new" };
  });

  return {
    total: items.length,
    new: items.filter((item) => item.outcome === "new").length,
    duplicate: items.filter((item) => item.outcome === "duplicate").length,
    invalid: items.filter((item) => item.outcome === "invalid").length,
    items,
  };
}

export interface ImportOutcome {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ title: string; reason: string }>;
}

/** Runs the import. Each item stands alone: one bad page does not lose the rest. */
export async function runImport(
  orgId: string,
  actorId: string,
  request: ImportRequest,
): Promise<ImportOutcome> {
  const plan = await planImport(orgId, request);
  const outcome: ImportOutcome = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

  for (const [index, item] of request.items.entries()) {
    const planned = plan.items[index];

    if (planned.outcome === "invalid") {
      outcome.failed += 1;
      outcome.errors.push({ title: item.title, reason: planned.reason ?? "Invalid." });
      continue;
    }

    try {
      const content = contentFor(request.sourceType, item.contentText);
      const contentText = extractContentText(content);

      if (planned.outcome === "duplicate" && planned.existingPageId) {
        if (request.duplicatePolicy === "skip") {
          outcome.skipped += 1;
          continue;
        }
        await db
          .update(kbPages)
          .set({
            title: item.title,
            content: content as never,
            contentText,
            excerpt: buildExcerpt(contentText),
            lastEditedById: actorId,
            updatedAt: new Date(),
          })
          .where(
            and(eq(kbPages.id, planned.existingPageId), eq(kbPages.orgId, orgId)),
          );
        outcome.updated += 1;
        continue;
      }

      await db.insert(kbPages).values({
        orgId,
        spaceId: request.spaceId ?? null,
        parentPageId: item.parentPageId ?? null,
        title: item.title,
        content: content as never,
        contentText,
        excerpt: buildExcerpt(contentText),
        visibility: request.visibility,
        status: "draft",
        createdById: actorId,
        lastEditedById: actorId,
        ownerUserId: actorId,
        externalId: item.externalId ?? null,
        externalSource: item.externalSource ?? null,
      });
      outcome.created += 1;
    } catch (error) {
      outcome.failed += 1;
      outcome.errors.push({ title: item.title, reason: String(error).slice(0, 300) });
    }
  }

  return outcome;
}
