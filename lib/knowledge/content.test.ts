import { describe, expect, it } from "vitest";

import {
  buildExcerpt,
  extractContentText,
  extractMentions,
  extractPageLinks,
} from "./content";

const plate = [
  { type: "h1", children: [{ text: "Leave policy" }] },
  {
    type: "p",
    children: [
      { text: "Ask " },
      { type: "mention", userId: "user-1", children: [{ text: "@Asha" }] },
      { text: " first." },
    ],
  },
  {
    type: "ul",
    children: [
      { type: "li", children: [{ type: "lic", children: [{ text: "Casual leave" }] }] },
      { type: "li", children: [{ type: "lic", children: [{ text: "Sick leave" }] }] },
    ],
  },
  {
    type: "table",
    children: [
      {
        type: "tr",
        children: [
          { type: "td", children: [{ text: "Type" }] },
          { type: "td", children: [{ text: "Days" }] },
        ],
      },
    ],
  },
  {
    type: "toggle",
    children: [{ type: "p", children: [{ text: "Carry forward rules" }] }],
  },
  { type: "img", url: "https://example.test/a.png", name: "payslip.png", children: [{ text: "" }] },
];

describe("extractContentText", () => {
  it("reads headings, paragraphs, lists, tables and toggles", () => {
    const text = extractContentText(plate);
    expect(text).toContain("Leave policy");
    expect(text).toContain("Ask @Asha first.");
    expect(text).toContain("Casual leave");
    expect(text).toContain("TypeDays");
    expect(text).toContain("Carry forward rules");
  });

  it("uses a media block's file name, since it has no text", () => {
    expect(extractContentText(plate)).toContain("payslip.png");
  });

  it("reads the legacy Tiptap doc shape the CRM project pages use", () => {
    const tiptap = {
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "Sprint notes" }] },
        { type: "paragraph", content: [{ type: "text", text: "Ship on Friday." }] },
      ],
    };
    expect(extractContentText(tiptap)).toBe("Sprint notes\nShip on Friday.");
  });

  it("caps the walk at 500 blocks", () => {
    const many = Array.from({ length: 900 }, (_, i) => ({
      type: "p",
      children: [{ text: `line ${i}` }],
    }));
    const lines = extractContentText(many).split("\n");
    expect(lines).toHaveLength(500);
    expect(lines[499]).toBe("line 499");
  });

  it("is empty, not a throw, for junk", () => {
    expect(extractContentText(null)).toBe("");
    expect(extractContentText("not a document")).toBe("");
    expect(extractContentText([null, 7, { type: "p" }])).toBe("");
  });
});

describe("buildExcerpt", () => {
  it("collapses whitespace and keeps short text whole", () => {
    expect(buildExcerpt("  Leave   policy\n\nv2 ")).toBe("Leave policy v2");
  });

  it("cuts at a word boundary and marks the cut", () => {
    const excerpt = buildExcerpt("alpha bravo charlie delta echo foxtrot", 20);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(21);
    expect(excerpt).not.toContain("charl…");
  });

  it("handles null", () => {
    expect(buildExcerpt(null)).toBe("");
  });
});

describe("extractPageLinks", () => {
  it("finds page links, record links and in-app URLs, deduplicated", () => {
    const links = extractPageLinks([
      { type: "p", children: [{ type: "page_link", pageId: 7, children: [{ text: "Policy" }] }] },
      { type: "p", children: [{ type: "page_link", pageId: 7, children: [{ text: "Policy" }] }] },
      {
        type: "p",
        children: [{ type: "record_link", recordType: "crm_deal", recordId: 42, children: [{ text: "Deal" }] }],
      },
      {
        type: "p",
        children: [{ type: "a", url: "/knowledge/wiki/doc/9", children: [{ text: "Runbook" }] }],
      },
    ]);

    expect(links).toEqual([
      { targetType: "page", targetPageId: 7, label: undefined },
      { targetType: "crm_deal", targetId: "42", label: undefined },
      { targetType: "page", targetPageId: 9, label: undefined },
    ]);
  });

  it("reads the Tiptap attrs shape", () => {
    const links = extractPageLinks({
      type: "doc",
      content: [{ type: "pageLink", attrs: { pageId: 3 } }],
    });
    expect(links[0]).toMatchObject({ targetType: "page", targetPageId: 3 });
  });

  it("ignores an external link and a link with no page id", () => {
    expect(
      extractPageLinks([
        { type: "p", children: [{ type: "a", url: "https://example.test", children: [{ text: "x" }] }] },
        { type: "p", children: [{ type: "page_link", children: [{ text: "x" }] }] },
      ]),
    ).toEqual([]);
  });
});

describe("extractMentions", () => {
  it("collects user ids once each, from either shape", () => {
    expect(extractMentions(plate)).toEqual(["user-1"]);
    expect(
      extractMentions([
        { type: "p", children: [{ type: "mention", key: "user-2", children: [{ text: "@B" }] }] },
        { type: "p", children: [{ type: "mention", attrs: { id: "user-3" } }] },
        { type: "p", children: [{ type: "mention", userId: "user-2" }] },
      ]),
    ).toEqual(["user-2", "user-3"]);
  });

  it("ignores a mention with no id", () => {
    expect(extractMentions([{ type: "mention", children: [{ text: "@ghost" }] }])).toEqual([]);
  });
});
