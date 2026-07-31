"use client";

import { Users, UserX, Phone, CalendarClock, Mail, MapPin, AlertCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";

interface EnhancedMetrics {
  activeClients: number;
  inactiveClients: number;
  totalCalls: number;
  totalMeetings: number;
  totalEmails: number;
  totalSiteVisits: number;
  followUpNeeded: number;
}

interface LiveCrmMetricsCardProps {
  metrics: EnhancedMetrics;
}

const CRM_METRIC_CONFIG = [
  { key: "activeClients" as const, label: "Active Clients", icon: Users, color: "text-emerald-500" },
  { key: "inactiveClients" as const, label: "Inactive Clients", icon: UserX, color: "text-red-400" },
  { key: "totalCalls" as const, label: "Total Calls", icon: Phone, color: "text-blue-500" },
  { key: "totalMeetings" as const, label: "Meetings", icon: CalendarClock, color: "text-purple-500" },
  { key: "totalEmails" as const, label: "Emails Sent", icon: Mail, color: "text-amber-500" },
  { key: "totalSiteVisits" as const, label: "Site Visits", icon: MapPin, color: "text-cyan-500" },
  { key: "followUpNeeded" as const, label: "Need Follow-up", icon: AlertCircle, color: null },
];

export function LiveCrmMetricsCard({ metrics }: LiveCrmMetricsCardProps) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="shadow-noir">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            Live CRM Metrics (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
            {CRM_METRIC_CONFIG.map(({ key, label, icon: Icon, color }) => {
              const value = metrics[key];
              const resolvedColor = color ?? (value > 0 ? "text-red-500" : "text-muted-foreground");
              return (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-muted/30"
                >
                  <Icon className={cn("h-5 w-5", resolvedColor)} />
                  <span className="text-2xl font-bold text-foreground">{value}</span>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight">{label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
