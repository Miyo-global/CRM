"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { KanbanBoard } from "@/components/projects/kanban-board";
import type { KanbanTicket } from "@/components/projects/shared/types";
import { cn } from "@/lib/utils";

export type SwimlaneKey = "none" | "assignee" | "priority" | "type";

const PRIORITY_ORDER = ["URGENT", "HIGH", "MEDIUM", "LOW"];

type Props = Omit<React.ComponentProps<typeof KanbanBoard>, "tickets" | "columnCounts"> & {
  lane: Exclude<SwimlaneKey, "none">;
  tickets: KanbanTicket[];
};

function laneOf(ticket: KanbanTicket, lane: Props["lane"]): { key: string; label: string } {
  if (lane === "assignee") {
    const a = ticket.assignee;
    const name = a ? [a.firstName, a.lastName].filter(Boolean).join(" ") || "Unnamed" : "Unassigned";
    return { key: a?.id ?? "none", label: name };
  }
  if (lane === "priority") {
    const p = ticket.priority ?? "NONE";
    return { key: p, label: p === "NONE" ? "No priority" : p.charAt(0) + p.slice(1).toLowerCase() };
  }
  const t = ticket.type || "TASK";
  return { key: t, label: t.charAt(0) + t.slice(1).toLowerCase() };
}

export function SwimlaneBoard({ lane, tickets, ...board }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const lanes = useMemo(() => {
    const groups = new Map<string, { label: string; tickets: KanbanTicket[] }>();
    for (const t of tickets) {
      const { key, label } = laneOf(t, lane);
      const group = groups.get(key) ?? { label, tickets: [] };
      group.tickets.push(t);
      groups.set(key, group);
    }
    const entries = [...groups.entries()];
    const priorityRank = (key: string) => (PRIORITY_ORDER.includes(key) ? PRIORITY_ORDER.indexOf(key) : PRIORITY_ORDER.length);
    if (lane === "priority") entries.sort(([a], [b]) => priorityRank(a) - priorityRank(b));
    else entries.sort(([, a], [, b]) => a.label.localeCompare(b.label));
    return entries;
  }, [tickets, lane]);

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="h-full space-y-3 overflow-y-auto py-2">
      {lanes.map(([key, group]) => {
        const open = !collapsed.has(key);
        return (
          <section key={key} aria-label={group.label} className="rounded-xl border border-border bg-card/40">
            <button
              type="button"
              onClick={() => toggle(key)}
              aria-expanded={open}
              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-medium outline-none focus-visible:focus-ring rounded-xl"
            >
              <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
              {group.label}
              <span className="text-xs tabular-nums text-muted-foreground">{group.tickets.length}</span>
            </button>
            {open && (
              <div className="h-[28rem] px-1 pb-2">
                <KanbanBoard {...board} tickets={group.tickets} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
