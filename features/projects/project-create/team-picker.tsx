"use client";

import { useMemo, useState } from "react";
import { Check, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Person = { id: string; name?: string | null; email?: string | null };

export function TeamPicker({
  people,
  value,
  onChange,
}: {
  people: Person[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => (p.name ?? "").toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q));
  }, [people, search]);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="flex min-h-0 flex-col rounded-md border border-border">
      <div className="relative border-b border-border p-2">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
          aria-label="Search people"
        />
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto overscroll-contain p-2" aria-label="People">
        {filtered.map((p) => {
          const selected = value.includes(p.id);
          return (
            <li key={p.id}>
              <label
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
                  selected ? "bg-brand-soft" : "hover:bg-muted",
                )}
              >
                <Checkbox checked={selected} onCheckedChange={() => toggle(p.id)} />
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                  {p.name?.charAt(0) || <User className="size-4" aria-hidden="true" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("truncate text-sm font-medium", selected && "text-brand-text")}>{p.name || p.email}</span>
                  <span className="truncate text-xs text-muted-foreground">{p.email}</span>
                </span>
                {selected && <Check className="size-4 text-brand-text" aria-hidden="true" />}
              </label>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            {people.length === 0 ? "No people in this organization yet" : "No one matches your search"}
          </li>
        )}
      </ul>
    </div>
  );
}
