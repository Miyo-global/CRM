import { describe, expect, it } from "vitest";

import {
  htmlToPlate,
  legacyToPlate,
  markdownToPlate,
  parseInline,
  plateToHtml,
  plateToMarkdown,
  plateToPlainText,
  sanitizeImportedHtml,
} from "./plate-value-convert";

const MARKDOWN = `# Leave policy

Ask **HR** before booking, see [the handbook](/knowledge/wiki/doc/4).

## Entitlement

- Casual leave
- Sick leave

1. Apply
2. Wait

> Approval takes two days.

| Type | Days |
| --- | --- |
| Casual | 12 |
| Sick | 6 |

\`\`\`sql
select 1;
\`\`\`

---`;

describe("markdownToPlate", () => {
  const value = markdownToPlate(MARKDOWN);

  it("reads headings", () => {
    expect(value[0]).toMatchObject({ type: "h1" });
    expect(value.some((b) => b.type === "h2")).toBe(true);
  });

  it("reads both list kinds as separate blocks", () => {
    const lists = value.filter((b) => b.type === "ul" || b.type === "ol");
    expect(lists.map((l) => l.type)).toEqual(["ul", "ol"]);
    expect(lists[0].children).toHaveLength(2);
  });

  it("reads a quote, a rule, a fenced code block and its language", () => {
    expect(value.some((b) => b.type === "blockquote")).toBe(true);
    expect(value.some((b) => b.type === "hr")).toBe(true);
    const code = value.find((b) => b.type === "code_block");
    expect(code).toMatchObject({ lang: "sql" });
    expect(code?.children?.[0].children?.[0].text).toBe("select 1;");
  });

  it("reads a table with a header row", () => {
    const table = value.find((b) => b.type === "table");
    expect(table?.children).toHaveLength(3);
    expect(table?.children?.[0].children?.[0].type).toBe("th");
    expect(table?.children?.[1].children?.[0].type).toBe("td");
  });

  it("is a single empty paragraph for empty input", () => {
    expect(markdownToPlate("")).toEqual([{ type: "p", children: [{ text: "" }] }]);
  });
});

describe("parseInline", () => {
  it("reads bold, italic, code and links", () => {
    expect(parseInline("a **b** c *d* `e` [f](http://x.test)")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " c " },
      { text: "d", italic: true },
      { text: " " },
      { text: "e", code: true },
      { text: " " },
      { type: "a", url: "http://x.test", children: [{ text: "f" }] },
    ]);
  });

  it("leaves plain text alone", () => {
    expect(parseInline("nothing special")).toEqual([{ text: "nothing special" }]);
  });
});

describe("markdown round trip", () => {
  it("keeps headings, lists, links, code and tables", () => {
    const once = plateToMarkdown(markdownToPlate(MARKDOWN));
    const twice = plateToMarkdown(markdownToPlate(once));

    expect(once).toContain("# Leave policy");
    expect(once).toContain("## Entitlement");
    expect(once).toContain("- Casual leave");
    expect(once).toContain("1. Apply");
    expect(once).toContain("2. Wait");
    expect(once).toContain("[the handbook](/knowledge/wiki/doc/4)");
    expect(once).toContain("**HR**");
    expect(once).toContain("```sql");
    expect(once).toContain("select 1;");
    expect(once).toContain("| Type | Days |");
    expect(once).toContain("| Casual | 12 |");
    expect(once).toContain("> Approval takes two days.");
    expect(once).toContain("---");

    // Stable: a second pass changes nothing.
    expect(twice).toBe(once);
  });
});

describe("plateToHtml", () => {
  it("renders blocks and escapes text", () => {
    const html = plateToHtml(markdownToPlate("# T\n\na <b & c\n\n- one"));
    expect(html).toContain("<h1>T</h1>");
    expect(html).toContain("&lt;b &amp; c");
    expect(html).toContain("<ul><li>one</li></ul>");
  });
});

describe("sanitizeImportedHtml", () => {
  it("drops scripts, styles and event handlers", () => {
    const dirty = `<p onclick="steal()">hi</p><script>steal()</script><style>p{}</style><iframe src="x"></iframe>`;
    const clean = sanitizeImportedHtml(dirty);
    expect(clean).toContain("hi");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("iframe");
  });

  it("keeps an http link and drops a javascript: one", () => {
    expect(sanitizeImportedHtml('<a href="https://x.test">x</a>')).toContain("https://x.test");
    expect(sanitizeImportedHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });
});

describe("htmlToPlate", () => {
  it("reads headings, paragraphs, lists, links, marks, quotes and rules", () => {
    const value = htmlToPlate(
      `<h2>Policy</h2><p>Ask <strong>HR</strong> and see <a href="/x">this</a>.</p>` +
        `<ul><li>one</li><li>two</li></ul><blockquote>Two days.</blockquote><hr />`,
    );

    expect(value[0]).toMatchObject({ type: "h2" });
    expect(value[1].children?.some((c) => c.bold)).toBe(true);
    expect(value[1].children?.some((c) => c.type === "a" && c.url === "/x")).toBe(true);
    expect(value.find((b) => b.type === "ul")?.children).toHaveLength(2);
    expect(value.some((b) => b.type === "blockquote")).toBe(true);
    expect(value.some((b) => b.type === "hr")).toBe(true);
  });

  it("reads a table", () => {
    const value = htmlToPlate("<table><tr><th>A</th></tr><tr><td>1</td></tr></table>");
    const table = value.find((b) => b.type === "table");
    expect(table?.children).toHaveLength(2);
    expect(table?.children?.[0].children?.[0].type).toBe("th");
  });

  it("reads a code block as one line of code", () => {
    const value = htmlToPlate("<pre><code>select 1;</code></pre>");
    expect(value[0]).toMatchObject({ type: "code_block" });
    expect(value[0].children?.[0].children?.[0].text).toBe("select 1;");
  });

  it("is an empty paragraph for empty input", () => {
    expect(htmlToPlate("")).toEqual([{ type: "p", children: [{ text: "" }] }]);
  });
});

describe("legacyToPlate", () => {
  it("passes a Plate value through", () => {
    const value = [{ type: "p", children: [{ text: "x" }] }];
    expect(legacyToPlate(value)).toBe(value);
  });

  it("reads a Tiptap doc, keeping heading levels", () => {
    const value = legacyToPlate({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Sprint" }] },
        { type: "paragraph", content: [{ type: "text", text: "Ship Friday." }] },
      ],
    });
    expect(value[0]).toMatchObject({ type: "h2" });
    expect(value[1]).toMatchObject({ type: "p" });
    expect(plateToPlainText(value)).toBe("Sprint\nShip Friday.");
  });

  it("reads a plain string and an HTML string", () => {
    expect(plateToPlainText(legacyToPlate("just text"))).toBe("just text");
    expect(legacyToPlate("<p>html text</p>")[0]).toMatchObject({ type: "p" });
  });

  it("is an empty paragraph for null, empty or junk content", () => {
    for (const input of [null, undefined, "", "   ", {}, 7]) {
      expect(legacyToPlate(input)).toEqual([{ type: "p", children: [{ text: "" }] }]);
    }
  });
});
