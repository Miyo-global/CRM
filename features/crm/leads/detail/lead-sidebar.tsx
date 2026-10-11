"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyList } from "@/components/shared/property-list";
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
  /** Render the activity timeline below the rail cards (default true). */
  showTimeline?: boolean;
}

function formatDate(val: Date | string | null | undefined): string {
  if (!val) return "";
  return formatDisplayDate(val, { day: "numeric", month: "short", year: "numeric" }) || "";
}

export function LeadSidebar({
  lead,
  timeline,
  timelineLoading,
  showTimeline = true,
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-sm font-semibold">Assigned To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex size-10 shrink-0 select-none items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-foreground"
              >
                {avatarInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{lead.assignedTo.name ?? "Unknown"}</p>
                <p className="truncate text-xs text-muted-foreground">{lead.assignedTo.email ?? ""}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {keyDates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-sm font-semibold">Key Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyList
              items={keyDates.map((d) => ({
                label: d.label,
                value: <span className="tabular-nums">{formatDate(d.value as Date | string | null)}</span>,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {showTimeline && <LeadActivityTimeline timeline={timeline} isLoading={timelineLoading} />}
    </div>
  );
}
