import { describe, it, expect } from "vitest";

import { markdownToEmailHtml, markdownToPlainText } from "./markdown";

describe("markdownToEmailHtml", () => {
  it("makes a paragraph per blank line", () => {
    const html = markdownToEmailHtml("One.\n\nTwo.");
    expect(html.match(/<p /g)).toHaveLength(2);
  });

  it("keeps bold, italics and http links", () => {
    const html = markdownToEmailHtml("**Hi** *there* [careers](https://example.com/careers)");
    expect(html).toContain("<strong>Hi</strong>");
    expect(html).toContain("<em>there</em>");
    expect(html).toContain('href="https://example.com/careers"');
  });

  it("escapes HTML someone typed and refuses a javascript: link", () => {
    const html = markdownToEmailHtml('<script>alert(1)</script> [x](javascript:alert(1))');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("javascript:alert(1)\"");
  });
});

describe("markdownToPlainText", () => {
  it("keeps the words and spells the link out", () => {
    expect(markdownToPlainText("**Hi** [careers](https://example.com)")).toBe(
      "Hi careers: https://example.com",
    );
  });
});
