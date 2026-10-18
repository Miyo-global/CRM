/**
 * KB-0026: reading a page's content without the editor.
 *
 * Plate (and the legacy Tiptap shape the CRM project pages use) is plain JSON,
 * so these walkers are deliberately dependency-free: they run in a route
 * handler, in a cron sweep and in a test without pulling the editor bundle in.
 *
 * Streamline: SB/modules/kb/wiki/kb-page-content.util.ts,
 * help-centre/lib/kb-page-content.ts (MAX_PARAGRAPHS = 500),
 * SF/components/editor/plate/plate-value-convert.ts (getPlainText).
 */

/** Pages have been pasted whole from elsewhere; the cap keeps a walk bounded. */
const MAX_BLOCKS = 500;

const EXCERPT_LENGTH = 200;

/** Media blocks carry a file name rather than text children. */
const MEDIA_TYPES = new Set(["img", "image", "video", "audio", "file", "placeholder"]);

type Json = Record<string, unknown>;

export interface KbPageLink {
  /** "page", or a CRM record type such as "crm_deal". */
  targetType: string;
  /** Set for a page link. */
  targetPageId?: number;
  /** Set for a record link. */
  targetId?: string;
  label?: string;
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null;
}

/** Plate stores children; the legacy Tiptap shape stores content. */
function childrenOf(node: Json): unknown[] {
  if (Array.isArray(node.children)) return node.children;
  if (Array.isArray(node.content)) return node.content;
  return [];
}

/** Depth-first over either shape, stopping after `limit` visited nodes. */
function walk(content: unknown, visit: (node: Json) => void, limit = 50_000): void {
  const roots = Array.isArray(content)
    ? content
    : isObject(content)
      ? childrenOf(content)
      : [];
  const stack = [...roots].reverse();
  let visited = 0;
  while (stack.length > 0 && visited < limit) {
    const node = stack.pop();
    if (!isObject(node)) continue;
    visit(node);
    visited += 1;
    const children = childrenOf(node);
    for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i]);
  }
}

function nodeText(node: Json): string {
  if (typeof node.text === "string") return node.text;
  const type = typeof node.type === "string" ? node.type : "";
  if (MEDIA_TYPES.has(type)) {
    return typeof node.name === "string" ? node.name : "";
  }
  let out = "";
  for (const child of childrenOf(node)) {
    if (isObject(child)) out += nodeText(child);
  }
  return out;
}

/**
 * The plain text behind a page, one line per top-level block. This is what
 * feeds the fts column, the excerpt and the embedding chunks.
 */
export function extractContentText(content: unknown): string {
  const blocks = Array.isArray(content)
    ? content
    : isObject(content)
      ? childrenOf(content)
      : [];

  const lines: string[] = [];
  for (const block of blocks.slice(0, MAX_BLOCKS)) {
    if (!isObject(block)) continue;
    lines.push(nodeText(block).trim());
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** First `max` characters, cut at a word boundary, with an ellipsis. */
export function buildExcerpt(text: string | null | undefined, max = EXCERPT_LENGTH): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Page links and record links, for re-syncing kb_page_links on every save.
 * Deduplicated, since the same page is often linked twice.
 */
export function extractPageLinks(content: unknown): KbPageLink[] {
  const seen = new Set<string>();
  const links: KbPageLink[] = [];

  const add = (link: KbPageLink) => {
    const key = `${link.targetType}:${link.targetPageId ?? link.targetId ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push(link);
  };

  walk(content, (node) => {
    const type = typeof node.type === "string" ? node.type : "";
    const attrs = isObject(node.attrs) ? node.attrs : node;
    const label = typeof node.label === "string" ? node.label : undefined;

    if (type === "page_link" || type === "pageLink") {
      const pageId = Number(attrs.pageId);
      if (Number.isInteger(pageId) && pageId > 0) {
        add({ targetType: "page", targetPageId: pageId, label });
      }
      return;
    }

    if (type === "record_link" || type === "recordLink") {
      const recordType = typeof attrs.recordType === "string" ? attrs.recordType : null;
      const recordId = attrs.recordId;
      if (recordType && (typeof recordId === "string" || typeof recordId === "number")) {
        add({ targetType: recordType, targetId: String(recordId), label });
      }
      return;
    }

    // An ordinary link that happens to point at a page in this app.
    if (type === "a" || type === "link") {
      const url = typeof attrs.url === "string" ? attrs.url : typeof attrs.href === "string" ? attrs.href : null;
      if (!url) return;
      const page = url.match(/\/knowledge\/wiki\/doc\/(\d+)/);
      if (page) {
        add({ targetType: "page", targetPageId: Number(page[1]), label });
      }
    }
  });

  return links;
}

/** Mentioned user ids, for notifying only the people newly mentioned. */
export function extractMentions(content: unknown): string[] {
  const ids = new Set<string>();
  walk(content, (node) => {
    if (node.type !== "mention") return;
    const attrs = isObject(node.attrs) ? node.attrs : node;
    for (const key of ["userId", "id", "key", "value"]) {
      const value = attrs[key];
      if (typeof value === "string" && value.length > 0) {
        ids.add(value);
        return;
      }
    }
  });
  return [...ids];
}
