"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { Timeline } from "@/components/shared/timeline";
import type { Tone } from "@/lib/design/tones";
import { TIMELINE_ICONS } from "./lead-types";

interface TimelineItem {
  id: number | string;
  type: string;
  timestamp?: string | Date | null;
  data: Record<string, unknown>;
}

interface LeadActivityTimelineProps {
  timeline: TimelineItem[] | undefined;
  isLoading: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  note: "Note",
  task: "Task",
  email: "Email",
  activity: "Activity",
  call: "Call",
};

const TYPE_TONE: Record<string, Tone> = {
  note: "warning",
  task: "plum",
  email: "info",
  activity: "success",
  call: "success",
};

function ItemBody({ item }: { item: TimelineItem }) {
  const data = item.data;
  if (item.type === "note") {
    return <p className="text-xs leading-relaxed">{String(data.body ?? "")}</p>;
  }
  if (item.type === "task") {
    return (
      <div className="space-y-1">
        <p className="text-xs text-foreground">{String(data.title ?? "")}</p>
        {typeof data.status === "string" && data.status && <Badge variant="secondary">{data.status}</Badge>}
      </div>
    );
  }
  if (item.type === "email") {
    return (
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">{String(data.subject ?? "(No subject)")}</p>
        <p className="text-2xs">
          {String(data.direction ?? "sent")} · {String(data.toEmail ?? "")}
        </p>
      </div>
    );
  }
  if (item.type === "activity" || item.type === "call") {
    if (!data.subject && !data.notes) return null;
    return (
      <div className="space-y-0.5">
        {data.subject ? <p className="text-xs text-foreground">{String(data.subject)}</p> : null}
        {data.notes ? <p className="text-2xs leading-relaxed">{String(data.notes)}</p> : null}
      </div>
    );
  }
  return null;
}

export function LeadActivityTimeline({ timeline, isLoading }: LeadActivityTimelineProps) {
  // Timeline places items by date; entries without a timestamp can't be shown.
  const items = (timeline ?? []).filter((item) => item.timestamp);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-sans text-sm font-semibold">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <Skeleton className="h-14 flex-1" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <Timeline
            items={items.map((item) => {
              const author = item.data.author as Record<string, unknown> | undefined;
              return {
                id: `${item.type}-${item.id}`,
                icon: (TIMELINE_ICONS[item.type] ?? TIMELINE_ICONS.note).icon,
                tone: TYPE_TONE[item.type] ?? "neutral",
                actor: author?.name ? String(author.name) : undefined,
                title: TYPE_LABELS[item.type] ?? item.type,
                body: <ItemBody item={item} />,
                timestamp: item.timestamp as string | Date,
              };
            })}
          />
        ) : (
          <EmptyState
            compact
            illustration={<EmptyActivityIllustration />}
            title="No activities yet"
            description="Log your first interaction with this lead"
            className="border-0 bg-transparent"
          />
        )}
      </CardContent>
    </Card>
  );
}
