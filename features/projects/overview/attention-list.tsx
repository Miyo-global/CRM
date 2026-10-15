"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { ProjectOverview } from "@/lib/api/hooks/projects/activity";

type Item = ProjectOverview["attention"]["overdue"][number];

export function AttentionList({
  title,
  items,
  projectId,
  projectKey,
  empty,
}: {
  title: string;
  items: Item[];
  projectId: number;
  projectKey: string | null;
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        {title} <span className="font-normal tabular-nums text-muted-foreground">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((t) => {
            const key = projectKey ? `${projectKey}-${t.ticketNumber}` : `#${t.ticketNumber}`;
            return (
              <li key={t.id}>
                <Link
                  href={`/projects/${projectId}?ticket=${t.id}`}
                  className="flex min-h-10 items-center gap-3 rounded-md px-2 text-sm hover:bg-muted focus-visible:focus-ring"
                >
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{key}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{t.title}</span>
                  {t.dueDate && (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      Due {format(new Date(t.dueDate), "MMM d")}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
