import * as React from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";
import type { LucideIcon } from "lucide-react";

interface TimelineItem {
  id: string;
  icon?: LucideIcon;
  tone?: Tone;
  actor?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  timestamp: Date | string;
}

interface TimelineProps {
  items: TimelineItem[];
  groupByDay?: boolean;
  emptyLabel?: string;
  className?: string;
}

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM yyyy");
}

/** Vertical activity timeline (§6.3): tone nodes, relative times (absolute on hover), sticky day separators. */
function Timeline({ items, groupByDay = true, emptyLabel = "No activity yet", className }: TimelineProps) {
  if (items.length === 0) {
    return <p className={cn("py-6 text-center text-sm text-muted-foreground", className)}>{emptyLabel}</p>;
  }

  // Items are rendered in the order given; callers sort (usually newest first).
  const groups: { label: string; items: (TimelineItem & { date: Date })[] }[] = [];
  for (const item of items) {
    const date = new Date(item.timestamp);
    const label = groupByDay ? dayLabel(date) : "";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push({ ...item, date });
    else groups.push({ label, items: [{ ...item, date }] });
  }

  return (
    <div className={cn("space-y-4", className)}>
      {groups.map((group, gi) => (
        <section key={`${group.label}-${gi}`}>
          {groupByDay && (
            <h4 className="sticky top-0 z-sticky bg-card py-1 font-sans text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </h4>
          )}
          <ol className="relative mt-2 space-y-4 before:absolute before:top-3.5 before:bottom-3.5 before:left-3.5 before:w-px before:-translate-x-1/2 before:bg-border">
            {group.items.map((item) => (
              <li key={item.id} className="relative flex gap-3">
                <div className="min-w-0 flex-1 pt-1 text-sm">
                  <p className="text-foreground">
                    {item.actor && <span className="font-semibold">{item.actor} </span>}
                    {item.title}
                  </p>
                  {item.body && <div className="mt-1 text-muted-foreground">{item.body}</div>}
                  <time
                    dateTime={item.date.toISOString()}
                    title={format(item.date, "PPpp")}
                    className="mt-0.5 block text-xs text-muted-foreground"
                  >
                    {formatDistanceToNow(item.date, { addSuffix: true })}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export { Timeline };
export type { TimelineItem, TimelineProps };
