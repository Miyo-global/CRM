/**
 * KB-0032: converting between Plate JSON, Markdown, HTML and the legacy CRM
 * project-page content.
 *
 * Server-safe on purpose: no React, no editor import. Import and export jobs,
 * the content-text backfill and the API all need these, and none of them should
 * pull the editor bundle in.
 *
 * The Markdown and HTML handled here is the subset a KB page actually uses:
 * headings, paragraphs, quotes, rules, lists, code blocks, tables, links and
 * the three inline marks. Anything else degrades to text rather than being
 * dropped — a page that round-trips to plain paragraphs is recoverable, a page
 * that loses its words is not. Writing a parser rather than taking a dependency
 * keeps the one import here to sanitize-html, which the repo already has.
 *
 * Streamline: SF/components/editor/plate/plate-value-convert.ts,
 * SB/modules/kb/wiki/kb-export-serializer.ts (toMarkdown / toHtml),
 * kb-markdown-to-plate.ts.
 */
import sanitizeHtml from "sanitize-html";

export interface PlateNode {
  type?: string;
  children?: PlateNode[];
  text?: string;
  url?: string;
  lang?: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  [key: string]: unknown;
}

export type PlateValue = PlateNode[];

const EMPTY: PlateValue = [{ type: "p", children: [{ text: "" }] }];

const HEADING_TYPES: Record<number, string> = { 1: "h1", 2: "h2", 3: "h3" };

function text(value: string, marks: Partial<PlateNode> = {}): PlateNode {
  return { text: value, ...marks };
}

function paragraph(children: PlateNode[]): PlateNode {
  return { type: "p", children: children.length ? children : [text("")] };
}

/* ------------------------------------------------------------------ inline */

/** `**bold**`, `*italic*`, `` `code` `` and `[label](url)`, innermost last. */
export function parseInline(input: string): PlateNode[] {
  const out: PlateNode[] = [];
  let rest = input;

  const pattern =
    /(!?\[([^\]]*)\]\(([^)\s]+)[^)]*\))|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)/;

  while (rest.length > 0) {
    const match = rest.match(pattern);
    if (!match || match.index === undefined) {
      out.push(text(rest));
      break;
    }

    if (match.index > 0) out.push(text(rest.slice(0, match.index)));

    if (match[1]) {
      const label = match[2] || match[3];
      out.push({ type: "a", url: match[3], children: [text(label)] });
    } else if (match[4] || match[6]) {
      out.push(text(match[5] ?? match[7], { bold: true }));
    } else if (match[8] || match[10]) {
      out.push(text(match[9] ?? match[11], { italic: true }));
    } else if (match[12]) {
      out.push(text(match[13], { code: true }));
    }

    rest = rest.slice(match.index + match[0].length);
  }

  return out.filter((node) => node.type !== undefined || node.text !== "");
}

function inlineToMarkdown(nodes: PlateNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "a") {
        return `[${inlineToMarkdown(node.children) || node.url || ""}](${node.url ?? ""})`;
      }
      if (node.children) return inlineToMarkdown(node.children);
      let value = node.text ?? "";
      if (node.code) value = `\`${value}\``;
      if (node.bold) value = `**${value}**`;
      if (node.italic) value = `*${value}*`;
      return value;
    })
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToHtml(nodes: PlateNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "a") {
        return `<a href="${escapeHtml(node.url ?? "")}">${inlineToHtml(node.children)}</a>`;
      }
      if (node.children) return inlineToHtml(node.children);
      let value = escapeHtml(node.text ?? "");
      if (node.code) value = `<code>${value}</code>`;
      if (node.bold) value = `<strong>${value}</strong>`;
      if (node.italic) value = `<em>${value}</em>`;
      return value;
    })
    .join("");
}

/* ---------------------------------------------------------------- markdown */

function listItem(children: PlateNode[]): PlateNode {
  return { type: "li", children: [{ type: "lic", children }] };
}

function tableRow(cells: string[], header: boolean): PlateNode {
  return {
    type: "tr",
    children: cells.map((cell) => ({
      type: header ? "th" : "td",
      children: [paragraph(parseInline(cell.trim()))],
    })),
  };
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|");
}

