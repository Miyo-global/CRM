"use client";

import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import type { Tone } from "@/lib/design/tones";

type ActivityType = "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation";

interface ActivityItem {
  type: ActivityType;
  message: string;
  time: string;
  person?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

const typeConfig: Record<ActivityType, { icon: LucideIcon; tone: Tone }> = {
  deal_won: { icon: CheckCircle2, tone: "success" },
  meeting: { icon: Calendar, tone: "info" },
  proposal: { icon: FileText, tone: "plum" },
  call: { icon: Phone, tone: "warning" },
  email: { icon: Mail, tone: "neutral" },
  ticket: { icon: Ticket, tone: "info" },
  escalation: { icon: AlertTriangle, tone: "danger" },
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <ol className="relative">
      {items.map((item, i) => {
        const config = typeConfig[item.type];

        return (
          <motion.li
            key={i}
            className="relative flex gap-3 pb-4 last:pb-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: i * 0.04 }}
          >
            {i < items.length - 1 && (
              <span className="absolute top-7 bottom-0 left-3.5 w-px -translate-x-1/2 bg-border" aria-hidden="true" />
            )}
            <IconChip icon={config.icon} tone={config.tone} size="sm" className="relative ring-4 ring-card" />

            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm leading-snug text-foreground">{item.message}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {item.person && (
                  <>
                    <span className="font-semibold text-foreground">{item.person}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="tabular-nums">{item.time}</span>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
