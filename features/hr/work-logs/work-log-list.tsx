"use client";

import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTimeIllustration } from "@/components/illustrations";
import type { WorkLog } from "@/types/hr";

function userLabel(u: WorkLog["user"]): string {
  if (!u) return "Unknown";
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return full || u.name || "Unknown";
}

function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return format(new Date(y, m - 1, d), "dd MMM yyyy · EEE");
}

export function WorkLogList({ logs, searchTerm }: { logs: WorkLog[]; searchTerm: string }) {
  const term = searchTerm.trim().toLowerCase();

  const deduped = new Map<string, WorkLog>();
  for (const l of logs) {
    const key = `${l.userId ?? "unknown"}::${l.date}`;
    const existing = deduped.get(key);
    if (!existing || l.id > existing.id) deduped.set(key, l);
  }

  const rows = [...deduped.values()]
    .filter((l) => !!l.description?.trim())
    .filter((l) => {
      if (!term) return true;
      return (
        (l.description ?? "").toLowerCase().includes(term) ||
        userLabel(l.user).toLowerCase().includes(term) ||
        l.date.includes(term)
      );
    })
    .sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : userLabel(a.user).localeCompare(userLabel(b.user))
    );

  const byUser = new Map<string, { label: string; entries: WorkLog[] }>();
  for (const l of rows) {
    const key = l.userId ?? "unknown";
    if (!byUser.has(key)) byUser.set(key, { label: userLabel(l.user), entries: [] });
    byUser.get(key)!.entries.push(l);
  }

  const groups = [...byUser.values()].sort((a, b) => a.label.localeCompare(b.label));

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            illustration={<EmptyTimeIllustration className="h-32 w-32 opacity-95" />}
            title="No work logs found"
            description="No logged work matches the selected filters for this department."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
              </Badge>
            </div>
            <ul className="divide-y divide-border/60">
              {group.entries.map((l) => (
                <li key={l.id} className="py-2 flex flex-col sm:flex-row sm:items-start sm:gap-4">
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 sm:w-[140px]">
                    {formatDay(l.date)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm whitespace-pre-wrap break-words">{l.description}</p>
                    {l.workLink && (
                      <a
                        href={l.workLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline break-all"
                      >
                        {l.workLink}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
