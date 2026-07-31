"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useRepComparison, useSalesDashboardLeaderboard } from "@/lib/api/hooks/crm";
import { GitCompare } from "lucide-react";

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function StatPill({
  label,
  val1,
  val2,
  format: fmtFn = String,
  higherIsBetter = true,
}: {
  label: string;
  val1: number;
  val2: number;
  format?: (n: number) => string;
  higherIsBetter?: boolean;
}) {
  const winner = higherIsBetter ? (val1 >= val2 ? 1 : 2) : (val1 <= val2 ? 1 : 2);
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0 text-sm">
      <span
        className={`w-24 text-right font-medium ${winner === 1 ? "text-green-600" : "text-muted-foreground"}`}
      >
        {fmtFn(val1)}
      </span>
      <span className="text-xs text-muted-foreground flex-1 text-center">{label}</span>
      <span
        className={`w-24 text-left font-medium ${winner === 2 ? "text-green-600" : "text-muted-foreground"}`}
      >
        {fmtFn(val2)}
      </span>
    </div>
  );
}

export default function RepComparisonPage() {
  const [rep1, setRep1] = useState<string>("");
  const [rep2, setRep2] = useState<string>("");

  const { data: leaderboard, isLoading: lbLoading } = useSalesDashboardLeaderboard();
  const { data: comparison, isLoading: cmpLoading } = useRepComparison(
    rep1 ? Number(rep1) : null,
    rep2 ? Number(rep2) : null,
  );

  const reps = leaderboard ?? [];

  const monthlyData = comparison
    ? comparison.rep1.monthly.map((m, i) => ({
        month: m.month,
        [`${comparison.rep1.name} deals`]: m.dealsWon,
        [`${comparison.rep2.name} deals`]: comparison.rep2.monthly[i]?.dealsWon ?? 0,
        [`${comparison.rep1.name} rev`]: m.revenue,
        [`${comparison.rep2.name} rev`]: comparison.rep2.monthly[i]?.revenue ?? 0,
      }))
    : [];

  const rep1Name = comparison?.rep1.name ?? "Rep 1";
  const rep2Name = comparison?.rep2.name ?? "Rep 2";

  return (
    <PageWrapper
      title="Rep Comparison"
      subtitle="Overlay two sales reps' performance side by side"
    >
      <div className="flex items-center gap-3 mb-6">
        <Select value={rep1} onValueChange={setRep1}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Rep 1" />
          </SelectTrigger>
          <SelectContent>
            {reps.map((r) => (
              <SelectItem key={r.repId} value={String(r.repId)}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <GitCompare className="h-4 w-4 text-muted-foreground" />
        <Select value={rep2} onValueChange={setRep2}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Rep 2" />
          </SelectTrigger>
          <SelectContent>
            {reps.map((r) => (
              <SelectItem key={r.repId} value={String(r.repId)}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(!rep1 || !rep2) && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-muted-foreground">
          <GitCompare className="h-10 w-10 opacity-30" />
          <p>Select two reps to compare their performance</p>
        </div>
      )}

      {rep1 && rep2 && cmpLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-72" />
        </div>
      )}

      {comparison && (
        <>
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="text-blue-600 font-bold">{rep1Name}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="text-purple-600 font-bold">{rep2Name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatPill label="Deals Won" val1={comparison.rep1.dealsWon} val2={comparison.rep2.dealsWon} />
              <StatPill label="Revenue" val1={comparison.rep1.revenue} val2={comparison.rep2.revenue} format={fmt} />
              <StatPill label="Win Rate" val1={comparison.rep1.winRate} val2={comparison.rep2.winRate} format={(v) => `${v}%`} />
              <StatPill label="Avg Deal Size" val1={comparison.rep1.avgDealSize} val2={comparison.rep2.avgDealSize} format={fmt} />
              <StatPill label="Total Deals" val1={comparison.rep1.totalDeals} val2={comparison.rep2.totalDeals} />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Deals Won</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={`${rep1Name} deals`} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey={`${rep2Name} deals`} stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey={`${rep1Name} rev`} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey={`${rep2Name} rev`} fill="#a855f7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </PageWrapper>
  );
}
