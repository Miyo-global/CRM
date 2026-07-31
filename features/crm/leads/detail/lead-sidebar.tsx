"use client";

import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/date-utils";
import { LeadActivityTimeline } from "./lead-activity-timeline";

interface TimelineItem {
  id: number | string;
  type: string;
  timestamp?: string | Date | null;
  data: Record<string, unknown>;
}

interface LeadSidebarProps {
  lead: {
    assignedTo?: {
      name?: string | null;
      email?: string | null;
    } | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    assignedAt?: Date | string | null;
    convertedAt?: Date | string | null;
    [key: string]: unknown;
  };
  timeline: TimelineItem[] | undefined;
  timelineLoading: boolean;
}

function formatDate(val: Date | string | null | undefined): string {
  if (!val) return "";
  return formatDisplayDate(val, { day: "numeric", month: "short", year: "numeric" }) || "";
}

export function LeadSidebar({
  lead,
  timeline,
  timelineLoading,
}: LeadSidebarProps) {
  const keyDates = [
    { label: "Created", value: lead.createdAt },
    { label: "Last Updated", value: lead.updatedAt },
    { label: "Assigned", value: lead.assignedAt },
    { label: "Converted", value: lead.convertedAt },
  ].filter((d) => d.value);

  const avatarInitials = lead.assignedTo?.name
    ? lead.assignedTo.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  return (
    <div className="space-y-4">
      {lead.assignedTo && (
        <Card className="shadow-noir">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">
              Assigned To
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-11 w-11 rounded-full shrink-0",
                  "ring-2 ring-gold/50 ring-offset-2 ring-offset-background",
                  "bg-gold/10 flex items-center justify-center",
                  "text-gold font-bold text-base select-none"
                )}
              >
                {avatarInitials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {lead.assignedTo.name ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {lead.assignedTo.email ?? ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {keyDates.length > 0 && (
        <Card className="shadow-noir">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">
              Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/50" />
              <div className="space-y-3">
                {keyDates.map((d, idx) => (
                  <div key={d.label} className="flex items-center gap-3 pl-5 relative">
                    <div
                      className={cn(
                        "absolute left-0 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center",
                        idx === 0
                          ? "border-gold bg-gold/20"
                          : "border-border bg-background"
                      )}
                    />
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs text-muted-foreground">
                        {d.label}
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {formatDate(d.value as Date | string | null)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <LeadActivityTimeline timeline={timeline} isLoading={timelineLoading} />
    </div>
  );
}
