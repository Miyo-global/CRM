"use client";

import { Clock, FileText, Link2, TrendingUp, UserPlus } from "lucide-react";
import { Timeline } from "@/components/shared/timeline";
import type { IconChipProps } from "@/components/ui/icon-chip";
import type { Tone } from "@/lib/design/tones";
import type { OrgTimelineEvent, OrgTimelineEventType } from "@/types/crm";

const eventConfig: Record<OrgTimelineEventType, { icon: IconChipProps["icon"]; tone: Tone }> = {
  contact_created: { icon: UserPlus, tone: "info" },
  deal_created: { icon: TrendingUp, tone: "brand" },
  lead_linked: { icon: Link2, tone: "plum" },
  note_added: { icon: FileText, tone: "success" },
};

interface AccountTimelineProps {
  events: OrgTimelineEvent[];
}

export function AccountTimeline({ events }: AccountTimelineProps) {
  return (
    <Timeline
      items={events.map((event) => ({
        id: String(event.id),
        icon: eventConfig[event.type]?.icon ?? Clock,
        tone: eventConfig[event.type]?.tone ?? "neutral",
        title: event.description,
        timestamp: event.date,
      }))}
    />
  );
}
