"use client";

import { useCrmPageAnalytics } from "@/lib/api/hooks/marketing";


interface AnalyticsPanelProps {
  pageId: number;
}

export function AnalyticsPanel({ pageId }: AnalyticsPanelProps) {
  const { data, isLoading } = useCrmPageAnalytics(pageId, 30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary, dailyViews, deviceBreakdown, utmSourceBreakdown } = data;
  const maxViews = Math.max(...dailyViews.map((d) => d.views), 1);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold">{summary.totalViews.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Views</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold">{summary.totalLeads.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Leads Generated</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.conversionRate}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Conversion Rate</p>
        </div>
      </div>

      {/* Daily views chart */}
      {dailyViews.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Daily Views (30 days)</p>
          <div className="flex items-end gap-0.5 h-20 bg-muted/30 rounded-md p-2">
            {dailyViews.slice(-30).map((d) => {
              const pct = Math.round((d.views / maxViews) * 100);
              return (
                <div
                  key={d.date}
                  className="flex-1 rounded-sm bg-primary/70 hover:bg-primary transition-colors cursor-default"
                  style={{ height: `${Math.max(pct, 3)}%` }}
                  title={`${d.date}: ${d.views} views`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Device breakdown */}
      {deviceBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Device Breakdown</p>
          <div className="space-y-2">
            {deviceBreakdown.map((d) => {
              const total = deviceBreakdown.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{d.type}</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UTM source breakdown */}
      {utmSourceBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Lead Sources</p>
          <div className="space-y-1.5">
            {utmSourceBreakdown.slice(0, 8).map((r) => {
              const total = utmSourceBreakdown.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <div key={r.source} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate text-muted-foreground capitalize">{r.source}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-gold"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dailyViews.length === 0 && deviceBreakdown.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No analytics data yet — publish the page to start tracking visits.
        </p>
      )}
    </div>
  );
}
