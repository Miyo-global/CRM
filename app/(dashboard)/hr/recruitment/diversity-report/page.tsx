"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MapPin, Globe, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { AnalyticsChartCard } from "@/components/charts/analytics-chart-card";
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP_STYLE } from "@/lib/design/chart-styles";
import { CHART_VARS, toneVar } from "@/lib/design/tones";

interface DiversityReport {
  total: number;
  genderBreakdown: { gender: string; count: number }[];
  locationBreakdown: { location: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  stageBreakdown: { stage: string; count: number }[];
}

function useDiversityReport() {
  return useQuery<DiversityReport>({
    queryKey: ["hr", "diversityReport"],
    queryFn: () => apiClient.get<DiversityReport>("/hr/recruitment/diversity-report"),
    staleTime: 5 * 60 * 1000,
  });
}

const GENDER_COLORS: Record<string, string> = {
  MALE: toneVar.info,
  FEMALE: toneVar.plum,
  OTHER: toneVar.plum,
  PREFER_NOT_TO_SAY: toneVar.neutral,
  Unknown: "var(--ink-200)",
};

interface BreakdownItem {
  label: string;
  count: number;
}

function BreakdownCard({
  title,
  filename,
  items,
  total,
  color,
  colorFn,
  empty,
}: {
  title: string;
  filename: string;
  items: BreakdownItem[];
  total: number;
  color: string;
  colorFn?: (label: string) => string;
  empty?: { icon: LucideIcon; title: string; description: string };
}) {
  const rows = items.map((item) => ({
    label: item.label,
    count: item.count,
    percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }));
  const height = Math.max(200, rows.length * 36 + 24);
  const summary = rows.map((r) => `${r.label}: ${r.count} (${r.percent}%)`).join(", ");

  return (
    <AnalyticsChartCard
      title={title}
      data={rows}
      filename={filename}
      ariaLabel={summary ? `${title}: ${summary}` : title}
      bodyClassName="min-h-0"
    >
      {rows.length === 0 && empty ? (
        <EmptyState
          compact
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          className="border-0 bg-transparent"
        />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid {...CHART_GRID} horizontal={false} vertical />
            <XAxis type="number" allowDecimals={false} {...CHART_AXIS} />
            <YAxis type="category" dataKey="label" width={120} {...CHART_AXIS} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              cursor={{ fill: "var(--muted)" }}
              formatter={(value, _name, entry) => [
                `${value} (${(entry?.payload as { percent?: number } | undefined)?.percent ?? 0}%)`,
                "Applicants",
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28} fill={color}>
              {colorFn && rows.map((r) => <Cell key={r.label} fill={colorFn(r.label)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartCard>
  );
}

export default function DiversityReportPage() {
  const { data, isLoading, isError, error, refetch } = useDiversityReport();

  return (
    <PageWrapper
      title="Diversity Report"
      subtitle="Anonymized applicant pool demographics"
      actions={<PageBackButton fallback="/hr/recruitment" showIcon />}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-60 w-full" /></CardContent></Card>
            ))}
          </div>
        </div>
      ) : isError || !data ? (
        <QueryErrorState title="Failed to load report data." error={error} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-4">
          <StatsStrip
            items={[
              { label: "Total Applicants", value: data.total, icon: Users },
              { label: "Gender Categories", value: data.genderBreakdown.length, icon: Users },
              { label: "Locations", value: data.locationBreakdown.length, icon: MapPin },
              { label: "Sources", value: data.sourceBreakdown.length, icon: Globe },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              title="Gender Distribution"
              filename="diversity-gender"
              items={data.genderBreakdown.map((g) => ({ label: g.gender, count: g.count }))}
              total={data.total}
              color={toneVar.neutral}
              colorFn={(label) => GENDER_COLORS[label] ?? toneVar.neutral}
              empty={{
                icon: Users,
                title: "No gender data recorded yet",
                description: "Gender breakdown will appear once applicants share it.",
              }}
            />
            <BreakdownCard
              title="Location Distribution"
              filename="diversity-location"
              items={data.locationBreakdown.map((l) => ({ label: l.location, count: l.count }))}
              total={data.total}
              color={CHART_VARS[0]}
              empty={{
                icon: MapPin,
                title: "No location data recorded yet",
                description: "Applicant locations will appear here once available.",
              }}
            />
            <BreakdownCard
              title="Source Breakdown"
              filename="diversity-source"
              items={data.sourceBreakdown.map((s) => ({ label: s.source, count: s.count }))}
              total={data.total}
              color={CHART_VARS[1]}
            />
            <BreakdownCard
              title="Pipeline Stage Distribution"
              filename="diversity-stage"
              items={data.stageBreakdown.map((s) => ({ label: s.stage, count: s.count }))}
              total={data.total}
              color={CHART_VARS[2]}
            />
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
