/**
 * MIYO-0673: the small slice of Markdown an email body needs — paragraphs,
 * bold, italics and links. Everything else is escaped, because this text is
 * typed by a person and then sent to candidates.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function markdownToEmailHtml(markdown: string): string {
  return markdown
    .split(/\n{2,}/)
    .map((block) => {
      const html = escapeHtml(block.trim())
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        // Only http(s) links; a javascript: URL must never survive.
        .replace(
          /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
          '<a href="$2" style="color:#201E1F;">$1</a>',
        )
        .replace(/\n/g, "<br>");
      return html
        ? `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#201E1F;">${html}</p>`
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2")
    .trim();
}
