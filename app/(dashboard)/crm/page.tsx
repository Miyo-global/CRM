"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, Building2, BarChart3, Target, ArrowRight, UserPlus, Settings,
  IndianRupee, Percent, FileText, Briefcase, Activity, GitBranch,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatsStrip } from "@/components/shared/stats-strip";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import type { Tone } from "@/lib/design/tones";
import { fadeUp, staggerContainer } from "@/lib/motion-variants";
import { formatINRCompact } from "@/lib/format-utils";
import { useLeadStats } from "@/lib/api/hooks/leads";
import { useAllDeals } from "@/lib/api/hooks/crm";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useContacts, useCrmOrganizations } from "@/lib/api/hooks/crm";
import { CrmPipelineMini } from "@/features/crm/shared/crm-pipeline-mini";
import { CrmRecentActivity } from "@/features/crm/shared/crm-recent-activity";

const NAV_CARDS: { title: string; description: string; href: string; icon: typeof Users; tone: Tone }[] = [
  { title: "Leads", description: "Pipeline tracking", href: "/crm/leads", icon: UserPlus, tone: "info" },
  { title: "Deals", description: "Proposal to close", href: "/crm/deals", icon: Briefcase, tone: "success" },
  { title: "Contacts", description: "People directory", href: "/crm/contacts", icon: Users, tone: "plum" },
  { title: "Clients", description: "Account management", href: "/crm/clients", icon: Building2, tone: "warning" },
  { title: "Analytics", description: "Charts & metrics", href: "/crm/analytics", icon: BarChart3, tone: "teal" },
  { title: "Reports", description: "Export & SLA", href: "/crm/reports", icon: FileText, tone: "danger" },
  { title: "Targets", description: "Goals & leaderboard", href: "/crm/targets", icon: Target, tone: "brand" },
  { title: "Settings", description: "Rules & SLA", href: "/crm/settings/scoring-rules", icon: Settings, tone: "neutral" },
];

const SUBTITLE = "Command center";

export default function CrmHubPage() {
  const { data: leadStats, isLoading: statsLoading } = useLeadStats();
  const { data: allDeals = [], isLoading: dealsLoading, isError: dealsError, error: dealsErr, refetch: refetchDeals } = useAllDeals();
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

  if (!isLoading && dealsError) {
    return (
      <PageWrapper title="CRM" subtitle={SUBTITLE}>
        <QueryErrorState title="Couldn't load deals" error={dealsErr} onRetry={() => refetchDeals()} />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="CRM" subtitle={SUBTITLE}>
        <div className="grid grid-cols-12 gap-4 xl:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="col-span-12 h-32 sm:col-span-6 xl:col-span-3" />
          ))}
          <Skeleton className="col-span-12 h-20" />
          <Skeleton className="col-span-12 h-72 lg:col-span-7" />
          <Skeleton className="col-span-12 h-72 lg:col-span-5" />
          <Skeleton className="col-span-12 h-40" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="CRM" subtitle={SUBTITLE}>
      <motion.div className="grid grid-cols-12 gap-4 xl:gap-6" variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { label: "Total Leads", value: leadStats?.total ?? 0, icon: UserPlus, tone: "info" as const, href: "/crm/leads" },
          { label: "Active Deals", value: dealStats.active, icon: Briefcase, tone: "success" as const, href: "/crm/deals" },
          { label: "Pipeline Value", value: formatINRCompact(dealStats.pipelineValue), icon: IndianRupee, tone: "brand" as const },
          { label: "Conversion", value: `${leadStats?.conversionRate ?? 0}%`, icon: Percent, tone: "warning" as const },
        ].map((s, i) => (
          <motion.div key={s.label} variants={fadeUp} className="col-span-12 sm:col-span-6 xl:col-span-3">
            <StatCard label={s.label} value={s.value} icon={s.icon} tone={s.tone} href={s.href} index={i} className="h-full" />
          </motion.div>
        ))}

        {leadStats && (
          <motion.div variants={fadeUp} className="col-span-12">
            <StatsStrip
              items={[
                { label: "Unassigned", value: leadStats.unassigned, tone: leadStats.unassigned > 0 ? "danger" : undefined },
                { label: "New/Mo", value: leadStats.thisMonth },
                { label: "Pipeline", value: formatINRCompact(leadStats.totalPotentialValue), tone: "brand" },
                { label: "Won", value: formatINRCompact(dealStats.wonValue), tone: "success" },
                { label: "Contacts", value: contactsData?.total ?? 0 },
                { label: "Orgs", value: orgsData?.totalCount ?? 0 },
              ]}
            />
          </motion.div>
        )}

        {leadStats && (
          <>
            <motion.div variants={fadeUp} className="col-span-12 lg:col-span-7">
              <WidgetCard title="Pipeline Funnel" icon={GitBranch} count={leadStats.total} viewAllHref="/crm/leads">
                <CrmPipelineMini byStatus={leadStats.byStatus} total={leadStats.total} />
              </WidgetCard>
            </motion.div>
            <motion.div variants={fadeUp} className="col-span-12 lg:col-span-5">
              <WidgetCard title="Recent Activity" icon={Activity} tone="info" viewAllHref="/crm/deals">
                <CrmRecentActivity deals={allDeals ?? []} />
              </WidgetCard>
            </motion.div>
          </>
        )}

        <motion.nav variants={fadeUp} aria-label="CRM modules" className="col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {NAV_CARDS.map(card => (
            <Link key={card.href} href={card.href} className="group block rounded-lg outline-none focus-visible:focus-ring">
              <Card interactive className="h-full flex-row items-center gap-3 p-4">
                <IconChip icon={card.icon} tone={card.tone} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    {card.title}
                    <ArrowRight className="size-3.5 -translate-x-1 text-brand-text opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{card.description}</p>
                </div>
              </Card>
            </Link>
          ))}
        </motion.nav>
      </motion.div>
    </PageWrapper>
  );
}
