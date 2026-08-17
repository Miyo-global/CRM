"use client";

import { useState, useCallback } from "react";
import { EditEmployeeForm, type EmployeeData } from "./edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { SelfEditProfileForm } from "@/components/hr/self-edit-profile-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useHrEmployeeStats,
  useHrEmployeeProjects,
  useHrEmployeeTickets,
  useTerminateEmployee,
  useDirectReports,
  useManagerScorecard,
  useEmployeeAvailability,
} from "@/lib/api/hooks/hr";
import {
  useOfferLetterTemplates,
  useGenerateEmployeeLetter,
} from "@/lib/api/hooks/hr/recruitment";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  UserX,
  Mail,
  Phone,
  Download,
  Building2,
  Calendar,
  Briefcase,
  Clock,
  FileCheck,
  Tag,
  Users,
  BarChart2,
  UserCircle,
  Wallet,
  Globe,
  Linkedin,
  Github,
  Twitter,
  ShieldAlert,
  User,
  Cake,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import type { Employee } from "@/types/hr";
import { HR_LETTER_DOCUMENT_TYPES, HR_LETTER_EXTRA_FIELDS } from "@/lib/hr/hr-letter-tokens";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold tabular-nums ${color ?? ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function formatMoney(v: unknown): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(n);
}

function maskAccount(v: unknown): string | null {
  const s = asStr(v);
  if (!s) return null;
  return s.length <= 4 ? s : `••••${s.slice(-4)}`;
}

function maskTaxId(v: unknown): string | null {
  const s = asStr(v);
  if (!s) return null;
  return s.length <= 4 ? s : `${s.slice(0, 2)}••••${s.slice(-2)}`;
}

function DetailCard({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          </div>
          {action}
        </div>
        <dl className="space-y-2.5">{children}</dl>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-right break-words min-w-0">{value}</dd>
    </div>
  );
}


