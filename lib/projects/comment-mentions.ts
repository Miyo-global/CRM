const MENTION = /@\[([^\]\n]{1,100})\]\(([A-Za-z0-9_-]{1,64})\)/g;

export function parseMentionIds(content: string): string[] {
  const ids = new Set<string>();
  for (const match of content.matchAll(MENTION)) ids.add(match[2]);
  return [...ids].slice(0, 20);
}

export function mentionsToPlainText(content: string): string {
  return content.replace(MENTION, "@$1");
}
