"use client";

import {
  ArrowRightLeft, PhoneCall, StickyNote, Mail, Video, FileText, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DealActivity } from "@/types/crm";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

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
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No activities yet</p>;
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = ACT_ICONS[activity.type] ?? MessageSquare;
          const isStageChange = activity.type === "stage_change";
          return (
            <div key={activity.id} className="flex gap-3">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                isStageChange ? "bg-purple-500/10" : "bg-gold/10",
              )}>
                <Icon className={cn("h-3.5 w-3.5", isStageChange ? "text-purple-400" : "text-gold")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {isStageChange
                    ? `${activity.previousValue} → ${activity.newValue}`
                    : activity.subject || activity.type}
                </p>
                {activity.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.notes}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {activity.user?.name ?? "System"} • {activity.createdAt ? new Date(activity.createdAt).toLocaleString(DEFAULT_LOCALE) : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
