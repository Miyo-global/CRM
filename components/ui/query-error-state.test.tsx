import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryErrorState } from "./query-error-state";

describe("QueryErrorState (MIYO-0026)", () => {
  it("never renders a raw SQL error", () => {
    const html = renderToStaticMarkup(
      <QueryErrorState error={new Error('Failed query: select count(*) from "projects" params: org_abc')} onRetry={() => {}} />,
    );
    expect(html).not.toMatch(/select|org_abc/);
    expect(html).toContain("Something went wrong. Please try again.");
    expect(html).toContain("Retry");
  });
});