const TABLE_DIVIDER = /^\s*\|?[\s:-]+\|[\s:|-]*$/;

export function markdownToPlate(markdown: string): PlateValue {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PlateValue = [];
  let i = 0;

  const flushParagraph = (buffer: string[]) => {
    if (buffer.length === 0) return;
    blocks.push(paragraph(parseInline(buffer.join(" ").trim())));
    buffer.length = 0;
  };

  const buffer: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      flushParagraph(buffer);
      i += 1;
      continue;
    }

    const fence = line.match(/^\s*```(\w+)?\s*$/);
    if (fence) {
      flushParagraph(buffer);
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({
        type: "code_block",
        ...(fence[1] ? { lang: fence[1] } : {}),
        children: code.map((row) => ({ type: "code_line", children: [text(row)] })),
      });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph(buffer);
      blocks.push({
        type: HEADING_TYPES[heading[1].length],
        children: parseInline(heading[2].trim()),
      });
      i += 1;
      continue;
    }

    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
      flushParagraph(buffer);
      blocks.push({ type: "hr", children: [text("")] });
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph(buffer);
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", children: parseInline(quoted.join(" ").trim()) });
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      flushParagraph(buffer);
      const type = bullet ? "ul" : "ol";
      const items: PlateNode[] = [];
      while (i < lines.length) {
        const itemMatch = bullet
          ? lines[i].match(/^\s*[-*+]\s+(.*)$/)
          : lines[i].match(/^\s*\d+[.)]\s+(.*)$/);
        if (!itemMatch) break;
        items.push(listItem(parseInline(itemMatch[1])));
        i += 1;
      }
      blocks.push({ type, children: items });
      continue;
    }

    if (line.includes("|") && TABLE_DIVIDER.test(lines[i + 1] ?? "")) {
      flushParagraph(buffer);
      const rows: PlateNode[] = [tableRow(splitRow(line), true)];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(tableRow(splitRow(lines[i]), false));
        i += 1;
      }
      blocks.push({ type: "table", children: rows });
      continue;
    }

    buffer.push(line.trim());
    i += 1;
  }

  flushParagraph(buffer);
  return blocks.length ? blocks : EMPTY;
}

export function plateToMarkdown(value: PlateValue): string {
  const out: string[] = [];

  const render = (node: PlateNode) => {
    switch (node.type) {
      case "h1":
      case "h2":
      case "h3": {
        const level = Number(node.type.slice(1));
        out.push(`${"#".repeat(level)} ${inlineToMarkdown(node.children)}`);
        return;
      }
      case "blockquote":
        out.push(`> ${inlineToMarkdown(node.children)}`);
        return;
      case "hr":
        out.push("---");
        return;
      case "code_block": {
        const lines = (node.children ?? []).map((line) => inlineToMarkdown(line.children));
        out.push(`\`\`\`${node.lang ?? ""}\n${lines.join("\n")}\n\`\`\``);
        return;
      }
      case "ul":
      case "ol": {
        const items = (node.children ?? []).map((item, index) => {
          const marker = node.type === "ul" ? "-" : `${index + 1}.`;
          return `${marker} ${inlineToMarkdown(item.children)}`;
        });
        out.push(items.join("\n"));
        return;
      }
      case "table": {
        const rows = node.children ?? [];
        const lines = rows.map(
          (row) =>
            `| ${(row.children ?? []).map((cell) => inlineToMarkdown(cell.children)).join(" | ")} |`,
        );
        if (rows.length > 0) {
          const width = (rows[0].children ?? []).length;
          lines.splice(1, 0, `|${" --- |".repeat(width)}`);
        }
        out.push(lines.join("\n"));
        return;
      }
      default:
        out.push(inlineToMarkdown(node.children));
    }
  };

  for (const node of value) render(node);
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function plateToHtml(value: PlateValue): string {
  const render = (node: PlateNode): string => {
    switch (node.type) {
      case "h1":
      case "h2":
      case "h3":
        return `<${node.type}>${inlineToHtml(node.children)}</${node.type}>`;
      case "blockquote":
        return `<blockquote>${inlineToHtml(node.children)}</blockquote>`;
      case "hr":
        return "<hr />";
      case "code_block": {
        const lines = (node.children ?? []).map((line) => escapeHtml(inlineToMarkdown(line.children)));
        return `<pre><code>${lines.join("\n")}</code></pre>`;
      }
      case "ul":
      case "ol": {
        const items = (node.children ?? [])
          .map((item) => `<li>${inlineToHtml(item.children)}</li>`)
          .join("");
        return `<${node.type === "ul" ? "ul" : "ol"}>${items}</${node.type === "ul" ? "ul" : "ol"}>`;
      }
      case "table": {
        const rows = (node.children ?? [])
          .map(
            (row) =>
              `<tr>${(row.children ?? [])
                .map((cell) => {
                  const tag = cell.type === "th" ? "th" : "td";
                  return `<${tag}>${inlineToHtml(cell.children)}</${tag}>`;
                })
                .join("")}</tr>`,
          )
          .join("");
        return `<table>${rows}</table>`;
      }
      default:
        return `<p>${inlineToHtml(node.children)}</p>`;
    }
  };

  return value.map(render).join("\n");
}

