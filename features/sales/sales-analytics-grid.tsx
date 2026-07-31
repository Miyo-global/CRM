"use client";

import { Zap, CalendarClock, UserX, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-utils";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import {
  useDealVelocity,
  useAgingDeals,
  useSalesCycleLength,
  useLostDealAnalysis,
} from "@/lib/hooks/trpc-hooks";

interface SalesAnalyticsGridProps {
  dateRange: { from?: string; to?: string };
  repId: number | undefined;
}

function DealVelocityCard({ dateRange }: { dateRange: { from?: string; to?: string } }) {
  const { data } = useDealVelocity(dateRange);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-amber-500" />
          Deal Velocity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data?.dealCount === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No closed deals in this period.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Avg Days to Close</p>
              <p className="text-2xl font-bold tabular-nums mt-0.5">{data?.avgDaysToClose ?? ""}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Median Days to Close</p>
              <p className="text-2xl font-bold tabular-nums mt-0.5">{data?.medianDaysToClose ?? ""}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Fastest Close</p>
              <p className="text-xl font-semibold tabular-nums mt-0.5 text-green-600 dark:text-green-400">
                {data?.fastestCloseDays ?? ""}d
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Slowest Close</p>
              <p className="text-xl font-semibold tabular-nums mt-0.5 text-red-600 dark:text-red-400">
                {data?.slowestCloseDays ?? ""}d
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SalesCycleLengthCard({ repId }: { repId: number | undefined }) {
  const { data } = useSalesCycleLength(repId !== undefined ? String(repId) : undefined);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-primary" />
          Sales Cycle Length
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.totalDeals === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No closed deals yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Avg Close</p>
                <p className="text-xl font-semibold tabular-nums mt-0.5">{data.avgDays ?? ""}d</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Median</p>
                <p className="text-xl font-semibold tabular-nums mt-0.5">{data.medianDays ?? ""}d</p>
              </div>
            </div>
            <div className="space-y-2">
              {data.histogram.map((b) => {
                const maxCount = Math.max(...data.histogram.map((x) => x.count), 1);
                return (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">{b.label}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded transition-all"
                        style={{ width: `${(b.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-6 text-right shrink-0">{b.count}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{data.totalDeals} won deals analysed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LostDealAnalysisCard({ repId }: { repId: number | undefined }) {
  const { data } = useLostDealAnalysis(repId !== undefined ? String(repId) : undefined);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserX className="h-4 w-4 text-destructive" />
          Lost Deal Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No lost deals.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{data.total}</strong> lost deals</span>
              <span><strong className="text-foreground">{formatCurrency(data.totalValue)}</strong> lost value</span>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {data.reasons.map((r) => (
                <div key={r.reason} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="truncate text-muted-foreground max-w-[180px]">{r.reason}</span>
                    <span className="font-medium tabular-nums shrink-0">{r.count} ({r.pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-destructive/60 rounded" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgingDealsCard() {
  const { data } = useAgingDeals(14);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-destructive" />
          Stagnant Deals
          <span className="ml-auto text-xs font-normal text-muted-foreground">Stagnant &gt;14 days</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No stagnant deals.</p>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {data?.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded border border-destructive/20 bg-destructive/5 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium leading-tight">{deal.companyName}</p>
                  <p className="text-xs text-muted-foreground">{deal.stage}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-destructive">{deal.daysSinceUpdate}d stagnant</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(deal.value)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SalesAnalyticsGrid({ dateRange, repId }: SalesAnalyticsGridProps) {
  return (
    <motion.div className="grid gap-4 lg:grid-cols-2" variants={fadeUp}>
      <DealVelocityCard dateRange={dateRange} />
      <SalesCycleLengthCard repId={repId} />
      <LostDealAnalysisCard repId={repId} />
      <AgingDealsCard />
    </motion.div>
  );
}
