import { describe, expect, it } from "vitest";

import {
  KB_CONTENT_TYPES,
  contentTypeLabel,
  statusBadge,
  trustBadge,
  visibilityLabel,
} from "./kb-labels";

describe("KB-0070: the page labels", () => {
  it("names all ten content types", () => {
    expect(KB_CONTENT_TYPES).toHaveLength(10);
    expect(contentTypeLabel("sop")).toBe("SOP");
    expect(contentTypeLabel("decision_record")).toBe("Decision record");
  });

  it("falls back to the raw value rather than showing nothing", () => {
    expect(contentTypeLabel("something_new")).toBe("something_new");
    expect(contentTypeLabel(null)).toBe("Note");
  });

  it("says what a visibility means, not what it is called", () => {
    expect(visibilityLabel("org")).toBe("Everyone at Miyo");
    expect(visibilityLabel("public")).toBe("Anyone with the link");
  });

  it("tones the statuses", () => {
    expect(statusBadge("published")).toEqual({ label: "Published", tone: "success" });
    expect(statusBadge(undefined).label).toBe("Draft");
  });

  it("calls a page past its verification window one that needs checking", () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(trustBadge(old, 180)?.label).toBe("Needs checking");
    expect(trustBadge(recent, 180)?.label).toBe("Verified");
    expect(trustBadge(null, 180)).toBeNull();
  });
});
