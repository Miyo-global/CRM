"use client";

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
import { Input } from "@/components/ui/input";
import type {
  RetentionAnalyticsData,
  PerformanceAnalyticsData,
  ExecutiveKpisData,
  WorkforceTrendsData,
  AttendanceAnalyticsData,
  CompensationAnalyticsData,
  LeaveAnalyticsData,
  DiversityData,
} from "@/lib/api/hooks/hr/analytics-extended";
import { formatINRCompact } from "@/lib/format-utils";
import { toneVar, type Tone } from "@/lib/design/tones";
import { cn } from "@/lib/utils";
import { percentageSplit } from "@/lib/hr/percentage-split";
import { monthBars } from "@/lib/hr/month-bars";
import { EmptyState as UiEmptyState } from "@/components/ui/empty-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import {
  Users as IcoUsers, TrendingDown as IcoTrendDown, UserPlus as IcoUserPlus, Timer as IcoTimer,
  UserRound as IcoDiversity, Activity as IcoActivity, UserMinus as IcoUserMinus,
  Target as IcoTarget, ClipboardList as IcoClipboard, CalendarDays as IcoCalendar, IndianRupee as IcoCoin,
  TrendingUp as IcoTrendUp, Clock as IcoClock,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const GENDER_COLOR: Record<string, string> = {
  MALE: "bg-chart-3",
  FEMALE: "bg-chart-5",
  OTHER: "bg-ink-300",
  "NOT SPECIFIED": "bg-ink-300",
};

// ── Primitives ────────────────────────────────────────────────────────────────

