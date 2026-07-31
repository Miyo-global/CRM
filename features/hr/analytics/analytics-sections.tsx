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
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import type {
  RecruitmentAnalyticsData,
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

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IcoUsers({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IcoTrendDown({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></svg>;
}
function IcoUserPlus({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
}
function IcoTimer({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function IcoDiversity({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>;
}
function IcoActivity({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
}
function IcoBriefcase({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
}
function IcoUserMinus({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
}
function IcoTarget({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
}
function IcoClipboard({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" ry="1" /></svg>;
}
function IcoCalendar({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function IcoCoin({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
function IcoTrendUp({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
}
function IcoClock({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-slate-400",
  SCREENING: "bg-blue-500",
  INTERVIEW: "bg-amber-500",
  OFFER: "bg-violet-500",
  HIRED: "bg-emerald-500",
  REJECTED: "bg-red-400",
};

const STAGE_BG: Record<string, string> = {
  NEW: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60",
  SCREENING: "bg-blue-50 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-800/40",
  INTERVIEW: "bg-amber-50 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/40",
  OFFER: "bg-violet-50 dark:bg-violet-950/30 border-violet-200/70 dark:border-violet-800/40",
  HIRED: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/40",
};

const STAGE_NUM_COLOR: Record<string, string> = {
  NEW: "text-slate-700 dark:text-slate-200",
  SCREENING: "text-blue-700 dark:text-blue-300",
  INTERVIEW: "text-amber-700 dark:text-amber-300",
  OFFER: "text-violet-700 dark:text-violet-300",
  HIRED: "text-emerald-700 dark:text-emerald-300",
};

const GENDER_COLOR: Record<string, string> = {
  MALE: "bg-blue-500/70",
  FEMALE: "bg-pink-500/70",
  OTHER: "bg-slate-400/70",
  "NOT SPECIFIED": "bg-slate-300/70",
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
  return (
    <div className="space-y-2">
      {data.map((item) => {
        const pct = Math.round((item.value / max) * 100);
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span
              className="text-xs text-muted-foreground w-28 shrink-0 truncate"
              title={item.label}
            >
              {item.label}
            </span>
            <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${item.color ?? "bg-primary"}`}
                style={{ width: `${Math.max(3, pct)}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0 w-[60px] justify-end">
              <span className="text-xs font-semibold tabular-nums">{item.value}</span>
              {showPct && (
                <span className="text-[9px] text-muted-foreground">({pct}%)</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VBars({
  data,
  height = 100,
  colorClass = "bg-primary/60",
}: {
  data: { label: string; value: number }[];
  height?: number;
  colorClass?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d) => {
        const pct = Math.max(4, (d.value / max) * 100);
        return (
          <div
            key={d.label}
            className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end"
          >
            {d.value > 0 && (
              <span className="text-[7px] font-medium tabular-nums text-muted-foreground">
                {d.value}
              </span>
            )}
            <div
              className={`w-full rounded-t-sm ${colorClass} transition-all duration-700`}
              style={{ height: `${pct}%` }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[8px] text-muted-foreground mt-0.5 leading-none">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4 py-1">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
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
    <div className="flex flex-col items-center py-12">
      <EmptyLeaderboardIllustration className="mb-3 h-28 w-28 opacity-60" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
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
  const styles: Record<string, string> = {
    green: "border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20",
    red: "border-l-red-500 bg-red-50/40 dark:bg-red-950/20",
    amber: "border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20",
    blue: "border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20",
    violet: "border-l-violet-500 bg-violet-50/40 dark:bg-violet-950/20",
  };
  return (
    <div
      className={`rounded-xl border border-border/50 border-l-4 p-4 ${
        accent ? styles[accent] : "bg-muted/15"
      }`}
    >
      <p className="text-[11px] text-muted-foreground mb-2 truncate">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
      {sub && (
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{sub}</p>
      )}
    </div>
  );
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
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
        className="text-muted/30"
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
        style={{ transition: "stroke-dasharray 0.7s ease" }}
      />
      <text
        x="26"
        y="30"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="currentColor"
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
    <div className="rounded-xl border border-border/60 bg-muted/10 p-4 flex items-center gap-4">
      <CompletionRing pct={pct ?? 0} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  children,
  accentClass = "bg-muted/50",
}: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  accentClass?: string;
}) {
  return (
    <Card className="overflow-hidden border-border/60">
      <CardHeader className="px-6 py-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${accentClass}`}
          >
            <Icon className="h-4 w-4 text-foreground/80" />
          </div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {badge && <div className="ml-auto">{badge}</div>}
        </div>
      </CardHeader>
      <CardContent className="px-6 py-5">{children}</CardContent>
    </Card>
  );
}

// ── Pipeline Funnel ───────────────────────────────────────────────────────────

function PipelineFunnel({
  stages,
}: {
  stages: { stage: string; count: number; avgDaysInStage?: number | null }[];
}) {
  const orderedKeys = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED"];
  const stageData = orderedKeys.map(
    (k) => stages.find((s) => s.stage === k) ?? { stage: k, count: 0, avgDaysInStage: null },
  );
  const rejected = stages.find((s) => s.stage === "REJECTED");
  const max = Math.max(...stageData.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-1.5">
        {stageData.map((s, i) => {
          const next = stageData[i + 1];
          const conversion =
            next && s.count > 0
              ? Math.round((next.count / s.count) * 100)
              : null;
          const fillPct = Math.max(3, (s.count / max) * 100);
          const isLast = i === stageData.length - 1;

          return (
            <div key={s.stage} className="flex items-center gap-1.5 flex-1 min-w-0">
              <div
                className={`flex-1 rounded-xl border p-3 flex flex-col items-center gap-2 min-w-0 ${
                  STAGE_BG[s.stage] ?? "bg-muted/20 border-border/60"
                }`}
              >
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {STAGE_LABELS[s.stage]}
                </span>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    STAGE_NUM_COLOR[s.stage] ?? ""
                  }`}
                >
                  {s.count}
                </span>
                <div className="w-full h-1 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STAGE_COLORS[s.stage]}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                {s.avgDaysInStage != null && s.avgDaysInStage > 0 && (
                  <span className="text-[9px] text-muted-foreground">
                    {s.avgDaysInStage}d avg
                  </span>
                )}
                {!isLast && conversion != null && (
                  <span
                    className={`text-[10px] font-semibold ${
                      conversion >= 60
                        ? "text-emerald-600 dark:text-emerald-400"
                        : conversion >= 30
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {conversion}% pass
                  </span>
                )}
              </div>
              {!isLast && (
                <svg
                  width="8"
                  height="14"
                  viewBox="0 0 8 14"
                  fill="none"
                  className="text-muted-foreground/30 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M1 1L7 7L1 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
      {rejected && rejected.count > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-red-50/50 dark:bg-red-950/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-900/30">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-red-400 shrink-0"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
          <span>
            <strong className="text-red-600 dark:text-red-400">
              {rejected.count}
            </strong>{" "}
            candidates rejected overall
          </span>
        </div>
      )}
    </div>
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
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          From
        </label>
        <Input
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-9 w-[148px] text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          To
        </label>
        <Input
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-9 w-[148px] text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Department
        </label>
        <Select
          value={value.department}
          onValueChange={(v) => onChange({ ...value, department: v })}
        >
          <SelectTrigger className="h-9 w-[180px] text-xs">
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
  const healthValCls =
    orgScore >= 70
      ? "text-emerald-700 dark:text-emerald-400"
      : orgScore >= 45
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";

  const kpis = [
    {
      label: "Total Headcount",
      value: data?.headcount != null ? String(data.headcount) : "—",
      Icon: IcoUsers,
      tile: "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-800/40",
      iconWrap: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
      valCls: "",
    },
    {
      label: "Attrition Rate",
      value: data?.attritionRate != null ? `${data.attritionRate}%` : "—",
      Icon: IcoTrendDown,
      tile: "bg-red-50/80 dark:bg-red-950/30 border-red-200/60 dark:border-red-800/40",
      iconWrap: "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400",
      valCls: "text-red-700 dark:text-red-400",
    },
    {
      label: "Hiring Rate",
      value: data?.hiringRate != null ? `${data.hiringRate}%` : "—",
      Icon: IcoUserPlus,
      tile: "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40",
      iconWrap: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
      valCls: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Avg Tenure",
      value: data?.avgTenureMonths != null ? `${data.avgTenureMonths}mo` : "—",
      Icon: IcoTimer,
      tile: "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40",
      iconWrap: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
      valCls: "",
    },
    {
      label: "Gender Diversity",
      value: data?.diversityRatio != null ? `${data.diversityRatio}%` : "—",
      Icon: IcoDiversity,
      tile: "bg-violet-50/80 dark:bg-violet-950/30 border-violet-200/60 dark:border-violet-800/40",
      iconWrap: "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400",
      valCls: "",
    },
    {
      label: "Org Health Score",
      value: data?.orgHealthScore != null ? String(data.orgHealthScore) : "—",
      Icon: IcoActivity,
      tile: "bg-teal-50/80 dark:bg-teal-950/30 border-teal-200/60 dark:border-teal-800/40",
      iconWrap: "bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400",
      valCls: healthValCls,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map(({ label, value, Icon, tile, iconWrap, valCls }) => (
        <div
          key={label}
          className={`rounded-xl border p-4 space-y-3 ${tile}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground leading-snug">
              {label}
            </span>
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${iconWrap}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p
              className={`text-3xl font-bold tabular-nums tracking-tight leading-none ${valCls}`}
            >
              {value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Recruitment Section ───────────────────────────────────────────────────────

export function RecruitmentSection({
  data,
  isLoading,
}: {
  data?: RecruitmentAnalyticsData;
  isLoading: boolean;
}) {
  return (
    <SectionCard
      icon={IcoBriefcase}
      title="Recruitment Analytics"
      accentClass="bg-blue-100/70 dark:bg-blue-900/30"
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : !data ? (
        <EmptyState message="No recruitment data for this period" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini
              label="Open Positions"
              value={data.openPositions}
              sub={`${data.totalOpenings} total openings`}
              accent="blue"
            />
            <Mini label="Offers Released" value={data.offersReleased} accent="blue" />
            <Mini
              label="Offers Accepted"
              value={data.offersAccepted}
              sub={
                data.offerAcceptanceRate != null
                  ? `${data.offerAcceptanceRate}% acceptance`
                  : undefined
              }
              accent="green"
            />
            <Mini
              label="Avg Time to Hire"
              value={
                data.avgTimeToHireDays != null ? `${data.avgTimeToHireDays}d` : "—"
              }
              sub={`${data.hiredCount} hired`}
              accent="amber"
            />
          </div>

          <div>
            <SubLabel>Recruitment Pipeline</SubLabel>
            {data.pipelineByStage.length > 0 ? (
              <PipelineFunnel stages={data.pipelineByStage} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No candidates in pipeline
              </p>
            )}
          </div>

          <div>
            <SubLabel>Source of Hire</SubLabel>
            {data.sourceOfHire.length > 0 ? (
              <HBar
                data={data.sourceOfHire.map((s) => ({
                  label: s.source,
                  value: s.count,
                  color: "bg-blue-500/70",
                }))}
                showPct
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hires recorded
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
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
      title="Attrition & Retention Analytics"
      accentClass="bg-red-100/70 dark:bg-red-900/30"
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
                            <span className="text-[8px] tabular-nums text-muted-foreground">
                              {total}
                            </span>
                          )}
                          <div
                            className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse"
                            style={{ height: `${h}%` }}
                          >
                            <div
                              className="w-full bg-amber-500/80"
                              style={{ height: `${volPct}%` }}
                            />
                            <div className="w-full bg-red-500/70 flex-1" />
                          </div>
                          <span className="text-[8px] text-muted-foreground">
                            {t.month.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-5 mt-2.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-3 rounded-sm bg-amber-500/80 inline-block" />
                      Voluntary
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-3 rounded-sm bg-red-500/70 inline-block" />
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
                    color: "bg-red-500/60",
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
      title="Performance & Training Analytics"
      accentClass="bg-emerald-100/70 dark:bg-emerald-900/30"
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
                  color: "bg-emerald-500/70",
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
      title="Workforce Overview"
      accentClass="bg-indigo-100/70 dark:bg-indigo-900/30"
      badge={
        data ? (
          <Badge variant="secondary" className="text-[11px]">
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
                      className="flex-1 rounded-t-sm bg-emerald-500/70"
                      style={{ height: `${jH}%` }}
                      title={`Joiners: ${m.joiners}`}
                    />
                    <div
                      className="flex-1 rounded-t-sm bg-red-400/70"
                      style={{ height: `${eH}%` }}
                      title={`Exits: ${m.exits}`}
                    />
                  </div>
                  <span className="text-[8px] text-muted-foreground">
                    {m.month.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-emerald-500/70 inline-block" />
              Joiners
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-red-400/70 inline-block" />
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
      title="Attendance Analytics"
      accentClass="bg-sky-100/70 dark:bg-sky-900/30"
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
                colorClass="bg-sky-500/60"
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
                  color: "bg-sky-500/70",
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
      title="Leave Analytics"
      accentClass="bg-amber-100/70 dark:bg-amber-900/30"
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : !data ||
        (data.byDepartment.length === 0 && data.monthlyTrend.length === 0) ? (
        <EmptyState message="No leave data for this year" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
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
          {data.monthlyTrend.length > 0 && (
            <div>
              <SubLabel>Approved Leaves by Month</SubLabel>
              <VBars
                data={data.monthlyTrend.map((m) => ({
                  label: m.month.slice(5) ?? m.month,
                  value: m.count,
                }))}
                height={100}
                colorClass="bg-amber-500/70"
              />
            </div>
          )}
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
                    color: "bg-amber-500/70",
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
      title="Compensation & Payroll Analytics"
      accentClass="bg-violet-100/70 dark:bg-violet-900/30"
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
                      color: "bg-violet-500/70",
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
                      color: "bg-violet-400/60",
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
      title="Diversity & Demographics"
      accentClass="bg-pink-100/70 dark:bg-pink-900/30"
      badge={
        data ? (
          <Badge variant="secondary" className="text-[11px]">
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
                  <div className="flex-1 h-5 bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${GENDER_COLOR[g.label] ?? "bg-slate-400/70"}`}
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 w-16 justify-end">
                    <span className="text-xs font-semibold tabular-nums">
                      {g.count}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
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
                color: "bg-cyan-500/70",
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
                color: "bg-amber-500/70",
              }))}
              showPct
            />
          </div>
        </div>
      )}
    </SectionCard>
  );
}