/* -------------------------------------------------------------------- html */

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "blockquote", "hr", "pre", "code",
  "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "a", "strong",
  "b", "em", "i", "br", "div", "span",
];

/**
 * HTML comes from an import file, so it is sanitised before anything looks at
 * it: scripts, styles, iframes and event handlers are gone before parsing.
 */
export function sanitizeImportedHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href"], code: ["class"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

type Token = { tag: string; closing: boolean; attrs: string } | { chars: string };

function tokenizeHtml(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match.index > last) tokens.push({ chars: html.slice(last, match.index) });
    tokens.push({
      tag: match[1].toLowerCase(),
      closing: match[0].startsWith("</"),
      attrs: match[2] ?? "",
    });
    last = re.lastIndex;
  }
  if (last < html.length) tokens.push({ chars: html.slice(last) });
  return tokens;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * A small tag walker rather than a DOM: this runs server-side, where there is
 * no document, and the sanitiser has already reduced the input to a known set
 * of tags.
 */
export function htmlToPlate(html: string): PlateValue {
  const tokens = tokenizeHtml(sanitizeImportedHtml(html));
  const blocks: PlateValue = [];

  let blockType: string | null = null;
  let inline: PlateNode[] = [];
  const marks: Partial<PlateNode> = {};
  let listType: "ul" | "ol" | null = null;
  let listItems: PlateNode[] = [];
  let tableRows: PlateNode[] = [];
  let rowCells: PlateNode[] = [];
  let cellTag: "th" | "td" | null = null;
  let href: string | null = null;

  const closeBlock = () => {
    if (blockType && inline.length > 0) {
      blocks.push(
        blockType === "p"
          ? paragraph(inline)
          : { type: blockType, children: inline.length ? inline : [text("")] },
      );
    }
    blockType = null;
    inline = [];
  };

  for (const token of tokens) {
    if ("chars" in token) {
      const value = decodeEntities(token.chars);
      if (!value.trim()) continue;
      const node = text(value, { ...marks });
      if (href !== null) {
        inline.push({ type: "a", url: href, children: [node] });
      } else {
        if (!blockType && !listType && !cellTag) blockType = "p";
        inline.push(node);
      }
      continue;
    }

    const { tag, closing, attrs } = token;

    if (!closing) {
      switch (tag) {
        case "h1":
        case "h2":
        case "h3":
          closeBlock();
          blockType = tag;
          break;
        case "h4":
        case "h5":
        case "h6":
          closeBlock();
          blockType = "h3";
          break;
        case "p":
        case "div":
          closeBlock();
          blockType = "p";
          break;
        case "blockquote":
          closeBlock();
          blockType = "blockquote";
          break;
        case "pre":
          closeBlock();
          blockType = "code_block";
          break;
        case "hr":
          closeBlock();
          blocks.push({ type: "hr", children: [text("")] });
          break;
        case "ul":
        case "ol":
          closeBlock();
          listType = tag;
          listItems = [];
          break;
        case "li":
          inline = [];
          break;
        case "table":
          closeBlock();
          tableRows = [];
          break;
        case "tr":
          rowCells = [];
          break;
        case "th":
        case "td":
          cellTag = tag;
          inline = [];
          break;
        case "strong":
        case "b":
          marks.bold = true;
          break;
        case "em":
        case "i":
          marks.italic = true;
          break;
        case "code":
          if (blockType !== "code_block") marks.code = true;
          break;
        case "a": {
          const match = attrs.match(/href\s*=\s*"([^"]*)"/);
          href = match ? decodeEntities(match[1]) : "";
          break;
        }
        case "br":
          inline.push(text(" "));
          break;
        default:
          break;
      }
      continue;
    }

    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
      case "p":
      case "div":
      case "blockquote":
        closeBlock();
        break;
      case "pre":
        blocks.push({
          type: "code_block",
          children: [{ type: "code_line", children: [text(inline.map((n) => n.text ?? "").join(""))] }],
        });
        blockType = null;
        inline = [];
        break;
      case "li":
        listItems.push(listItem(inline.length ? inline : [text("")]));
        inline = [];
        break;
      case "ul":
      case "ol":
        if (listType) blocks.push({ type: listType, children: listItems });
        listType = null;
        listItems = [];
        break;
      case "th":
      case "td":
        rowCells.push({
          type: cellTag ?? "td",
          children: [paragraph(inline)],
        });
        cellTag = null;
        inline = [];
        break;
      case "tr":
        tableRows.push({ type: "tr", children: rowCells });
        rowCells = [];
        break;
      case "table":
        blocks.push({ type: "table", children: tableRows });
        tableRows = [];
        break;
      case "strong":
      case "b":
        delete marks.bold;
        break;
      case "em":
      case "i":
        delete marks.italic;
        break;
      case "code":
        delete marks.code;
        break;
      case "a":
        href = null;
        break;
      default:
        break;
    }
  }

  closeBlock();
  return blocks.length ? blocks : EMPTY;
}

