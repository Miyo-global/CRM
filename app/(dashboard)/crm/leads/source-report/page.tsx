"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Target, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLeadSourceReport } from "@/lib/api/hooks/crm";
import { formatINRCompact } from "@/lib/format-utils";

const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral",
  campaign: "Campaign",
  cold_call: "Cold Call",
  website: "Website",
  social_media: "Social Media",
  walk_in: "Walk-in",
  other: "Other",
};

const SOURCE_COLORS = [
  { bar: "bg-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { bar: "bg-amber-500", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { bar: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { bar: "bg-purple-500", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { bar: "bg-rose-500", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  { bar: "bg-cyan-500", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { bar: "bg-slate-500", badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
];

export default function LeadSourceReportPage() {
  const { data, isLoading } = useLeadSourceReport();

  const maxCount = useMemo(
    () => Math.max(1, ...(data?.sources.map((s) => s.count) ?? [])),
    [data]
  );

  const topSource = useMemo(
    () => data?.sources[0],
    [data]
  );

  const bestConversionSource = useMemo(() => {
    if (!data?.sources.length) return null;
    return [...data.sources].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  }, [data]);

  const totalConverted = useMemo(
    () => data?.sources.reduce((sum, s) => sum + s.converted, 0) ?? 0,
    [data]
  );

  if (isLoading) {
    return (
      <PageWrapper title="Lead Source Report" subtitle="Attribution analysis across all lead sources">
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Lead Source Report"
      subtitle="Attribution analysis across all lead sources"
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Total Leads"
            value={data?.total ?? 0}
            color="blue"
            icon={Users}
          />
          <StatCard
            label="Sources Tracked"
            value={data?.sources.length ?? 0}
            color="gold"
            icon={BarChart3}
          />
          <StatCard
            label="Total Converted"
            value={totalConverted}
            color="green"
            icon={TrendingUp}
          />
          <StatCard
            label="Best Conversion"
            value={bestConversionSource ? `${bestConversionSource.conversionRate}% — ${SOURCE_LABELS[bestConversionSource.source] ?? bestConversionSource.source}` : ""}
            color="purple"
            icon={Target}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gold" />
                Source Attribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.sources || data.sources.length === 0) ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                  No lead source data available
                </div>
              ) : (
                <div className="space-y-5">
                  {data.sources.map((s, i) => {
                    const color = SOURCE_COLORS[i % SOURCE_COLORS.length];
                    const label = SOURCE_LABELS[s.source] ?? s.source;
                    const barPct = (s.count / maxCount) * 100;

                    return (
                      <motion.div
                        key={s.source}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-xs font-medium border", color.badge)}
                            >
                              {label}
                            </Badge>
                            {topSource?.source === s.source && (
                              <Badge variant="secondary" className="text-[10px]">Top</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-semibold tabular-nums">{s.count}</div>
                              <div className="text-[10px] text-muted-foreground">leads</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold tabular-nums text-emerald-400">{s.converted}</div>
                              <div className="text-[10px] text-muted-foreground">converted</div>
                            </div>
                            <div className="text-center">
                              <div className={cn(
                                "font-semibold tabular-nums",
                                s.conversionRate >= 30 ? "text-emerald-400" :
                                s.conversionRate >= 15 ? "text-amber-400" : "text-muted-foreground"
                              )}>
                                {s.conversionRate}%
                              </div>
                              <div className="text-[10px] text-muted-foreground">rate</div>
                            </div>
                            <div className="text-center hidden sm:block">
                              <div className="font-semibold tabular-nums text-xs">
                                <DollarSign className="h-3 w-3 inline mr-0.5 text-gold" />
                                {formatINRCompact(s.totalValue)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">value</div>
                            </div>
                          </div>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={cn("h-full rounded-full", color.bar)}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.7, delay: i * 0.05 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {data && data.sources.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Conversion Rate by Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="min-w-[400px]">
                    <div className="flex items-end gap-3 h-36">
                      {[...data.sources]
                        .sort((a, b) => b.conversionRate - a.conversionRate)
                        .map((s, i) => {
                          const color = SOURCE_COLORS[
                            data.sources.findIndex((x) => x.source === s.source) % SOURCE_COLORS.length
                          ];
                          const barH = Math.max(8, (s.conversionRate / 100) * 128);
                          const label = SOURCE_LABELS[s.source] ?? s.source;
                          return (
                            <div key={s.source} className="flex flex-col items-center gap-1 flex-1">
                              <span className="text-xs font-semibold text-muted-foreground">
                                {s.conversionRate}%
                              </span>
                              <motion.div
                                className={cn("w-full rounded-t-md", color.bar)}
                                style={{ height: `${barH}px` }}
                                initial={{ height: 0 }}
                                animate={{ height: `${barH}px` }}
                                transition={{ duration: 0.6, delay: i * 0.08 }}
                              />
                              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                                {label}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
