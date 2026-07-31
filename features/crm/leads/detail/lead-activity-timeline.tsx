"use client";

import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/date-utils";
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

export function LeadActivityTimeline({
  timeline,
  isLoading,
}: LeadActivityTimelineProps) {
  return (
    <Card className="shadow-noir">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-16 flex-1" />
              </div>
            ))}
          </div>
        ) : timeline && timeline.length > 0 ? (
          <ScrollArea className="h-[450px] pr-2">
            <div className="relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border/40" />

              <div className="space-y-3">
                {timeline.map((item, idx) => {
                  const config =
                    TIMELINE_ICONS[item.type] ?? TIMELINE_ICONS.note;
                  const ItemIcon = config.icon;
                  const data = item.data;
                  const isLast = idx === timeline.length - 1;

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="relative flex gap-3 pl-9"
                    >
                      <div
                        className={cn(
                          "absolute left-0 top-1 h-[30px] w-[30px] rounded-full",
                          "flex items-center justify-center shrink-0",
                          "ring-2 ring-background",
                          config.color
                        )}
                      >
                        <ItemIcon className="h-3.5 w-3.5" />
                      </div>

                      <div
                        className={cn(
                          "flex-1 rounded-lg border border-border/40 bg-muted/15 px-3 py-2.5",
                          "hover:bg-muted/25 transition-colors",
                          !isLast && "mb-0"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold capitalize text-foreground/80">
                            {TYPE_LABELS[item.type] ?? item.type}
                          </span>
                          <span
                            className="text-[10px] text-muted-foreground tabular-nums shrink-0"
                            title={
                              item.timestamp
                                ? new Date(item.timestamp).toLocaleString()
                                : ""
                            }
                          >
                            {timeAgo(item.timestamp)}
                          </span>
                        </div>

                        {item.type === "note" && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {String(data.body ?? "")}
                          </p>
                        )}

                        {item.type === "task" && (
                          <div className="space-y-1">
                            <p className="text-xs text-foreground/80">
                              {String(data.title ?? "")}
                            </p>
                            {typeof data.status === "string" && data.status && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {data.status}
                              </Badge>
                            )}
                          </div>
                        )}

                        {item.type === "email" && (
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-foreground/80">
                              {String(data.subject ?? "(No subject)")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {String(data.direction ?? "sent")} ·{" "}
                              {String(data.toEmail ?? "")}
                            </p>
                          </div>
                        )}

                        {(item.type === "activity" || item.type === "call") && (
                          <div className="space-y-0.5">
                            {data.subject ? (
                              <p className="text-xs text-foreground/80">
                                {String(data.subject)}
                              </p>
                            ) : null}
                            {data.notes ? (
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {String(data.notes)}
                              </p>
                            ) : null}
                          </div>
                        )}

                        {data.author ? (
                          <p className="text-[10px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {String(
                              (data.author as Record<string, unknown>).name ??
                                ""
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No activities yet</p>
            <p className="text-xs text-muted-foreground/60">
              Log your first interaction with this lead
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