function AvailabilityDot({ userId }: { userId: string }) {
  const { data } = useEmployeeAvailability([userId]);
  const entry = data?.find((e) => e.userId === userId);
  if (!entry) return null;

  const dotClass =
    entry.status === "ON_LEAVE"
      ? "bg-red-500"
      : entry.status === "HALF_DAY"
        ? "bg-amber-400"
        : "bg-green-500";

  const label =
    entry.status === "ON_LEAVE"
      ? `On Leave${entry.leaveType ? ` (${entry.leaveType})` : ""}`
      : entry.status === "HALF_DAY"
        ? "Half Day"
        : "Available";

  return (
    <span
      className="flex items-center gap-1"
      title={label}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass} shrink-0`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}


function profileCompletenessScore(employee: EmployeeData): { pct: number; missing: string[] } {
  const fields: Array<{ label: string; filled: boolean }> = [
    { label: "First name", filled: !!employee.firstName },
    { label: "Last name", filled: !!employee.lastName },
    { label: "Phone", filled: !!employee.phone },
    { label: "Designation", filled: !!employee.designation },
    { label: "Profile photo", filled: !!(employee as Record<string, unknown>).image },
    { label: "Bio", filled: !!(employee as Record<string, unknown>).bio },
    { label: "Skills", filled: Array.isArray(employee.skills) ? employee.skills.length > 0 : !!employee.skills },
    { label: "LinkedIn", filled: !!(employee as Record<string, unknown>).linkedinUrl },
  ];
  const filled = fields.filter((f) => f.filled).length;
  const missing = fields.filter((f) => !f.filled).map((f) => f.label);
  return { pct: Math.round((filled / fields.length) * 100), missing };
}


function DirectReportsSection({ employeeId }: { employeeId: string }) {
  const { data: reports, isLoading } = useDirectReports(employeeId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Who Reports to Me</h3>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!reports || reports.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Who Reports to Me ({reports.length})
          </h3>
        </div>
        <div className="space-y-2">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/hr/employees/${r.id}`}
              className="flex items-center gap-2 hover:bg-muted/60 rounded-lg p-1.5 transition-colors"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={resolveImageUrl(r.image)} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                  {(r.name ?? "?")[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.name ?? r.email}</p>
                {r.designation && <p className="text-[11px] text-muted-foreground truncate">{r.designation}</p>}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


function ManagerScorecardSection({ employeeId }: { employeeId: string }) {
  const { data: scorecard, isLoading } = useManagerScorecard(employeeId);

  if (isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (!scorecard || scorecard.teamSize === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manager Scorecard</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatBlock
            label="Team Size"
            value={scorecard.teamSize}
          />
          <StatBlock
            label="Avg Rating"
            value={scorecard.avgPerformanceRating !== null ? `${scorecard.avgPerformanceRating}/5` : "N/A"}
          />
          <StatBlock
            label="Attendance"
            value={scorecard.teamAttendanceRate !== null ? `${scorecard.teamAttendanceRate}%` : "N/A"}
          />
        </div>
        {scorecard.pendingLeaveRequests > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            {scorecard.pendingLeaveRequests} pending leave request{scorecard.pendingLeaveRequests !== 1 ? "s" : ""} awaiting approval
          </p>
        )}
      </CardContent>
    </Card>
  );
}


export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
  const { data: stats, isLoading: statsLoading } = useHrEmployeeStats(employee.id);
  const { data: projects } = useHrEmployeeProjects(employee.id);
  const { data: ticketsResult } = useHrEmployeeTickets(employee.id);
  const terminateMutation = useTerminateEmployee();
  const router = useRouter();
  const { data: session } = useSession();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  const [letterSheetOpen, setLetterSheetOpen] = useState(false);
  const [letterTemplateId, setLetterTemplateId] = useState<string>("");
  const [letterExtraVars, setLetterExtraVars] = useState<Record<string, string>>({});
  const [letterGenerating, setLetterGenerating] = useState(false);
  const { data: allTemplates } = useOfferLetterTemplates();
  const generateLetter = useGenerateEmployeeLetter(employee.id);

  const hrTemplates = (allTemplates ?? []).filter((t) => t.documentType !== "OFFER_LETTER");
  const selectedTemplate = hrTemplates.find((t) => String(t.id) === letterTemplateId) ?? null;
  const extraFields = selectedTemplate
    ? (HR_LETTER_EXTRA_FIELDS[selectedTemplate.documentType] ?? [])
    : [];

  const handleGenerateLetter = useCallback(async () => {
    if (!letterTemplateId) { toast.error("Select a template first"); return; }
    setLetterGenerating(true);
    try {
      const result = await generateLetter.mutateAsync({
        templateId: Number(letterTemplateId),
        extraVars: letterExtraVars,
      });
      const a = document.createElement("a");
      a.href = result.url;
      a.download = `${employee.firstName ?? "employee"}-letter.pdf`;
      a.click();
      toast.success("Letter downloaded");
      setLetterSheetOpen(false);
    } catch {
      toast.error("Failed to generate letter");
    } finally {
      setLetterGenerating(false);
    }
  }, [letterTemplateId, letterExtraVars, generateLetter, employee.firstName]);

  const isSelf = session?.user?.id === employee.id;
  const employeeName = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee";

  const skillsList: string[] = Array.isArray(employee.skills)
    ? (employee.skills as string[]).filter(Boolean)
    : typeof employee.skills === "string" && employee.skills
      ? employee.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const { pct: completeness, missing: missingFields } = profileCompletenessScore(employee);

  const handleTerminateClick = useCallback(() => setTerminateOpen(true), []);
  const handleTerminateConfirm = useCallback(() => {
    terminateMutation.mutate(employee.id, {
      onSuccess: () => {
        toast.success(`${employeeName} has been terminated.`);
        setTerminateOpen(false);
        router.push("/hr");
      },
      onError: (err) => toast.error((err as Error).message),
    });
  }, [employee.id, employeeName, terminateMutation, router]);

  const employeeAsEmployee = employee as unknown as Employee;

  const e = employee as Record<string, unknown>;
  const canManage = ["CEO", "HR", "ADMIN"].includes(session?.user?.role ?? "");
  const canSeeSensitive = e.viewerCanSeeSensitive === true;
  const bank = (e.bankDetails ?? null) as
    | { bankName?: string; accountNumber?: string; ifsc?: string; accountHolder?: string }
    | null;
  const emergency = (e.emergencyContact ?? null) as
    | { name?: string; relation?: string; phone?: string }
    | null;
  const joinedFull = employee.joiningDate
    ? format(new Date(String(employee.joiningDate)), "d MMM yyyy")
    : null;
  const dob = e.dateOfBirth ? format(new Date(String(e.dateOfBirth)), "d MMM yyyy") : null;
  const monthly = formatMoney(e.monthlySalary);
  const annual =
    e.monthlySalary != null && !Number.isNaN(Number(e.monthlySalary))
      ? formatMoney(Number(e.monthlySalary) * 12)
      : null;
  const genderLabel = asStr(employee.gender)
    ? String(employee.gender).charAt(0) + String(employee.gender).slice(1).toLowerCase()
    : null;
  const experienceLabel =
    e.experienceYears != null && String(e.experienceYears).trim()
      ? `${e.experienceYears} yrs`
      : null;

  let safeDefaultTab = defaultTab;
  if (safeDefaultTab === "profile" && !canManage) safeDefaultTab = "overview";
  if (safeDefaultTab === "my-profile" && !isSelf) safeDefaultTab = "overview";

  return (
    <>
      <PageWrapper
        title={employeeName}
        subtitle={employee.designation ?? employee.role ?? ""}
        actions={
          <div className="flex items-center gap-2">
            {(session?.user?.role === "CEO" || session?.user?.role === "HR" || session?.user?.role === "ADMIN" || session?.user?.role === "HR_MANAGER") && (
              <>
                <Button variant="outline" size="sm" asChild title="Download employee profile as PDF">
                  <a href={`/api/hr/employees/${employee.id}/profile-pdf`} download>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download Profile
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setLetterSheetOpen(true); setLetterTemplateId(""); setLetterExtraVars({}); }}
                  title="Generate HR letter for this employee"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Generate Letter
                </Button>
              </>
            )}
            {employee.isActive === false || (employee as Record<string, unknown>).terminatedAt ? (
              <Badge variant="destructive" className="text-xs">Terminated</Badge>
            ) : employee.role?.toUpperCase() !== "CEO" && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={handleTerminateClick}
                disabled={terminateMutation.isPending}
                title="Terminate this employee — revokes access immediately"
              >
                <UserX className="h-3.5 w-3.5 mr-1" />
                Terminate
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link>
            </Button>
          </div>
        }
        noInternalScroll
        contentClassName="flex flex-col gap-3"
      >
        <Card className="shrink-0">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarImage src={resolveImageUrl(typeof employee.image === "string" ? employee.image : null)} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                    {getInitials(employee.firstName, employee.lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold">{employeeName}</h2>
                  {employee.role && <Badge variant="secondary" className="text-[10px]">{employee.role}</Badge>}
                  {typeof employee.employeeId === "string" && employee.employeeId && <Badge variant="outline" className="text-[10px]">ID: {employee.employeeId}</Badge>}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <InfoItem icon={Mail} label="Email" value={employee.email} />
                  <InfoItem icon={Phone} label="Phone" value={employee.phone} />
                  <InfoItem icon={Building2} label="Dept" value={typeof employee.departmentName === "string" && employee.departmentName.trim() ? employee.departmentName : (employee.department?.name ?? null)} />
                  <InfoItem icon={Calendar} label="Joined" value={employee.joiningDate ? format(new Date(String(employee.joiningDate)), "MMM yyyy") : null} />
                </div>

                <AvailabilityDot userId={employee.id} />

                {(employeeAsEmployee as Employee).bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{(employeeAsEmployee as Employee).bio}</p>
                )}

                {isSelf && completeness < 100 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Profile completeness</span>
                      <span className="font-medium">{completeness}%</span>
                    </div>
                    <Progress value={completeness} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">
                      Missing: {missingFields.slice(0, 3).join(", ")}{missingFields.length > 3 ? ` +${missingFields.length - 3} more` : ""}
                    </p>
                  </div>
                )}
              </div>

              {!statsLoading && stats && (
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 border-l pl-4 sm:pl-6">
                  <StatBlock label="Present" value={stats.attendance?.daysPresent ?? 0} />
                  <StatBlock label="Leaves" value={stats.leaves.total} />
                  <StatBlock label="Pending" value={stats.leaves.pending} color="text-amber-500" />
                </div>
              )}
              {statsLoading && (
                <div className="flex gap-4 shrink-0 border-l pl-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="text-center space-y-1">
                      <Skeleton className="h-6 w-8 mx-auto" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue={safeDefaultTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="h-9 shrink-0">
            <TabsTrigger value="overview" className="text-xs gap-1.5">
              <Briefcase className="h-3 w-3" />Overview
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs gap-1.5">
              <Clock className="h-3 w-3" />Attendance
            </TabsTrigger>
            {isSelf && (
              <TabsTrigger value="my-profile" className="text-xs gap-1.5">
                <UserCircle className="h-3 w-3" />My Profile
              </TabsTrigger>
            )}
            {canManage && (
              <TabsTrigger value="profile" className="text-xs gap-1.5">
                <FileCheck className="h-3 w-3" />Edit
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-3 pb-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <DetailCard icon={Briefcase} title="Employment">
                  <DetailRow label="Designation" value={asStr(employee.designation)} />
                  <DetailRow label="Department" value={asStr(e.departmentName)} />
                  <DetailRow
                    label="Branch"
                    value={
                      asStr(e.branchName)
                        ? `${asStr(e.branchName)}${asStr(e.branchCity) ? ` · ${asStr(e.branchCity)}` : ""}`
                        : asStr(e.branchCity)
                    }
                  />
                  <DetailRow
                    label="Reporting to"
                    value={
                      asStr(e.managerName)
                        ? employee.reportingTo
                          ? (
                            <Link href={`/hr/employees/${String(employee.reportingTo)}`} className="text-primary hover:underline">
                              {asStr(e.managerName)}
                              {asStr(e.managerDesignation) ? ` · ${asStr(e.managerDesignation)}` : ""}
                            </Link>
                          )
                          : asStr(e.managerName)
                        : null
                    }
                  />
                  <DetailRow label="Role" value={asStr(employee.role)} />
                  <DetailRow label="Employee ID" value={asStr(e.employeeId)} />
                  <DetailRow label="Team" value={asStr(e.team)} />
                  <DetailRow label="Experience" value={experienceLabel} />
                  <DetailRow label="Joined" value={joinedFull} />
                  <DetailRow
                    label="Status"
                    value={
                      employee.isActive === false || e.terminatedAt ? (
                        <span className="text-destructive">Terminated</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                      )
                    }
                  />
                </DetailCard>

                <DetailCard icon={Mail} title="Contact">
                  <DetailRow
                    label="Email"
                    value={
                      asStr(employee.email) ? (
                        <a href={`mailto:${employee.email}`} className="text-primary hover:underline">
                          {employee.email}
                        </a>
                      ) : null
                    }
                  />
                  <DetailRow label="Phone" value={asStr(employee.phone)} />
                  <DetailRow label="WhatsApp" value={asStr(e.whatsappNumber)} />
                  <DetailRow label="Work location" value={asStr(e.branchCity)} />
                  {(asStr(e.linkedinUrl) || asStr(e.githubUrl) || asStr(e.twitterUrl) || asStr(e.websiteUrl)) && (
                    <div className="flex items-center gap-3 pt-1">
                      {asStr(e.linkedinUrl) && (
                        <a href={String(e.linkedinUrl)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="LinkedIn">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {asStr(e.githubUrl) && (
                        <a href={String(e.githubUrl)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="GitHub">
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {asStr(e.twitterUrl) && (
                        <a href={String(e.twitterUrl)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="Twitter">
                          <Twitter className="h-4 w-4" />
                        </a>
                      )}
                      {asStr(e.websiteUrl) && (
                        <a href={String(e.websiteUrl)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="Website">
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </DetailCard>
              </div>

              {canSeeSensitive && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <DetailCard
                    icon={Wallet}
                    title="Compensation"
                    action={<Badge variant="outline" className="text-[9px] gap-1"><ShieldAlert className="h-2.5 w-2.5" />You &amp; HR only</Badge>}
                  >
                    <DetailRow label="Monthly" value={monthly} />
                    <DetailRow label="Annual (est.)" value={annual} />
                    <DetailRow label="PAN / Tax ID" value={maskTaxId(e.taxId)} />
                    <DetailRow label="Bank" value={asStr(bank?.bankName)} />
                    <DetailRow label="Account" value={maskAccount(bank?.accountNumber)} />
                    <DetailRow label="IFSC" value={asStr(bank?.ifsc)} />
                    {!monthly && !maskTaxId(e.taxId) && !asStr(bank?.bankName) && (
                      <p className="text-xs text-muted-foreground">No compensation details on file.</p>
                    )}
                  </DetailCard>

                  <DetailCard
                    icon={User}
                    title="Personal"
                    action={<Badge variant="outline" className="text-[9px] gap-1"><ShieldAlert className="h-2.5 w-2.5" />You &amp; HR only</Badge>}
                  >
                    <DetailRow label="Date of birth" value={dob ? <span className="inline-flex items-center gap-1"><Cake className="h-3 w-3 text-muted-foreground" />{dob}</span> : null} />
                    <DetailRow label="Gender" value={genderLabel} />
                    <DetailRow
                      label="Emergency contact"
                      value={emergency?.name ? `${emergency.name}${emergency.relation ? ` (${emergency.relation})` : ""}` : null}
                    />
                    <DetailRow label="Emergency phone" value={asStr(emergency?.phone)} />
                    {!dob && !genderLabel && !emergency?.name && (
                      <p className="text-xs text-muted-foreground">No personal details on file.</p>
                    )}
                  </DetailCard>
                </div>
              )}

              {skillsList.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills &amp; Expertise</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsList.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <ManagerScorecardSection employeeId={employee.id} />

              <DirectReportsSection employeeId={employee.id} />

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Projects</h3>
                    <EmployeeProjectsList
                      projects={(projects ?? []) as unknown as Parameters<typeof EmployeeProjectsList>[0]["projects"]}
                    />
                  </CardContent>
                </Card>
                <Card className="min-w-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Assigned Tickets
                      </h3>
                      {(ticketsResult?.data?.length ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ticketsResult?.data?.length}
                        </Badge>
                      )}
                    </div>
                    <EmployeeTicketsList
                      tickets={(ticketsResult?.data ?? []) as Parameters<typeof EmployeeTicketsList>[0]["tickets"]}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="flex-1 min-h-0 overflow-y-auto">
            <div className="pb-6">
              <EmployeeAttendanceHistory userId={employee.id} />
            </div>
          </TabsContent>

          {isSelf && (
            <TabsContent value="my-profile" className="flex-1 min-h-0 overflow-y-auto">
              <div className="pb-4">
                <SelfEditProfileForm
                  employee={employeeAsEmployee}
                  onSaved={() => router.refresh()}
                />
              </div>
            </TabsContent>
          )}

          {canManage && (
            <TabsContent value="profile" className="flex-1 min-h-0 overflow-y-auto">
              <div className="pb-4">
                <EditEmployeeForm employee={employee} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </PageWrapper>

      <ConfirmDialog
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        title="Terminate Employee"
        description={`Are you sure you want to terminate ${employeeName}? They will lose access immediately.`}
        confirmLabel="Terminate"
        destructive
        onConfirm={handleTerminateConfirm}
      />

      <Sheet open={letterSheetOpen} onOpenChange={(o) => { setLetterSheetOpen(o); if (!o) { setLetterTemplateId(""); setLetterExtraVars({}); } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Generate HR Letter</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5">
              <p className="text-xs font-medium">{employee.firstName} {employee.lastName}</p>
              <p className="text-[10px] text-muted-foreground">{employee.designation ?? employee.role ?? ""}{employee.employeeId ? ` · ${employee.employeeId}` : ""}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Template <span className="text-destructive">*</span></Label>
              {hrTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No HR letter templates found. Create one at{" "}
                  <Link href="/hr/offer-letter-templates" className="underline text-primary">HR Letter Templates</Link>.
                </p>
              ) : (
                <Select value={letterTemplateId} onValueChange={(v) => { setLetterTemplateId(v); setLetterExtraVars({}); }}>
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue placeholder="Select a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {HR_LETTER_DOCUMENT_TYPES.filter((d) => d.value !== "OFFER_LETTER").map((docType) => {
                      const group = hrTemplates.filter((t) => t.documentType === docType.value);
                      if (!group.length) return null;
                      return group.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)} className="text-sm">
                          <span className="text-[10px] text-muted-foreground mr-1">[{docType.label}]</span>
                          {t.name}
                        </SelectItem>
                      ));
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {extraFields.length > 0 && (
              <div className="space-y-3">
                {extraFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      type={field.type ?? "text"}
                      value={letterExtraVars[field.key] ?? ""}
                      onChange={(e) => setLetterExtraVars((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="text-sm h-9"
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedTemplate && (
              <p className="text-[10px] text-muted-foreground">
                Employee name, ID, and designation will be filled automatically from their profile.
              </p>
            )}
          </div>
          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setLetterSheetOpen(false)} disabled={letterGenerating}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateLetter}
              disabled={!letterTemplateId || letterGenerating}
            >
              {letterGenerating ? "Generating…" : "Download PDF"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
