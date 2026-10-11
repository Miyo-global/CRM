"use client";

import {
  ArrowRightLeft, PhoneCall, StickyNote, Mail, Video, FileText, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Timeline } from "@/components/shared/timeline";
import type { DealActivity } from "@/types/crm";

const ACT_ICONS: Record<string, LucideIcon> = {
  stage_change: ArrowRightLeft,
  call: PhoneCall,
  note: StickyNote,
  email: Mail,
  meeting: Video,
  document: FileText,
};

interface ActivityTimelineProps {
  activities: DealActivity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <Timeline
      emptyLabel="No activities yet"
      items={activities
        // Timeline needs a valid date; activities without one can't be placed.
        .filter((a) => a.createdAt)
        .map((activity) => {
          const isStageChange = activity.type === "stage_change";
          return {
            id: String(activity.id),
            icon: ACT_ICONS[activity.type] ?? MessageSquare,
            tone: isStageChange ? "plum" : "brand",
            actor: activity.user?.name ?? "System",
            title: isStageChange
              ? `${activity.previousValue} → ${activity.newValue}`
              : activity.subject || activity.type,
            body: activity.notes ? <p className="line-clamp-2 text-xs">{activity.notes}</p> : undefined,
            timestamp: activity.createdAt as string,
          };
        })}
    />
  );
}
