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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useSalesCohort } from "@/lib/api/hooks/crm";
import { Users } from "lucide-react";

export default function CohortAnalysisPage() {
  const [months, setMonths] = useState(6);
  const { data: cohort, isLoading } = useSalesCohort(months);

  const chartData = cohort?.map((row) => ({
    month: row.cohortMonth,
    Created: row.created,
    Converted: row.converted,
    "Conv. %": row.conversionRate,
    "Avg Days": row.avgDaysToConvert ?? 0,
  })) ?? [];

  const avgConvRate = cohort
    ? Math.round(cohort.reduce((s, r) => s + r.conversionRate, 0) / Math.max(cohort.length, 1))
    : 0;

  return (
    <PageWrapper
      title="Cohort Analysis"
      subtitle="Track how many leads created each month ultimately converted, and how long it took"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Avg conversion rate: <strong>{avgConvRate}%</strong></span>
        </div>
        <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="9">Last 9 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-52" />
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Leads Created vs Converted by Cohort</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Created" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Converted" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conversion Rate % Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line
                    type="monotone"
                    dataKey="Conv. %"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cohort Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">Cohort</th>
                      <th className="text-right py-2 font-medium">Created</th>
                      <th className="text-right py-2 font-medium">Converted</th>
                      <th className="text-right py-2 font-medium">Conv. Rate</th>
                      <th className="text-right py-2 font-medium">Avg Days to Convert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohort?.map((row) => (
                      <tr key={row.cohortMonth} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs">{row.cohortMonth}</td>
                        <td className="py-2 text-right">{row.created}</td>
                        <td className="py-2 text-right text-green-600 font-medium">{row.converted}</td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={row.conversionRate >= 20 ? "default" : row.conversionRate >= 10 ? "secondary" : "outline"}
                            className="text-[10px]"
                          >
                            {row.conversionRate}%
                          </Badge>
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {row.avgDaysToConvert ? `${row.avgDaysToConvert}d` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </PageWrapper>
  );
}
