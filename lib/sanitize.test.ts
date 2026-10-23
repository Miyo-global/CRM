import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("strips event handlers", () => {
    const out = sanitizeHtml('<img src=x onerror=alert(1)><p onclick="alert(1)">hi</p>');
    expect(out).not.toMatch(/onerror|onclick|alert/);
  });

  it("strips script, iframe, style and object tags", () => {
    const out = sanitizeHtml(
      '<script>alert(1)</script><iframe src="https://evil.test"></iframe><style>body{display:none}</style><object data="x"></object>ok',
    );
    expect(out).toBe("ok");
  });

  it("drops javascript: and data: links", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
    expect(sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')).not.toContain("data:");
    expect(sanitizeHtml('<img src="data:image/svg+xml,<svg onload=alert(1)>">')).not.toContain("data:");
  });

  it("drops id attributes to prevent DOM clobbering", () => {
    expect(sanitizeHtml('<p id="__next">x</p>')).toBe("<p>x</p>");
  });

  it("drops positioning and url() styles", () => {
    const out = sanitizeHtml(
      '<div style="position:fixed;top:0;left:0;z-index:9999;background-image:url(https://evil.test/x.png);color:#333">x</div>',
    );
    expect(out).not.toMatch(/position|z-index|url\(/);
    expect(out).toContain("color:#333");
  });

  it("forces rel on links", () => {
    expect(sanitizeHtml('<a href="https://example.com" target="_blank">x</a>')).toContain(
      'rel="noopener noreferrer nofollow"',
    );
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml("")).toBe("");
  });

  it("keeps ordinary letter formatting", () => {
    const html = '<h2 style="text-align:center">Offer</h2><p><strong>Dear</strong> <u>Ana</u></p><table><tr><td colspan="2">x</td></tr></table>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});

// SEC-0011
describe("image and class hardening", () => {
  it("drops a remote image, keeping its alt text", () => {
    const out = sanitizeHtml('<img src="http://evil.example/x.png" alt="logo">');
    expect(out).not.toContain("evil.example");
    expect(out).toContain("logo");
  });

  it("keeps a relative image", () => {
    expect(sanitizeHtml('<img src="/uploads/logo.png">')).toContain('src="/uploads/logo.png"');
  });

  it("strips class attributes", () => {
    expect(sanitizeHtml('<p class="opacity-0">hi</p>')).toBe("<p>hi</p>");
  });

  it("neutralises a url() background", () => {
    expect(sanitizeHtml('<p style="background:url(http://evil.example/b)">hi</p>')).not.toContain("evil.example");
  });

  // R2-CRUD-03: plain-text fields are stored as typed and escaped on output;
  // rich text still goes through here, and the QA payload stays inert.
  it("keeps the markup and drops the script in the QA rich-text payload", () => {
    const out = sanitizeHtml('QA-TEST <b>bold</b> & "quote" <script>alert(1)</script>');
    expect(out).toBe('QA-TEST <b>bold</b> &amp; "quote" ');
  });
});
