"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatsStrip } from "@/components/shared/stats-strip";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TAG_TONE_CYCLE, toneBar, toneSoft } from "@/lib/design/tones";
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

const SOURCE_COLORS = TAG_TONE_CYCLE.map((t) => ({
  bar: toneBar[t],
  badge: `${toneSoft[t]} border-transparent`,
}));

export default function LeadSourceReportPage() {
  const { data, isLoading, isError, error, refetch } = useLeadSourceReport();

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
          <Skeleton className="h-20" />
          <Skeleton className="h-80" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Lead Source Report" subtitle="Attribution analysis across all lead sources">
        <QueryErrorState title="Couldn't load the source report" error={error} onRetry={() => refetch()} />
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
        <motion.div variants={fadeUp}>
          <StatsStrip
            items={[
              { label: "Total Leads", value: data?.total ?? 0, icon: Users },
              { label: "Sources Tracked", value: data?.sources.length ?? 0, icon: BarChart3 },
              { label: "Total Converted", value: totalConverted, icon: TrendingUp, tone: "success" },
              {
                label: "Best Conversion",
                value: bestConversionSource ? `${bestConversionSource.conversionRate}%` : "—",
                hint: bestConversionSource ? SOURCE_LABELS[bestConversionSource.source] ?? bestConversionSource.source : undefined,
                icon: Target,
              },
            ]}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-sans text-sm font-semibold">
                <IconChip icon={BarChart3} size="sm" />
                Source Attribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.sources || data.sources.length === 0) ? (
                <EmptyState compact illustration={<EmptySearchIllustration />} title="No lead source data available" className="border-0 bg-transparent" />
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
                            <Badge className={color.badge}>{label}</Badge>
                            {topSource?.source === s.source && (
                              <Badge variant="solid">Top</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-semibold tabular-nums">{s.count}</div>
                              <div className="text-2xs text-muted-foreground">leads</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold tabular-nums text-success-strong">{s.converted}</div>
                              <div className="text-2xs text-muted-foreground">converted</div>
                            </div>
                            <div className="text-center">
                              <div className={cn(
                                "font-semibold tabular-nums",
                                s.conversionRate >= 30 ? "text-success-strong" :
                                s.conversionRate >= 15 ? "text-warning-strong" : "text-muted-foreground"
                              )}>
                                {s.conversionRate}%
                              </div>
                              <div className="text-2xs text-muted-foreground">rate</div>
                            </div>
                            <div className="text-center hidden sm:block">
                              <div className="font-semibold tabular-nums text-xs">
                                                                {formatINRCompact(s.totalValue)}
                              </div>
                              <div className="text-2xs text-muted-foreground">value</div>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-sans text-sm font-semibold">
                  <IconChip icon={TrendingUp} tone="success" size="sm" />
                  Conversion Rate by Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="min-w-[400px]">
                    <div role="img" aria-label="Conversion rate by source" className="flex h-36 items-end gap-3">
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
                              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                                {s.conversionRate}%
                              </span>
                              <motion.div
                                className={cn("w-full max-w-7 rounded-t-sm", color.bar)}
                                style={{ height: `${barH}px` }}
                                initial={{ height: 0 }}
                                animate={{ height: `${barH}px` }}
                                transition={{ duration: 0.6, delay: i * 0.08 }}
                              />
                              <span className="text-2xs text-muted-foreground text-center leading-tight">
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
