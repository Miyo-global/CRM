import { describe, expect, it } from "vitest";

import { readImportFiles, sourceTypeForFiles } from "./read-import-files";

function file(name: string, body: string): File {
  return new File([body], name, { type: "text/plain" });
}

describe("KB-0088: reading the chosen files", () => {
  it("takes the title from the file name", async () => {
    const result = await readImportFiles([file("Leave policy.md", "# Leave\n\nAsk your manager.")]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Leave policy");
    expect(result.items[0].contentText).toContain("Ask your manager.");
  });

  it("says which files it left out instead of dropping them quietly", async () => {
    const result = await readImportFiles([file("empty.md", "   "), file("real.md", "content")]);
    expect(result.items).toHaveLength(1);
    expect(result.skipped).toEqual([{ name: "empty.md", reason: "Empty" }]);
  });

  it("stops at a hundred pages and says so", async () => {
    const files = Array.from({ length: 105 }, (_, i) => file(`page-${i}.md`, "body"));
    const result = await readImportFiles(files);
    expect(result.items).toHaveLength(100);
    expect(result.truncated).toBe(true);
  });

  it("picks the source type from the extensions", () => {
    expect(sourceTypeForFiles(["a.md", "b.markdown"])).toBe("markdown");
    expect(sourceTypeForFiles(["a.html", "b.htm"])).toBe("html");
    expect(sourceTypeForFiles(["pages.zip"])).toBe("zip");
    // Mixed: markdown is the safe reading, since HTML parsed as markdown
    // survives and markdown parsed as HTML does not.
    expect(sourceTypeForFiles(["a.md", "b.html"])).toBe("markdown");
  });
});
