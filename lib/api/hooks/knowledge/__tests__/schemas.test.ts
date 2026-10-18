import { describe, expect, it } from "vitest";

import {
  kbCapabilitiesSchema,
  kbCollection,
  kbExportJobSchema,
  kbImportJobSchema,
  kbPageCommentSchema,
  kbPageSchema,
  kbPageSummarySchema,
  kbSearchResponseSchema,
  kbSettingsSchema,
  kbSpaceSchema,
  kbTranslationSchema,
} from "../schemas";

/**
 * KB-0066: the sample payloads are the shape the routes in Phase D return. A
 * schema that drifts from its route fails here rather than in the editor.
 */
describe("knowledge response schemas", () => {
  it("parses a page", () => {
    const page = kbPageSchema.parse({
      id: 7,
      title: "Leave policy",
      slug: "leave-policy",
      icon: "📄",
      excerpt: "How to book time off.",
      spaceId: 2,
      parentId: null,
      projectId: null,
      visibility: "org",
      status: "published",
      contentType: "policy",
      ownerId: "user_1",
      contentRevision: 12,
      isLocked: false,
      content: [{ type: "p", children: [{ text: "Ask your manager." }] }],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
    expect(page.title).toBe("Leave policy");
    expect(Array.isArray(page.content)).toBe(true);
  });

  it("parses a page with only the columns a list query selects", () => {
    expect(() =>
      kbPageSummarySchema.parse({ id: 1, title: "Draft", visibility: "private", status: "draft" }),
    ).not.toThrow();
  });

  it("rejects a page that is missing its title", () => {
    expect(() => kbPageSummarySchema.parse({ id: 1, visibility: "org", status: "draft" })).toThrow();
  });

  it("parses a cursor-paged collection, cursor or not", () => {
    const collection = kbCollection(kbPageSummarySchema);
    expect(
      collection.parse({
        items: [{ id: 1, title: "A", visibility: "org", status: "draft" }],
        nextCursor: "eyJpZCI6MX0",
      }).nextCursor,
    ).toBe("eyJpZCI6MX0");
    expect(collection.parse({ items: [] }).items).toEqual([]);
  });

  it("parses capabilities as booleans only, never key names", () => {
    const capabilities = kbCapabilitiesSchema.parse({
      ai: false,
      embeddings: false,
      storage: true,
      jobs: false,
      email: true,
      vector: false,
      helpCentre: false,
    });
    expect(capabilities.ai).toBe(false);
    expect(Object.values(capabilities).every((v) => typeof v === "boolean")).toBe(true);
  });

  it("keeps the search mode, so the UI can say keyword search", () => {
    const response = kbSearchResponseSchema.parse({
      items: [{ id: 3, title: "Leave policy", snippet: "...time <b>off</b>..." }],
      mode: "keyword",
    });
    expect(response.mode).toBe("keyword");
  });

  it("rejects a search mode it does not know", () => {
    expect(() => kbSearchResponseSchema.parse({ items: [], mode: "magic" })).toThrow();
  });

  it("parses a space, a comment, a translation and the job rows", () => {
    expect(kbSpaceSchema.parse({ id: 1, name: "Engineering", slug: "engineering" }).slug).toBe(
      "engineering",
    );
    expect(
      kbPageCommentSchema.parse({
        id: 4,
        pageId: 7,
        body: "Still true?",
        authorId: "user_2",
        anchorBlockIndex: 2,
        anchorQuote: "two weeks",
        createdAt: "2026-02-01T00:00:00.000Z",
      }).anchorQuote,
    ).toBe("two weeks");
    expect(
      kbTranslationSchema.parse({
        locale: "pt-BR",
        title: "Política de licença",
        status: "outdated",
        revision: 3,
      }).status,
    ).toBe("outdated");
    expect(
      kbImportJobSchema.parse({
        id: 9,
        status: "completed",
        sourceType: "markdown",
        totalItems: 3,
        processedItems: 3,
        succeededItems: 2,
        failedItems: 1,
        duplicateItems: 0,
        errorReport: { errors: [{ title: "Broken page", reason: "Empty body" }] },
      }).errorReport?.errors?.[0].title,
    ).toBe("Broken page");
    expect(
      kbExportJobSchema.parse({ id: 2, status: "completed", format: "markdown" }).format,
    ).toBe("markdown");
  });

  it("parses the settings row", () => {
    const settings = kbSettingsSchema.parse({
      trashRetentionDays: 30,
      chatHistoryRetentionDays: 90,
      hrmsKbLinkEnabled: true,
      hrmsKbSearchEnabled: true,
      hrmsKbAiEnabled: false,
    });
    expect(settings.trashRetentionDays).toBe(30);
  });

  it("keeps chat retention nullable, which is how keeping it forever is stored", () => {
    expect(
      kbSettingsSchema.parse({
        trashRetentionDays: 30,
        chatHistoryRetentionDays: null,
        hrmsKbLinkEnabled: false,
        hrmsKbSearchEnabled: false,
        hrmsKbAiEnabled: false,
      }).chatHistoryRetentionDays,
    ).toBeNull();
  });
});
