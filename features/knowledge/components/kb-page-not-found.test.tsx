import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { KbPageNotFound } from "./kb-page-not-found";

describe("KB-0089: the not-found state", () => {
  const html = renderToStaticMarkup(<KbPageNotFound />);

  it("says the same thing whether the page is missing or closed", () => {
    expect(html).toContain("doesn&#x27;t exist or you don&#x27;t have access");
  });

  it("never says the page exists, or who owns it", () => {
    for (const leak of ["permission", "private", "owner", "Access Restricted", "403"]) {
      expect(html).not.toContain(leak);
    }
  });

  it("offers the way back", () => {
    expect(html).toContain('href="/knowledge/wiki"');
    expect(html).toContain("Back to wiki");
  });
});
