import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "./empty-state";

const rootClass = (html: string) => html.match(/^<div class="([^"]+)"/)?.[1] ?? "";

describe("EmptyState", () => {
  it("lets a caller class override the defaults", () => {
    const html = renderToStaticMarkup(<EmptyState title="Nothing" className="min-h-0" />);
    expect(rootClass(html)).toContain("min-h-0");
  });

  it("does not force a large min height on compact widgets", () => {
    const cls = rootClass(renderToStaticMarkup(<EmptyState title="Nothing" compact />));
    expect(cls).not.toContain("min-h-");
    expect(cls).toContain("flex-1");
  });

  it("fills the available width and height by default", () => {
    const cls = rootClass(renderToStaticMarkup(<EmptyState title="No employees" description="Add one" />));
    expect(cls).toContain("flex-1");
    expect(cls).toContain("w-full");
    expect(cls).toContain("min-h-[min(50vh,28rem)]");
    expect(cls).toContain("justify-center");
  });
});
