import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

import { WikiSidebarNav, WikiSidebarTrashLink } from "./wiki-sidebar-nav";

let mockPathname = "/knowledge/wiki";
let mockSearch = "";

function render(pathname: string, search = "") {
  mockPathname = pathname;
  mockSearch = search;
  return renderToStaticMarkup(<WikiSidebarNav />);
}

/** The active item is read off the pathname, so it survives a hard reload. */
const activeHrefs = (html: string) =>
  [...html.matchAll(/<a\b([^>]*)>/g)]
    .map(([, attrs]) => ({
      href: attrs.match(/href="([^"]*)"/)?.[1] ?? "",
      cls: attrs.match(/class="([^"]*)"/)?.[1] ?? "",
    }))
    .filter(({ cls }) => cls.includes("font-medium"))
    .map(({ href }) => href);

describe("KB-0068: the wiki sidebar", () => {
  it("links the everyday destinations", () => {
    const html = render("/knowledge/wiki");
    for (const href of [
      "/knowledge/wiki",
      "/knowledge/wiki/private",
      "/knowledge/wiki/shared",
      "/knowledge/wiki/spaces",
      "/knowledge/wiki/templates",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("has no Search link, so no wiki page prefetches a 404 (R3-KB-01)", () => {
    expect(render("/knowledge/wiki")).not.toContain("/knowledge/wiki/search");
  });

  it("marks only wiki home active on wiki home", () => {
    expect(activeHrefs(render("/knowledge/wiki"))).toEqual(["/knowledge/wiki"]);
  });

  it("does not leave wiki home active while a page is open", () => {
    expect(activeHrefs(render("/knowledge/wiki/doc/12"))).toEqual([]);
  });

  it("tells wiki home, Recent and Favourites apart, which share one path", () => {
    expect(activeHrefs(render("/knowledge/wiki", "view=recent"))).toEqual([
      "/knowledge/wiki?view=recent",
    ]);
    expect(activeHrefs(render("/knowledge/wiki", "view=favourites"))).toEqual([
      "/knowledge/wiki?view=favourites",
    ]);
  });

  it("marks Spaces active on a space detail page", () => {
    expect(activeHrefs(render("/knowledge/wiki/spaces/3"))).toEqual(["/knowledge/wiki/spaces"]);
  });

  it("keeps Trash out of the nav list and in its own link", () => {
    expect(render("/knowledge/wiki")).not.toContain("/knowledge/wiki/trash");
    mockPathname = "/knowledge/wiki/trash";
    expect(renderToStaticMarkup(<WikiSidebarTrashLink />)).toContain("/knowledge/wiki/trash");
  });
});
