import { describe, expect, it } from "vitest";

import { queryKeys } from "@/lib/query-keys";

/**
 * KB-0066: the cache keys. Every knowledge key hangs off one prefix so a
 * module-wide invalidate works, and a list key carries its params so changing
 * a filter is a different entry rather than a refetch over the same one.
 */
describe("knowledge query keys", () => {
  const kb = queryKeys.knowledge;

  it("shares one prefix, so invalidating the module clears everything", () => {
    const prefix = kb.all.join("/");
    for (const key of [
      kb.pages(),
      kb.page(1),
      kb.pageTree({ spaceId: 2 }),
      kb.spaces(),
      kb.pageComments(1),
      kb.reviews(),
      kb.trash(),
      kb.search({ q: "leave" }),
      kb.settings(),
      kb.importJobs(),
      kb.exportJobs(),
    ]) {
      expect(key.join("/").startsWith(prefix)).toBe(true);
    }
  });

  it("separates two filter sets", () => {
    expect(kb.pages({ spaceId: 1 })).not.toEqual(kb.pages({ spaceId: 2 }));
    expect(kb.search({ q: "a" })).not.toEqual(kb.search({ q: "b" }));
  });

  it("keeps a detail key apart from the list it came from", () => {
    expect(kb.page(1)).not.toEqual(kb.pages({ id: 1 }));
    expect(kb.space(1)).not.toEqual(kb.spaces({ id: 1 }));
  });

  it("gives the list prefixes a mutation can invalidate wholesale", () => {
    expect(kb.pages({ spaceId: 1 }).join("/").startsWith(kb.pagesAll().join("/"))).toBe(true);
    expect(kb.pageTree({ spaceId: 1 }).join("/").startsWith(kb.pageTreeAll().join("/"))).toBe(true);
    expect(kb.reviews({ status: "pending" }).join("/").startsWith(kb.reviewsAll().join("/"))).toBe(
      true,
    );
  });
});
