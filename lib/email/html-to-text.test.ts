import { describe, expect, it } from "vitest";
import { htmlToText } from "./sender";

const WELCOME = `<!DOCTYPE html><html><head><style>
  .btn { background: #D4AF37; padding: 12px 20px; }
  body { margin: 0 }
</style></head><body>
  <p>Hi Ravi,</p>
  <p>Your Miyo Global account is ready.</p>
  <a class="btn" href="https://crm.example.com/setup-password?token=abc">Set your password</a>
  <p>— The Miyo Global team</p>
</body></html>`;

describe("plain-text alternative (A24)", () => {
  const text = htmlToText(WELCOME);

  it("contains no CSS", () => {
    expect(text).not.toMatch(/[{}]/);
    expect(text).not.toContain("background:");
  });

  it("keeps the greeting, the set-up URL and the sign-off", () => {
    expect(text).toContain("Hi Ravi,");
    expect(text).toContain("https://crm.example.com/setup-password?token=abc");
    expect(text).toContain("The Miyo Global team");
  });

  it("decodes entities and does not leave tags", () => {
    expect(htmlToText("<p>Sales &amp; HR</p>")).toBe("Sales & HR");
    expect(text).not.toMatch(/<[a-z]/i);
  });
});

describe("plain-text part", () => {
  it("renders a mailto link as the bare address", () => {
    expect(htmlToText('<p>Write to <a href="mailto:support@x.com">support@x.com</a>.</p>')).toBe(
      "Write to support@x.com.",
    );
  });

  it("collapses the blank lines a table layout leaves behind", () => {
    const html = "<table><tr><td>\n  <p>One</p>\n</td></tr><tr><td>\n  <p>Two</p>\n</td></tr></table>";
    expect(htmlToText(html)).toBe("One\n\nTwo");
  });
});
