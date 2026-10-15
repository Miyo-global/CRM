const TOKEN = /@\[([^\]\n]{1,100})\]\(([A-Za-z0-9_-]{1,64})\)/g;

export function CommentContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of content.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(content.slice(last, index));
    parts.push(
      <span key={index} className="rounded-sm bg-brand-soft px-1 font-medium text-brand-text">
        @{match[1]}
      </span>,
    );
    last = index + match[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{parts}</p>;
}
