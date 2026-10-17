import sanitizeHtmlLib from "sanitize-html";

/**
 * SEC-0011: an <img> may point at our own storage or a relative path, never
 * at a third-party host. A remote image in a stored document is a beacon:
 * it reports to its owner every time somebody opens the document.
 */
function isAllowedImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;

  const assetBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!assetBase) return false;
  try {
    return new URL(trimmed).origin === new URL(assetBase).origin;
  } catch {
    return false;
  }
}

const HTML_SANITIZE_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: sanitizeHtmlLib.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "span",
    "center",
    "u",
    "s",
  ]),
  allowedAttributes: {
    // SEC-0011: no "class". Stored HTML has no business naming the app's
    // own stylesheet classes, and it was the one attribute here with no
    // value whitelist behind it.
    "*": ["style", "align", "dir", "title"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    td: ["colspan", "rowspan", "width", "height", "valign", "bgcolor"],
    th: ["colspan", "rowspan", "width", "height", "valign", "bgcolor"],
    table: ["width", "cellpadding", "cellspacing", "border", "bgcolor"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  transformTags: {
    // Force safe rel on all anchors so target="_blank" links can't reverse-tabnab.
    a: sanitizeHtmlLib.simpleTransform("a", { rel: "noopener noreferrer nofollow" }, true),
    img: (tagName, attribs) =>
      isAllowedImageSrc(attribs.src ?? "")
        ? { tagName, attribs }
        : { tagName: "span", attribs: {}, text: attribs.alt ?? "" },
  },
  allowedStyles: {
    "*": {
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*\)$/i, /^[a-z-]+$/i],
      "background-color": [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*\)$/i, /^[a-z-]+$/i],
      "text-align": [/^(left|right|center|justify)$/i],
      "font-weight": [/^(normal|bold|bolder|lighter|\d{3})$/i],
      "font-style": [/^(normal|italic|oblique)$/i],
      "font-size": [/^\d+(\.\d+)?(px|em|rem|%|pt)$/i],
      "text-decoration": [/^(none|underline|line-through|overline)$/i],
      "padding": [/^\d+(\.\d+)?(px|em|rem|%)?(\s+\d+(\.\d+)?(px|em|rem|%)?){0,3}$/i],
      "margin": [/^\d+(\.\d+)?(px|em|rem|%)?(\s+\d+(\.\d+)?(px|em|rem|%)?){0,3}$/i],
      width: [/^\d+(\.\d+)?(px|em|rem|%)$/i],
      height: [/^\d+(\.\d+)?(px|em|rem|%)$/i],
    },
  },
};

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return sanitizeHtmlLib(input, HTML_SANITIZE_OPTIONS);
}
