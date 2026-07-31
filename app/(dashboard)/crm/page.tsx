"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Building2, BarChart3, Target,
  ArrowRight, UserPlus, Settings, DollarSign, AlertTriangle,
  FileText, Briefcase,
} from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion-variants";
import { formatINRCompact } from "@/lib/format-utils";
import { useLeadStats } from "@/lib/api/hooks/leads";
import { useDeals } from "@/lib/api/hooks/crm";
import { useContacts, useCrmOrganizations } from "@/lib/api/hooks/crm";
import { CrmPipelineMini } from "@/features/crm/shared/crm-pipeline-mini";
import { CrmRecentActivity } from "@/features/crm/shared/crm-recent-activity";

const NAV_CARDS = [
  { title: "Leads", description: "Pipeline tracking", href: "/crm/leads", icon: UserPlus, color: "text-blue-400", bg: "bg-blue-500/10" },
  { title: "Deals", description: "Proposal to close", href: "/crm/deals", icon: Briefcase, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { title: "Contacts", description: "People directory", href: "/crm/contacts", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
  { title: "Clients", description: "Account management", href: "/crm/clients", icon: Building2, color: "text-amber-400", bg: "bg-amber-500/10" },
  { title: "Analytics", description: "Charts & metrics", href: "/crm/analytics", icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { title: "Reports", description: "Export & SLA", href: "/crm/reports", icon: FileText, color: "text-rose-400", bg: "bg-rose-500/10" },
  { title: "Targets", description: "Goals & leaderboard", href: "/crm/targets", icon: Target, color: "text-gold", bg: "bg-gold/10" },
  { title: "Settings", description: "Rules & SLA", href: "/crm/settings/scoring-rules", icon: Settings, color: "text-slate-400", bg: "bg-slate-500/10" },
] as const;

export default function CrmHubPage() {
  const { data: leadStats, isLoading: statsLoading } = useLeadStats();
  const { data: dealsResult, isLoading: dealsLoading } = useDeals({ limit: 500 });
  const allDeals = dealsResult?.data ?? [];
  const { data: contactsData, isLoading: contactsLoading } = useContacts({ limit: 1 });
  const { data: orgsData, isLoading: orgsLoading } = useCrmOrganizations({ limit: 1 });

  const isLoading = statsLoading || dealsLoading || contactsLoading || orgsLoading;

  const dealStats = useMemo(() => {
    if (!allDeals) return { active: 0, pipelineValue: 0, wonValue: 0 };
    const active = allDeals.filter(d => d.stage !== "WON" && d.stage !== "LOST");
    return {
      active: active.length,
      pipelineValue: active.reduce((s, d) => s + Number(d.value || 0), 0),
      wonValue: allDeals.filter(d => d.stage === "WON").reduce((s, d) => s + Number(d.value || 0), 0),
    };
  }, [allDeals]);

  if (isLoading) {
    return (
      <PageWrapper title="CRM" subtitle="Command center">
        <div className="space-y-4 pb-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-4 flex-wrap px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-24" />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3 flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="CRM" subtitle="Command center">
      <motion.div className="space-y-4 pb-4" variants={staggerContainer} initial="hidden" animate="visible">

        <motion.div variants={fadeUp} className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Total Leads", value: leadStats?.total ?? 0, color: "text-blue-400" },
            { label: "Active Deals", value: dealStats.active, color: "text-emerald-400" },
            { label: "Pipeline Value", value: formatINRCompact(dealStats.pipelineValue), color: "text-gold" },
            { label: "Conversion", value: `${leadStats?.conversionRate ?? 0}%`, color: "text-amber-400" },
          ].map((s) => (
            <Card key={s.label} className="shadow-sm">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
                <p className={cn("text-xl font-bold tabular-nums mt-0.5", s.color)}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {leadStats && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-4 flex-wrap text-[11px] px-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-muted-foreground">Unassigned</span>
                <span className="font-bold text-red-400">{leadStats.unassigned}</span>
              </div>
              <div><span className="text-muted-foreground">New/Mo</span> <span className="font-bold ml-1">{leadStats.thisMonth}</span></div>
              <div><span className="text-muted-foreground">Pipeline</span> <span className="font-bold text-gold ml-1">{formatINRCompact(leadStats.totalPotentialValue)}</span></div>
              <div><span className="text-muted-foreground">Won</span> <span className="font-bold text-emerald-400 ml-1">{formatINRCompact(dealStats.wonValue)}</span></div>
              <div><span className="text-muted-foreground">Contacts</span> <span className="font-bold ml-1">{contactsData?.total ?? 0}</span></div>
              <div><span className="text-muted-foreground">Orgs</span> <span className="font-bold ml-1">{orgsData?.totalCount ?? 0}</span></div>
            </div>
          </motion.div>
        )}

        {leadStats && (
          <motion.div variants={fadeUp} className="grid gap-3 md:grid-cols-2">
            <CrmPipelineMini byStatus={leadStats.byStatus} total={leadStats.total} />
            <CrmRecentActivity deals={allDeals ?? []} />
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="grid gap-2 grid-cols-2 md:grid-cols-4">
          {NAV_CARDS.map(card => (
            <Link key={card.href} href={card.href}>
              <Card className="shadow-sm hover:shadow-md transition-all hover:border-gold/40 cursor-pointer group h-full">
                <CardContent className="p-3 flex items-center gap-2.5">
                  <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", card.bg)}>
                    <card.icon className={cn("h-4 w-4", card.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      {card.title}
                      <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-gold" />
                    </p>
                    <CardDescription className="text-[10px] truncate">{card.description}</CardDescription>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