/* ------------------------------------------------------------------ legacy */

function isTiptapDoc(value: unknown): value is { type: "doc"; content: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { type?: string }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

function tiptapNodeText(node: unknown): string {
  if (typeof node !== "object" || node === null) return "";
  const n = node as { text?: string; content?: unknown[] };
  if (typeof n.text === "string") return n.text;
  return (n.content ?? []).map(tiptapNodeText).join("");
}

/**
 * Legacy CRM project-page content: a plain string, a Tiptap doc, or already
 * Plate. Headings in a Tiptap doc keep their level; everything else becomes a
 * paragraph, which is what the old editor could produce anyway.
 */
export function legacyToPlate(content: unknown): PlateValue {
  if (Array.isArray(content) && content.length > 0) return content as PlateValue;

  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) return EMPTY;
    // The old editor stored HTML in some rows and plain text in others.
    return /<\/?[a-z][\s\S]*>/i.test(trimmed) ? htmlToPlate(trimmed) : markdownToPlate(trimmed);
  }

  if (isTiptapDoc(content)) {
    const blocks = content.content
      .map((node) => {
        const n = node as { type?: string; attrs?: { level?: number } };
        const value = tiptapNodeText(node);
        if (!value.trim()) return null;
        if (n.type === "heading") {
          const level = Math.min(Math.max(n.attrs?.level ?? 1, 1), 3);
          return { type: HEADING_TYPES[level], children: [text(value)] };
        }
        return paragraph([text(value)]);
      })
      .filter((block): block is PlateNode => block !== null);
    if (blocks.length > 0) return blocks;
  }

  return EMPTY;
}

/** The plain text of a Plate value, one line per block. */
export function plateToPlainText(value: PlateValue): string {
  const nodeText = (node: PlateNode): string =>
    typeof node.text === "string"
      ? node.text
      : (node.children ?? []).map(nodeText).join("");
  return value.map(nodeText).join("\n").trim();
}
