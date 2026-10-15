"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type MentionPerson = { id: string; name: string; email?: string };

type Props = Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  people: MentionPerson[];
};

function activeQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([^\s@\[\]()]{0,30})$/.exec(before);
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2].toLowerCase() };
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(function MentionTextarea(
  { value, onValueChange, people, onKeyDown, className, ...props },
  forwardedRef,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement);
  const [caret, setCaret] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);

  const query = activeQuery(value, caret);
  const matches = useMemo(() => {
    if (!query) return [];
    return people
      .filter((p) => p.name.toLowerCase().includes(query.query) || (p.email ?? "").toLowerCase().includes(query.query))
      .slice(0, 6);
  }, [people, query]);
  const open = !!query && matches.length > 0 && dismissed !== query.start;

  const insert = (person: MentionPerson) => {
    if (!query) return;
    const token = `@[${person.name.replace(/[\[\]]/g, "")}](${person.id}) `;
    const next = value.slice(0, query.start) + token + value.slice(caret);
    onValueChange(next);
    const position = query.start + token.length;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(position, position);
      setCaret(position);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setCaret(e.target.selectionStart);
          setHighlight(0);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setHighlight((h) => (h + step + matches.length) % matches.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              insert(matches[highlight]);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setDismissed(query?.start ?? null);
              return;
            }
          }
          onKeyDown?.(e);
        }}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? "mention-options" : undefined}
        className={className}
        {...props}
      />
      {open && (
        <ul
          id="mention-options"
          role="listbox"
          aria-label="Mention someone"
          className="absolute left-2 top-full z-popover mt-1 w-64 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {matches.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                insert(p);
              }}
              className={cn(
                "flex min-h-10 cursor-pointer flex-col justify-center rounded-sm px-2 text-sm",
                i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-muted",
              )}
            >
              <span className="font-medium">{p.name}</span>
              {p.email && <span className="text-xs text-muted-foreground">{p.email}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