function HBar({
  data,
  maxValue,
  showPct = false,
}: {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  showPct?: boolean;
}) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  // The bar width is a share of the largest bar; the percentage label is a
  // share of the total, apportioned so the labels add up to 100 (QA-0015).
  const shares = new Map(
    percentageSplit(data.map((d) => ({ label: d.label, count: d.value }))).map((d) => [d.label, d.pct]),
  );
  return (
    <div className="space-y-2">
      {data.map((item) => {
        const pct = Math.round((item.value / max) * 100);
        const sharePct = shares.get(item.label) ?? 0;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span
              className="w-24 shrink-0 truncate text-xs text-muted-foreground sm:w-28"
              title={item.label}
            >
              {item.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", item.color ?? "bg-chart-1")}
                style={{ width: `${Math.max(3, pct)}%` }}
              />
            </div>
            <div className="flex w-16 shrink-0 items-center justify-end gap-1.5">
              <span className="text-xs font-semibold tabular-nums">{item.value}</span>
              {showPct && (
                <span className="text-3xs text-muted-foreground">({sharePct}%)</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Vertical bar chart with a y-axis (0 and max) and a baseline. Every bar
 * column is full height so a bar's percentage height resolves; the hand-rolled
 * copies this replaces left the column at auto height, so bars drew 0px
 * (QA-BUG-02).
 */
export function VBars({
  data,
  height = 100,
  colorClass = "bg-chart-1",
  emptyMessage,
}: {
  data: { label: string; value: number }[];
  height?: number;
  colorClass?: string;
  /** Shown instead of the chart when every value is 0. */
  emptyMessage?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (emptyMessage && max === 0) return <EmptyState message={emptyMessage} />;
  const top = Math.max(max, 1);
  return (
    <div className="flex gap-1.5">
      <div
        className="flex flex-col justify-between text-right text-3xs tabular-nums leading-none text-muted-foreground"
        style={{ height }}
        aria-hidden="true"
      >
        <span>{top}</span>
        <span>0</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-end gap-0.5 border-b border-l border-border pt-3" style={{ height }}>
          {data.map((d, i) => {
            const pct = d.value > 0 ? Math.max(4, (d.value / top) * 100) : 0;
            return (
              <div key={`${d.label}-${i}`} className="relative flex h-full flex-1 items-end justify-center">
                {d.value > 0 && (
                  <span
                    className="absolute text-3xs font-medium tabular-nums leading-none text-muted-foreground"
                    style={{ bottom: `calc(${pct}% + 2px)` }}
                  >
                    {d.value}
                  </span>
                )}
                <div
                  className={cn("w-full max-w-7 rounded-t transition-[height] duration-500 motion-reduce:transition-none", colorClass)}
                  style={{ height: `${pct}%` }}
                  title={`${d.label}: ${d.value}`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-0.5">
          {data.map((d, i) => (
            <span key={`${d.label}-${i}`} className="flex-1 truncate text-center text-3xs leading-none text-muted-foreground">
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 py-1">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full rounded" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <UiEmptyState compact title={message} />
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function Mini({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "red" | "amber" | "blue" | "violet";
}) {
  const dot: Record<string, string> = {
    green: "bg-success-500",
    red: "bg-danger-500",
    amber: "bg-warning-500",
    blue: "bg-info-500",
    violet: "bg-plum-500",
  };
  return (
    <div className="rounded-lg border border-border bg-surface-sunken/40 p-4">
      <p className="mb-2 flex items-center gap-1.5 truncate text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        {accent && <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot[accent])} />}
        {label}
      </p>
      <p className="font-display text-2xl font-bold leading-tight tabular-nums">{value}</p>
      {sub && (
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? toneVar.success : pct >= 50 ? toneVar.warning : toneVar.danger;
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-muted"
      />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        className="transition-[stroke-dasharray] duration-500 motion-reduce:transition-none"
      />
      <text
        x="26"
        y="30"
        textAnchor="middle"
        fontWeight="700"
        fill="currentColor"
        className="text-3xs tabular-nums"
      >
        {pct}%
      </text>
    </svg>
  );
}

function CompletionTile({
  icon: Icon,
  label,
  pct,
  caption,
}: {
  icon: React.ElementType;
  label: string;
  pct: number | null;
  caption: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-sunken/40 p-4">
      <CompletionRing pct={pct ?? 0} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  children,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardHeader className="border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <CardTitle className="font-sans text-sm font-semibold">{title}</CardTitle>
          {badge && <div className="ml-auto">{badge}</div>}
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">{children}</CardContent>
    </Card>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

export interface FilterValues {
  from: string;
  to: string;
  department: string;
}

export function AnalyticsFilterBar({
  value,
  onChange,
  departments,
}: {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  departments: { id: number; name: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          From
        </label>
        <Input
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-8 w-36 tabular-nums"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          To
        </label>
        <Input
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-8 w-36 tabular-nums"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          Department
        </label>
        <Select
          value={value.department}
          onValueChange={(v) => onChange({ ...value, department: v })}
        >
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Executive KPI Strip ───────────────────────────────────────────────────────

export function ExecutiveKpiStrip({
  data,
  isLoading,
}: {
  data?: ExecutiveKpisData;
  isLoading: boolean;
}) {
  const orgScore = data?.orgHealthScore ?? 0;
  const healthTone: Tone = orgScore >= 70 ? "success" : orgScore >= 45 ? "warning" : "danger";
  const val = (v: React.ReactNode) => (isLoading ? <Skeleton className="h-7 w-14" /> : v);

  return (
    <StatsStrip
      items={[
        { label: "Total Headcount", icon: IcoUsers, value: val(data?.headcount != null ? String(data.headcount) : "—") },
        { label: "Attrition Rate", icon: IcoTrendDown, tone: "danger", value: val(data?.attritionRate != null ? `${data.attritionRate}%` : "—") },
        { label: "Hiring Rate", icon: IcoUserPlus, tone: "success", value: val(data?.hiringRate != null ? `${data.hiringRate}%` : "—") },
        { label: "Avg Tenure", icon: IcoTimer, value: val(data?.avgTenureMonths != null ? `${data.avgTenureMonths}mo` : "—") },
        { label: "Gender Diversity", icon: IcoDiversity, value: val(data?.diversityRatio != null ? `${data.diversityRatio}%` : "—") },
        { label: "Org Health Score", icon: IcoActivity, tone: data?.orgHealthScore != null ? healthTone : undefined, value: val(data?.orgHealthScore != null ? String(data.orgHealthScore) : "—") },
      ]}
    />
  );
}

// ── Retention Section ─────────────────────────────────────────────────────────

export function RetentionSection({
  data,
  isLoading,
}: {
  data?: RetentionAnalyticsData;
  isLoading: boolean;
}) {
  const maxTrend = Math.max(
    ...(data?.exitTrend ?? []).map((t) => t.voluntary + t.involuntary),
    1,
  );
  return (
    <SectionCard
      icon={IcoUserMinus}
      title="Attrition & retention analytics"
      tone="danger"
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : !data ? (
        <EmptyState message="No attrition data available" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini label="Attrition Rate" value={`${data.attritionRate}%`} accent="red" />
            <Mini
              label="Voluntary Exits"
              value={data.voluntaryExits}
              sub="resignations"
              accent="amber"
            />
            <Mini
              label="Involuntary Exits"
              value={data.involuntaryExits}
              sub="terminations"
              accent="red"
            />
            <Mini label="Total Exits" value={data.totalExits} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <SubLabel>Monthly Exit Trend</SubLabel>
              {data.exitTrend.length > 0 ? (
                <>
                  <div className="flex items-end gap-1 h-36">
                    {data.exitTrend.map((t) => {
                      const total = t.voluntary + t.involuntary;
                      const h = Math.max(6, (total / maxTrend) * 100);
                      const volPct =
                        total > 0 ? (t.voluntary / total) * 100 : 50;
                      return (
                        <div
                          key={t.month}
                          className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end"
                        >
                          {total > 0 && (
                            <span className="text-3xs tabular-nums text-muted-foreground">
                              {total}
                            </span>
                          )}
                          <div
                            className="flex w-full max-w-7 flex-col-reverse overflow-hidden rounded-t"
                            style={{ height: `${h}%` }}
                          >
                            <div
                              className="w-full bg-warning-500"
                              style={{ height: `${volPct}%` }}
                            />
                            <div className="w-full bg-danger-500 flex-1" />
                          </div>
                          <span className="text-3xs text-muted-foreground">
                            {t.month.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-5 mt-2.5 text-2xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="size-2 rounded-full bg-warning-500 inline-block" />
                      Voluntary
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="size-2 rounded-full bg-danger-500 inline-block" />
                      Involuntary
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No exits in this range
                </p>
              )}
            </div>
            <div>
              <SubLabel>Attrition by Department</SubLabel>
              {data.attritionByDept.length > 0 ? (
                <HBar
                  data={data.attritionByDept.map((d) => ({
                    label: d.department,
                    value: d.count,
                    color: "bg-danger-500",
                  }))}
                  showPct
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No exits by department
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Performance Section ───────────────────────────────────────────────────────

export function PerformanceSection({
  data,
  isLoading,
}: {
  data?: PerformanceAnalyticsData;
  isLoading: boolean;
}) {
  const hasAny =
    data &&
    (data.reviews ||
      data.appraisals ||
      data.goals ||
      data.ratingDistribution.length > 0);
  return (
    <SectionCard
      icon={IcoClipboard}
      title="Performance & training analytics"
      tone="success"
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : !hasAny ? (
        <EmptyState message="No performance data available" />
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-3">
            {data?.reviews && (
              <CompletionTile
                icon={IcoClipboard}
                label="Reviews"
                pct={data.reviews.completionRate}
                caption={`${data.reviews.completed} of ${data.reviews.total} completed`}
              />
            )}
            {data?.appraisals && (
              <CompletionTile
                icon={IcoTarget}
                label="Appraisals"
                pct={data.appraisals.completionRate}
                caption={`${data.appraisals.closed} of ${data.appraisals.total} closed`}
              />
            )}
            {data?.goals && (
              <CompletionTile
                icon={IcoTarget}
                label="Goals"
                pct={data.goals.completionRate}
                caption={`${data.goals.completed} of ${data.goals.total} completed`}
              />
            )}
          </div>
          {data && data.ratingDistribution.length > 0 && (
            <div>
              <SubLabel>Rating Distribution</SubLabel>
              <HBar
                data={data.ratingDistribution.map((r) => ({
                  label: r.band,
                  value: r.count,
                  color: "bg-success-500",
                }))}
                showPct
              />
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ── Workforce Trends Section ──────────────────────────────────────────────────

export function WorkforceTrendsSection({
  data,
  isLoading,
}: {
  data?: WorkforceTrendsData;
  isLoading: boolean;
}) {
  const monthly = data?.monthly ?? [];
  const maxVal = Math.max(...monthly.flatMap((m) => [m.joiners, m.exits]), 1);

  return (
    <SectionCard
      icon={IcoTrendUp}
      title="Workforce overview"
      tone="info"
      badge={
        data ? (
          <Badge variant="secondary" className="tabular-nums">
            {data.currentHeadcount} active
          </Badge>
        ) : undefined
      }
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : monthly.length === 0 ? (
        <EmptyState message="No joining or exit records in this range" />
      ) : (
        <div className="space-y-3">
          <div className="flex items-end gap-1 h-40">
            {monthly.map((m) => {
              const jH = Math.max(4, (m.joiners / maxVal) * 100);
              const eH = Math.max(4, (m.exits / maxVal) * 100);
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end"
                >
                  <div
                    className="w-full flex gap-px items-end"
                    style={{ height: "calc(100% - 16px)" }}
                  >
                    <div
                      className="flex-1 rounded-t bg-success-500"
                      style={{ height: `${jH}%` }}
                      title={`Joiners: ${m.joiners}`}
                    />
                    <div
                      className="flex-1 rounded-t bg-danger-500"
                      style={{ height: `${eH}%` }}
                      title={`Exits: ${m.exits}`}
                    />
                  </div>
                  <span className="text-3xs text-muted-foreground">
                    {m.month.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-5 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-success-500 inline-block" />
              Joiners
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-danger-500 inline-block" />
              Exits
            </span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Attendance Section ────────────────────────────────────────────────────────

export function AttendanceSection({
  data,
  isLoading,
  headcount,
}: {
  data?: AttendanceAnalyticsData;
  isLoading: boolean;
  headcount?: number;
}) {
  const daily = data?.daily ?? [];
  const workingDays = daily.length;
  const avgAttendance =
    workingDays > 0 && headcount && headcount > 0
      ? Math.round(
          (data!.totalAttendanceLogs / (workingDays * headcount)) * 100,
        )
      : null;

  return (
    <SectionCard
      icon={IcoCalendar}
      title="Attendance analytics"
      tone="info"
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : !data ? (
        <EmptyState message="No attendance data for this period" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Mini
              label="Total Check-ins"
              value={data.totalAttendanceLogs}
              accent="blue"
            />
            <Mini
              label="Working Days"
              value={workingDays}
              sub="days with records"
            />
            {avgAttendance != null && (
              <Mini
                label="Avg Attendance"
                value={`${avgAttendance}%`}
                sub="vs headcount"
                accent={
                  avgAttendance >= 90
                    ? "green"
                    : avgAttendance >= 70
                      ? "amber"
                      : "red"
                }
              />
            )}
          </div>
          {daily.length > 0 && (
            <div>
              <SubLabel>
                Daily Attendance — {data.year}/{String(data.month).padStart(2, "0")}
              </SubLabel>
              <VBars
                data={daily.map((d) => ({
                  label: d.date.slice(8),
                  value: d.count,
                }))}
                height={100}
                colorClass="bg-chart-3"
              />
            </div>
          )}
          {data.byDepartment.length > 0 && (
            <div>
              <SubLabel>Department-wise Attendance</SubLabel>
              <HBar
                data={data.byDepartment.map((d) => ({
                  label: d.department,
                  value: d.count,
                  color: "bg-chart-3",
                }))}
                showPct
              />
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ── Leave Analytics Section ───────────────────────────────────────────────────

export function LeaveAnalyticsSection({
  data,
  isLoading,
}: {
  data?: LeaveAnalyticsData;
  isLoading: boolean;
}) {
  const totalApproved =
    data?.byDepartment.reduce((s, d) => s + d.approved, 0) ?? 0;
  const totalPending =
    data?.byDepartment.reduce((s, d) => s + d.pending, 0) ?? 0;
  const totalAll = data?.byDepartment.reduce((s, d) => s + d.total, 0) ?? 0;
  const utilizationPct =
    totalAll > 0 ? Math.round((totalApproved / totalAll) * 100) : null;

  return (
    <SectionCard
      icon={IcoClock}
      title="Leave analytics"
      tone="warning"
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : !data ||
        (data.byDepartment.length === 0 && data.monthlyTrend.length === 0) ? (
        <EmptyState message="No leave data for this year" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Mini label="Total Requests" value={totalAll} />
            <Mini
              label="Approved"
              value={totalApproved}
              sub={
                utilizationPct != null
                  ? `${utilizationPct}% approval rate`
                  : undefined
              }
              accent="green"
            />
            <Mini label="Pending" value={totalPending} accent="amber" />
          </div>
          <div>
            <SubLabel>Approved Leaves by Month</SubLabel>
            <VBars
              data={monthBars(data.monthlyTrend)}
              height={100}
              colorClass="bg-chart-1"
              emptyMessage="No approved leave this year"
            />
          </div>
          {data.byDepartment.length > 0 && (
            <div>
              <SubLabel>Department-wise Leave Approvals</SubLabel>
              <HBar
                data={data.byDepartment
                  .filter((d) => d.total > 0)
                  .sort((a, b) => b.approved - a.approved)
                  .map((d) => ({
                    label: d.department,
                    value: d.approved,
                    color: "bg-chart-1",
                  }))}
                showPct
              />
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ── Compensation Section ──────────────────────────────────────────────────────

export function CompensationSection({
  data,
  isLoading,
}: {
  data?: CompensationAnalyticsData;
  isLoading: boolean;
}) {
  return (
    <SectionCard
      icon={IcoCoin}
      title="Compensation & payroll analytics"
      tone="plum"
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : !data ? (
        <EmptyState message="No compensation data available" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini
              label="Avg Salary / Month"
              value={formatINRCompact(Number(data.overall.avgSalary))}
              accent="violet"
            />
            <Mini
              label="Median Salary"
              value={formatINRCompact(Number(data.overall.medianSalary))}
              accent="violet"
            />
            <Mini
              label="Min Salary"
              value={formatINRCompact(Number(data.overall.minSalary))}
            />
            <Mini
              label="Max Salary"
              value={formatINRCompact(Number(data.overall.maxSalary))}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {data.byDepartment.length > 0 && (
              <div>
                <SubLabel>Avg Salary by Department (₹K)</SubLabel>
                <HBar
                  data={data.byDepartment
                    .filter((d) => Number(d.avgSalary) > 0)
                    .sort((a, b) => Number(b.avgSalary) - Number(a.avgSalary))
                    .map((d) => ({
                      label: d.department,
                      value: Math.round(Number(d.avgSalary) / 1000),
                      color: "bg-chart-5",
                    }))}
                />
              </div>
            )}
            {data.byRole.length > 0 && (
              <div>
                <SubLabel>Avg Salary by Role (₹K) — top 8</SubLabel>
                <HBar
                  data={data.byRole
                    .filter((r) => Number(r.avgSalary) > 0)
                    .sort((a, b) => Number(b.avgSalary) - Number(a.avgSalary))
                    .slice(0, 8)
                    .map((r) => ({
                      label: r.role,
                      value: Math.round(Number(r.avgSalary) / 1000),
                      color: "bg-chart-5",
                    }))}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Diversity Section ─────────────────────────────────────────────────────────

export function DiversitySection({
  data,
  isLoading,
}: {
  data?: DiversityData;
  isLoading: boolean;
}) {
  return (
    <SectionCard
      icon={IcoDiversity}
      title="Diversity & demographics"
      tone="plum"
      badge={
        data ? (
          <Badge variant="secondary" className="tabular-nums">
            {data.total} employees
          </Badge>
        ) : undefined
      }
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : !data || data.total === 0 ? (
        <EmptyState message="No employee data available" />
      ) : (
        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <SubLabel>Gender Split</SubLabel>
            <div className="space-y-2">
              {data.gender.map((g) => (
                <div key={g.label} className="flex items-center gap-2.5">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 truncate capitalize">
                    {g.label.toLowerCase()}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${GENDER_COLOR[g.label] ?? "bg-ink-300"}`}
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 w-16 justify-end">
                    <span className="text-xs font-semibold tabular-nums">
                      {g.count}
                    </span>
                    <span className="text-3xs text-muted-foreground">
                      ({g.pct}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SubLabel>Age Distribution</SubLabel>
            <HBar
              data={data.ageBuckets.map((b) => ({
                label: b.label,
                value: b.count,
                color: "bg-chart-4",
              }))}
              showPct
            />
          </div>
          <div>
            <SubLabel>Tenure Distribution</SubLabel>
            <HBar
              data={data.tenureBuckets.map((b) => ({
                label: b.label,
                value: b.count,
                color: "bg-chart-1",
              }))}
              showPct
            />
          </div>
        </div>
      )}
    </SectionCard>
  );
}
