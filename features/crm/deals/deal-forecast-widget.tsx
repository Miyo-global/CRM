"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatINRCompact } from "@/lib/format-utils";
import { TrendingUp, Target } from "lucide-react";
import type { DealStage } from "@/features/crm/shared/constants";

const STAGE_PROBABILITIES: Record<DealStage, number> = {
  LEAD: 10,
  CONTACTED: 25,
  PROPOSAL: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

interface Deal {
  id: number;
  stage: string;
  value: string | null;
  probability: number | null;
  expectedCloseDate: string | null;
}

interface DealForecastWidgetProps {
  deals: Deal[];
}

export function DealForecastWidget({ deals }: DealForecastWidgetProps) {
  const { thisMonthStart, thisMonthEnd } = useMemo(() => {
    const now = new Date();
    return {
      thisMonthStart: new Date(now.getFullYear(), now.getMonth(), 1),
      thisMonthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }, []);

  const { weightedTotal, stageBreakdown, monthlyForecast, maxWeighted } = useMemo(() => {
    const activeDeals = deals.filter((d) => d.stage !== "LOST");

    let total = 0;
    let monthlyForecast = 0;

    const stageMap: Record<string, { raw: number; weighted: number; count: number }> = {};

    for (const deal of activeDeals) {
      const raw = Number(deal.value ?? 0);
      const prob = (deal.probability != null && deal.probability > 0)
        ? deal.probability
        : (STAGE_PROBABILITIES[deal.stage as DealStage] ?? 0);
      const weighted = raw * (prob / 100);

      total += weighted;

      if (!stageMap[deal.stage]) stageMap[deal.stage] = { raw: 0, weighted: 0, count: 0 };
      stageMap[deal.stage]!.raw += raw;
      stageMap[deal.stage]!.weighted += weighted;
      stageMap[deal.stage]!.count++;

      if (deal.expectedCloseDate) {
        const closeDate = new Date(deal.expectedCloseDate);
        if (closeDate >= thisMonthStart && closeDate <= thisMonthEnd) {
          monthlyForecast += weighted;
        }
      }
    }

    const stageBreakdown = Object.entries(stageMap)
      .map(([stage, data]) => ({
        stage: stage as DealStage,
        probability: STAGE_PROBABILITIES[stage as DealStage] ?? 0,
        ...data,
      }))
      .sort((a, b) => {
        const order: DealStage[] = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON"];
        return order.indexOf(a.stage) - order.indexOf(b.stage);
      });

    const maxWeighted = Math.max(...stageBreakdown.map((s) => s.weighted), 1);

    return { weightedTotal: total, stageBreakdown, monthlyForecast, maxWeighted };
  }, [deals, thisMonthStart, thisMonthEnd]);

  const STAGE_LABELS: Partial<Record<DealStage, string>> = {
    LEAD: "Lead",
    CONTACTED: "Contacted",
    PROPOSAL: "Proposal",
    NEGOTIATION: "Negotiation",
    WON: "Won",
  };

  const STAGE_COLORS: Partial<Record<DealStage, string>> = {
    LEAD: "bg-blue-500",
    CONTACTED: "bg-sky-500",
    PROPOSAL: "bg-amber-500",
    NEGOTIATION: "bg-purple-500",
    WON: "bg-emerald-500",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            Stage Probability View
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Weighted pipeline: <span className="font-semibold text-foreground">{formatINRCompact(weightedTotal)}</span>
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {stageBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No active deals.</p>
          ) : (
            stageBreakdown.map((s) => (
              <div key={s.stage}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[s.stage] ?? "bg-muted"}`} />
                    <span className="font-medium">{STAGE_LABELS[s.stage] ?? s.stage}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{s.probability}%</Badge>
                    <span className="text-muted-foreground">{s.count} deal{s.count !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="font-medium tabular-nums">{formatINRCompact(s.weighted)}</span>
                </div>
                <Progress value={(s.weighted / maxWeighted) * 100} className="h-1.5" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            Monthly Forecast
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-end gap-2 mb-4">
            <span className="text-3xl font-bold text-foreground">
              {formatINRCompact(monthlyForecast)}
            </span>
            <span className="text-xs text-muted-foreground pb-1">weighted expected</span>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Deals closing this month</span>
              <span className="font-medium text-foreground">
                {deals.filter((d) => {
                  if (!d.expectedCloseDate || d.stage === "LOST") return false;
                  const c = new Date(d.expectedCloseDate);
                  return c >= thisMonthStart && c <= thisMonthEnd;
                }).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total weighted pipeline</span>
              <span className="font-medium text-foreground">{formatINRCompact(weightedTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Win rate (weighted/raw)</span>
              <span className="font-medium text-foreground">
                {deals.filter((d) => d.stage !== "LOST").reduce((s, d) => s + Number(d.value ?? 0), 0) > 0
                  ? `${Math.round((weightedTotal / deals.filter((d) => d.stage !== "LOST").reduce((s, d) => s + Number(d.value ?? 0), 0)) * 100)}%`
                  : ""}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/40 border">
            <p className="text-[10px] text-muted-foreground">
              Weighted values use deal probability if set, otherwise stage defaults:
              Lead 10% · Contacted 25% · Proposal 50% · Negotiation 75% · Won 100%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
