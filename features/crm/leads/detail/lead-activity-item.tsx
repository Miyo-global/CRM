"use client";

import { memo } from "react";
import { Phone, Mail, MessageSquare, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/features/crm/leads/leads-constants";
import type { LeadActivity } from "@/features/crm/leads/leads-types";

interface LeadActivityItemProps {
  activity: LeadActivity;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "call":      return <Phone className="h-4 w-4" />;
    case "email":     return <Mail className="h-4 w-4" />;
    case "whatsapp":  return <MessageSquare className="h-4 w-4" />;
    case "meeting":   return <Calendar className="h-4 w-4" />;
    default:          return <MapPin className="h-4 w-4" />;
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case "call":     return "bg-blue-500/15 text-blue-400";
    case "email":    return "bg-purple-500/15 text-purple-400";
    case "whatsapp": return "bg-green-500/15 text-green-400";
    case "meeting":  return "bg-amber-500/15 text-amber-400";
    default:         return "bg-cyan-500/15 text-cyan-400";
  }
}

export const LeadActivityItem = memo(function LeadActivityItem({ activity }: LeadActivityItemProps) {
  return (
    <div className="flex gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
      <div className={cn(
        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
        getActivityColor(activity.type),
      )}>
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium capitalize">
            {activity.type.replace("_", " ")}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {timeAgo(activity.date)}
          </span>
        </div>
        {activity.subject && (
          <p className="text-xs text-muted-foreground mt-0.5">{activity.subject}</p>
        )}
        {activity.notes && (
          <p className="text-xs mt-1.5 leading-relaxed">{activity.notes}</p>
        )}
        {activity.outcome && (
          <Badge variant="outline" className="text-[10px] mt-2">{activity.outcome}</Badge>
        )}
        {activity.user && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            by {activity.user.name}
          </p>
        )}
      </div>
    </div>
  );
});
