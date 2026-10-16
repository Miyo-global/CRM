import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryErrorState } from "./query-error-state";

describe("QueryErrorState", () => {
  it("shows the API error message", () => {
    const html = renderToStaticMarkup(
      <QueryErrorState error={new Error("Validation failed: limit: Too big")} onRetry={() => {}} />,
    );
    expect(html).toContain("Validation failed: limit: Too big");
  });

  it("falls back to a generic message for non-Error values", () => {
    const html = renderToStaticMarkup(<QueryErrorState error="boom" />);
    expect(html).toContain("Something went wrong while loading");
    expect(html).not.toContain("boom");
  });

  it("omits Retry when no handler is given", () => {
    expect(renderToStaticMarkup(<QueryErrorState />)).not.toContain("Retry");
  });

  it("renders an alert that fills the available height with a Retry button", () => {
    const html = renderToStaticMarkup(<QueryErrorState onRetry={() => {}} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("min-h-[50vh]");
    expect(html).toContain("flex-1");
    expect(html).toContain("Retry");
  });

  it("never renders a raw SQL error (MIYO-0026)", () => {
    const html = renderToStaticMarkup(
      <QueryErrorState error={new Error('Failed query: select count(*) from "projects" params: org_abc')} onRetry={() => {}} />,
    );
    expect(html).not.toMatch(/select|org_abc/);
    expect(html).toContain("Something went wrong. Please try again.");
  });
});
