import { describe, it, expect } from "vitest";

import {
  companyDocumentHref,
  KB_CHAT,
  KB_COMPANY_DOCUMENTS,
  KB_SPACES,
  KNOWLEDGE_BASE,
  KNOWLEDGE_ROOT,
  pageHistoryHref,
  pageHref,
  projectPageHref,
  researchBriefHref,
  spaceHref,
} from "./routes";

describe("knowledge route constants", () => {
  it("hangs every wiki route off /knowledge/wiki", () => {
    expect(KNOWLEDGE_ROOT).toBe("/knowledge");
    expect(KB_CHAT).toBe("/knowledge/chat");
    expect(KNOWLEDGE_BASE).toBe("/knowledge/wiki");
    expect(KB_SPACES).toBe("/knowledge/wiki/spaces");
    expect(KB_COMPANY_DOCUMENTS).toBe("/knowledge/wiki/company-documents");
  });
});

describe("knowledge wiki page URLs", () => {
  it("uses /knowledge/wiki/doc/:pageId so Next.js does not treat the segment as the pages router", () => {
    expect(pageHref("5")).toBe("/knowledge/wiki/doc/5");
    expect(pageHistoryHref("5")).toBe("/knowledge/wiki/doc/5/history");
    expect(pageHref("5")).not.toContain("/pages/");
  });

  it("builds space, company document and brief URLs", () => {
    expect(spaceHref("a1")).toBe("/knowledge/wiki/spaces/a1");
    expect(companyDocumentHref("d1")).toBe("/knowledge/wiki/company-documents/d1");
    expect(researchBriefHref("b1")).toBe("/knowledge/research-briefs/b1");
  });

  it("points project pages at the CRM project route tree", () => {
    expect(projectPageHref("p1", "pg1")).toBe("/projects/p1/pages/pg1");
  });
});
