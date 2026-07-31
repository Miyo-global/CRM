"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import {
  useHrDashboardMetrics,
  useHrLeaveCalendar,
  useHrOnboardingStatus,
  useHrDiversityMetrics,
  useHrTimeToFill,
  useHrPayrollSummary,
  useHrSalaryBands,
  useHrCompliance,
} from "@/lib/api/hooks/hr/dashboard";
import { useHrLeaveAnalytics } from "@/lib/api/hooks/hr/leaves-expenses";
import { useAnniversaryFeed } from "@/lib/api/hooks/hr";
import {
  Users,
  UserCheck,
  CalendarOff,
  ClipboardList,
  Briefcase,
  UserPlus,
  Cake,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Timer,
  PieChart,
  BarChart3,
  ShieldCheck,
  Download,
  PartyPopper,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/format-utils";

const HR_ADMIN_ROLES = ["CEO", "HR", "ADMIN", "BRANCH_HR", "BRANCH_MANAGER"];

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function LeaveCalendarWidget() {
  const now = new Date();
  const { data, isLoading } = useHrLeaveCalendar(now.getMonth() + 1, now.getFullYear());

  const today = now.toISOString().slice(0, 10);
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const thisWeekLeaves = (data ?? []).filter(
    (l) => l.status === "APPROVED" && l.startDate <= next7 && l.endDate >= today,
  );

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">On Leave This Week</CardTitle>
        <Link
          href="/hr/leaves"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : thisWeekLeaves.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No approved leaves this week
          </p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {thisWeekLeaves.map((leave) => (
              <div key={leave.id} className="flex items-center gap-2 py-1">
                <Avatar className="h-7 w-7 shrink-0">
                  {leave.userImage && <AvatarImage src={leave.userImage} alt={leave.userName} />}
                  <AvatarFallback className="text-[10px]">
                    {leave.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{leave.userName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateLabel(leave.startDate)} – {formatDateLabel(leave.endDate)}
                    {" · "}
                    {leave.leaveType}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {leave.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingBirthdaysWidget({
  birthdays,
  isLoading,
}: {
  birthdays: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
    dateOfBirth: string;
    daysUntil: number;
    birthdayMonthDay: string | null;
  }[];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <Cake className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : birthdays.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No birthdays in the next 7 days
          </p>
        ) : (
          <div className="space-y-2">
            {birthdays.map((b) => {
              const displayName =
                b.firstName && b.lastName
                  ? `${b.firstName} ${b.lastName}`
                  : b.name ?? "Unknown";
              return (
                <div key={b.id} className="flex items-center gap-2 py-0.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    {b.image && <AvatarImage src={b.image} alt={displayName} />}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(b.name, b.firstName, b.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{displayName}</p>
                    {b.birthdayMonthDay ? (
                      <p className="text-[10px] text-muted-foreground">{b.birthdayMonthDay}</p>
                    ) : null}
                  </div>
                  <Badge variant={b.daysUntil === 0 ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {b.daysUntil === 0 ? "Today!" : `in ${b.daysUntil}d`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OnboardingStatusWidget() {
  const { data, isLoading } = useHrOnboardingStatus();

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Onboarding Status</CardTitle>
        </div>
        <Link
          href="/hr/onboarding?tab=workflow"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        ) : !data || data.total === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No onboarding in progress
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="h-3 w-3" />
                {data.inProgress} in progress
              </span>
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="h-3 w-3" />
                {data.completed} completed
              </span>
              <span className="ml-auto font-medium text-foreground">
                {data.completionPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${data.completionPct}%` }}
              />
            </div>
            {data.newHires.length > 0 && (
              <div className="space-y-2 mt-1">
                {data.newHires.map((hire) => (
                  <div key={hire.userId} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{hire.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${hire.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
                        {hire.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  NOT_SPECIFIED: "Not Specified",
};

const GENDER_COLORS: Record<string, string> = {
  MALE: "bg-blue-500",
  FEMALE: "bg-pink-500",
  OTHER: "bg-purple-500",
  NOT_SPECIFIED: "bg-muted",
};

function DiversityWidget() {
  const { data, isLoading } = useHrDiversityMetrics();

  const totalGender = (data?.genderBreakdown ?? []).reduce((s, g) => s + g.count, 0);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <PieChart className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Diversity & Inclusion</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Gender</p>
              {(data?.genderBreakdown ?? []).map((g) => {
                const pct = totalGender > 0 ? Math.round((g.count / totalGender) * 100) : 0;
                return (
                  <div key={g.gender} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 truncate shrink-0">
                      {GENDER_LABELS[g.gender] ?? g.gender}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${GENDER_COLORS[g.gender] ?? "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right shrink-0">
                      {g.count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Age Groups</p>
              {(data?.ageDistribution ?? []).map((a) => (
                <div key={a.range} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14 shrink-0">{a.range}</span>
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${Math.max(4, (a.count / Math.max(totalGender, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                    {a.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimeToFillWidget() {
  const { data, isLoading } = useHrTimeToFill();

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Time to Fill</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
        ) : data?.avgDaysOverall == null ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No filled roles yet</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold">{data.avgDaysOverall}</span>
              <span className="text-sm text-muted-foreground mb-0.5">avg days</span>
            </div>
            {data.byDepartment.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">By Department</p>
                {data.byDepartment.slice(0, 4).map((d) => (
                  <div key={d.department} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex-1 truncate">{d.department}</span>
                    <Badge variant="secondary" className="text-[10px] tabular-nums shrink-0">
                      {d.avgDays}d · {d.filledCount} filled
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayrollSummaryWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data, isLoading } = useHrPayrollSummary();

  if (!role || !["CEO", "ADMIN", "FINANCE"].includes(role)) return null;

  const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Payroll Summary</CardTitle>
        </div>
        {data?.month && (
          <Badge variant="outline" className="text-[10px]">{data.month}</Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
        ) : !data || data.employeeCount === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No payroll data for this month</p>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Net Payout</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{formatINR(data.totalNet)}</span>
                {data.momChangePct !== null && (
                  <span className={`flex items-center gap-0.5 text-xs ${data.momChangePct >= 0 ? "text-destructive" : "text-emerald-500"}`}>
                    {data.momChangePct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(data.momChangePct)}%
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Gross</p>
                <p className="font-medium">{formatINR(data.totalGross)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deductions</p>
                <p className="font-medium">{formatINR(data.totalDeductions)}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{data.employeeCount} employees processed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeaveAnalyticsWidget() {
  const { data, isLoading } = useHrLeaveAnalytics();
  const maxCount = Math.max(...(data?.byDepartment ?? []).map((d) => d.total), 1);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <CalendarOff className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">
          Leave Utilization {data?.year ? `(${data.year})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
        ) : !data || data.byDepartment.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No leave data for this year</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">By Department</p>
              {data.byDepartment.map((d) => (
                <div key={d.department} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 truncate shrink-0">{d.department}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gold/70"
                      style={{ width: `${(d.total / maxCount) * 100}%` }}
                    />
                  </div>
                  <Badge variant="secondary" className="text-[10px] tabular-nums shrink-0">
                    {d.approved}✓ {d.pending}⋯
                  </Badge>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Monthly Trend</p>
              <div className="flex items-end gap-0.5 h-20">
                {data.monthlyTrend.map((m) => {
                  const maxM = Math.max(...data.monthlyTrend.map((x) => x.count), 1);
                  const pct = Math.round((m.count / maxM) * 100);
                  return (
                    <div key={m.month} className="flex flex-col items-center gap-0.5 flex-1">
                      <div
                        className="w-full rounded-sm bg-gold/60"
                        style={{ height: `${Math.max(4, pct)}%`, minHeight: "2px" }}
                        title={`${m.month}: ${m.count}`}
                      />
                      <span className="text-[8px] text-muted-foreground">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const formatLakh = (n: number) => {
  if (n >= 10_00_000) return `${(n / 10_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  return `${(n / 1000).toFixed(0)}K`;
};

function SalaryBandWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data, isLoading } = useHrSalaryBands();

  if (!role || !["CEO", "ADMIN", "HR", "BRANCH_HR"].includes(role)) return null;

  const maxCount = Math.max(...(data?.bandDistribution ?? []).map((b) => b.count), 1);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Salary Bands</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
        ) : !data || data.bandDistribution.every((b) => b.count === 0) ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No salary data yet</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Distribution</p>
              {data.bandDistribution.map((band) => (
                <div key={band.label} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12 shrink-0">{band.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue/70"
                      style={{ width: `${(band.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-right shrink-0">
                    {band.count}
                  </span>
                </div>
              ))}
            </div>
            {data.byDepartment.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Avg by Dept</p>
                {data.byDepartment.slice(0, 4).map((d) => (
                  <div key={d.department} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground truncate flex-1">{d.department}</span>
                    <Badge variant="secondary" className="text-[10px] tabular-nums shrink-0">
                      avg {formatLakh(d.avgAnnual)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComplianceWidget() {
  const { data, isLoading } = useHrCompliance();

  const ringColor =
    (data?.overallPct ?? 0) >= 80
      ? "text-emerald-500"
      : (data?.overallPct ?? 0) >= 60
        ? "text-amber-500"
        : "text-destructive";

  function handleExport() {
    window.open("/api/hr/dashboard/export", "_blank");
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Compliance Tracker</CardTitle>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title="Export HR Report"
        >
          <Download className="h-3 w-3" />
          Export
        </button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
        ) : !data || data.total === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No employees yet</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold tabular-nums ${ringColor}`}>
                {data.overallPct}%
              </span>
              <div>
                <p className="text-xs font-medium">Overall Compliance</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.overallCompliant} / {data.total} employees fully profiled
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {data.checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-1 truncate">{c.label}</span>
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${c.pct >= 80 ? "bg-emerald-500" : c.pct >= 60 ? "bg-amber-500" : "bg-destructive"}`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right shrink-0">
                    {c.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnniversaryFeedWidget() {
  const { data: items, isLoading } = useAnniversaryFeed();
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <PartyPopper className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Upcoming Anniversaries</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-7 rounded" />)}
          </div>
        ) : !items || items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No upcoming in 30 days</p>
        ) : (
          <div className="space-y-1.5">
            {items.slice(0, 6).map((item) => (
              <div key={`${item.userId}-${item.type}`} className="flex items-center gap-2 text-sm">
                <span className="text-base">{item.type === "BIRTHDAY" ? "🎂" : "🏆"}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate">{item.name}</span>
                  {item.type === "WORK_ANNIVERSARY" && item.yearsCount && (
                    <span className="text-xs text-muted-foreground ml-1">{item.yearsCount}yr</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {item.daysAway === 0 ? "Today" : `${item.dateStr}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HrDashboardOverview() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data: metrics, isLoading } = useHrDashboardMetrics();

  if (!role || !HR_ADMIN_ROLES.includes(role)) return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Employees"
          value={isLoading ? "" : (metrics?.totalEmployees ?? 0)}
          icon={Users}
          color="blue"
          index={0}
          href="/hr"
        />
        <StatCard
          label="Active"
          value={isLoading ? "" : (metrics?.activeEmployees ?? 0)}
          icon={UserCheck}
          color="green"
          index={1}
        />
        <StatCard
          label="On Leave Today"
          value={isLoading ? "" : (metrics?.onLeaveToday ?? 0)}
          icon={CalendarOff}
          color="gold"
          index={2}
          href="/hr/leaves"
        />
        <StatCard
          label="Pending Leaves"
          value={isLoading ? "" : (metrics?.pendingLeaveRequests ?? 0)}
          icon={ClipboardList}
          color="red"
          index={3}
          href="/hr/leaves"
        />
        <StatCard
          label="Open Positions"
          value={isLoading ? "" : (metrics?.openPositions ?? 0)}
          icon={Briefcase}
          color="purple"
          index={4}
          href="/hr/recruitment"
        />
        <StatCard
          label="New Hires (Month)"
          value={isLoading ? "" : (metrics?.monthlyHires ?? 0)}
          icon={UserPlus}
          color="gold"
          index={5}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <LeaveCalendarWidget />
        <UpcomingBirthdaysWidget
          birthdays={metrics?.upcomingBirthdays ?? []}
          isLoading={isLoading}
        />
        <OnboardingStatusWidget />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <DiversityWidget />
        <TimeToFillWidget />
        <PayrollSummaryWidget />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <SalaryBandWidget />
        <ComplianceWidget />
      </div>

      <LeaveAnalyticsWidget />

      <AnniversaryFeedWidget />
    </div>
  );
}
