import { describe, expect, it } from "vitest";

import {
  exportContentType,
  exportExpiry,
  exportFileName,
  serializePage,
} from "./export";

describe("exportFileName", () => {
  it("strips the characters a zip entry and a header cannot carry", () => {
    expect(exportFileName('Q3 / Plan: "final"?', "markdown")).toBe("Q3 - Plan- -final--.md");
  });

  it("falls back to Untitled rather than producing a bare extension", () => {
    expect(exportFileName("   ", "html")).toBe("Untitled.html");
  });

  it("caps the length so a long title cannot break the entry", () => {
    const name = exportFileName("x".repeat(300), "markdown");
    expect(name).toHaveLength(123);
  });
});

describe("serializePage", () => {
  const page = {
    title: "Leave policy",
    content: [{ type: "p", children: [{ text: "Ask your manager." }] }],
  };

  it("writes the title as a heading, so an import round trip keeps it", () => {
    const markdown = serializePage(page, "markdown");
    expect(markdown.startsWith("# Leave policy\n")).toBe(true);
    expect(markdown).toContain("Ask your manager.");
  });

  it("produces a standalone HTML document", () => {
    const html = serializePage(page, "html");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Leave policy</title>");
    expect(html).toContain("Ask your manager.");
  });

  it("escapes a title that would otherwise close the tag", () => {
    const html = serializePage({ title: '</title><script>x</script>', content: [] }, "html");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("treats a non-array content column as an empty page instead of throwing", () => {
    expect(() => serializePage({ title: "Legacy", content: { type: "doc" } }, "markdown")).not.toThrow();
  });
});

describe("export envelope", () => {
  it("labels each format", () => {
    expect(exportContentType("markdown")).toContain("text/markdown");
    expect(exportContentType("html")).toContain("text/html");
  });

  it("expires a stored export a day out", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(exportExpiry(from).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });
});
