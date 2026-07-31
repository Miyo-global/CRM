import sanitizeHtmlLib from "sanitize-html";

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
    "*": ["style", "class", "id", "align", "dir", "title"],
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
