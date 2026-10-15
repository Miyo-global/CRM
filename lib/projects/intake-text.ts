type DocNode = { type?: string; text?: string; content?: DocNode[] };

function collect(node: DocNode, out: string[]) {
  if (typeof node.text === "string") out.push(node.text);
  for (const child of node.content ?? []) collect(child, out);
  if (node.type === "paragraph") out.push("\n");
}

export function intakeDescriptionText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value || undefined;
  if (typeof value !== "object") return String(value);
  const out: string[] = [];
  collect(value as DocNode, out);
  const text = out.join("").replace(/\n+$/, "").trim();
  return text || undefined;
}
