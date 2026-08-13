"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { cn } from "@/lib/utils";
import { useOrgSettings, useOrgMembers } from "@/lib/api/hooks/organization";
import { ROLES } from "@/lib/constants/roles";
import type { OrgMember } from "@/types/organization";
import { useHrDepartments, useCreateJobOpening } from "@/lib/api/hooks/hr";
import { useInterviewQuestions, useJobPosting, useUpdateJobOpening, useHiringFlows } from "@/lib/api/hooks/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import { sanitizeStrictName, isStrictNameChar } from "@/lib/validations/text-rules";
import {
  INDIA_STATES_UTS,
  getIndianCitiesForState,
} from "@/lib/data/india-locations";
import {
  jobOpeningSchema,
  jobOpeningUpdateSchema,
  JOB_OPENING_LIMITS,
  JOB_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
  CURRENCY_OPTIONS,
  SALARY_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  INTERVIEW_ROUND_OPTIONS,
  JOB_VISIBILITY_OPTIONS,
  JOB_PRIORITY_OPTIONS,
} from "@/lib/validations/job-opening";
import { clampIntegerString } from "@/lib/numeric-input";
import {
  EMPTY_JOB_OPENING_FORM,
  jobOpeningRecordToFormState,
  type JobOpeningFormState,
  type JobOpeningRecord,
} from "@/lib/hr/job-opening-form-state";
import { APPLICATION_FIELD_DEFS, resolveFieldVisibility } from "@/lib/hr/application-field-config";
import { formatJobPostingStatusLabel } from "@/lib/hr/job-posting-format";
import type { JobPostingStatus } from "@/types/hr";

type FieldErrors = Record<string, string>;
type FormState = JobOpeningFormState;

const INITIAL = EMPTY_JOB_OPENING_FORM;

const EDIT_STATUS_OPTIONS: JobPostingStatus[] = ["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"];

const SECTIONS = [
  { id: "basic", n: 1, title: "Basic Job Details", sub: "Role, type & openings" },
  { id: "location", n: 2, title: "Location Details", sub: "Where the job is based" },
  { id: "compensation", n: 3, title: "Compensation Details", sub: "Salary & benefits" },
  { id: "experience", n: 4, title: "Experience & Education", sub: "Experience & qualification" },
  { id: "skills", n: 5, title: "Skills & Tags", sub: "Required skills & tags" },
  { id: "description", n: 6, title: "Job Description", sub: "Overview & responsibilities" },
  { id: "workflow", n: 7, title: "Hiring Workflow", sub: "Interview process" },
  { id: "application", n: 8, title: "Application Settings", sub: "Application preferences" },
  { id: "status", n: 9, title: "Job Status & Visibility", sub: "Status & deadline" },
  { id: "additional", n: 10, title: "Additional Settings", sub: "Priority & approvals" },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive mt-1">{message}</p>;
}

function FieldCharCount({
  length,
  max,
  min,
}: {
  length: number;
  max: number;
  min?: number;
}) {
  const tooShort = min != null && length > 0 && length < min;
  const atMax = length >= max;
  return (
    <p
      className={cn(
        "text-[11px] text-muted-foreground text-right mt-1",
        (tooShort || atMax) && "text-destructive",
        atMax && "font-medium",
      )}
    >
      {min != null ? `${length}/${min} min · ` : ""}
      {length}/{max}
    </p>
  );
}

function Req() {
  return <span className="text-destructive ml-0.5">*</span>;
}

function TagInput({
  value,
  onChange,
  placeholder,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div>
      <Input
        value={draft}
        placeholder={placeholder}
        maxLength={50}
        aria-invalid={error ? true : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs font-normal">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== tag))} aria-label={`Remove ${tag}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <FieldError message={error} />
    </div>
  );
}

function hiringManagerPickLabel(m: Pick<OrgMember, "name" | "email" | "role">): string {
  const who = (m.name?.trim() || m.email).trim();
  const chunk = `${who} (${m.role})`;
  if (chunk.length <= 200) return chunk;
  return `${who.slice(0, 80)} (${m.role})`.slice(0, 200);
}

function SectionCard({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
            {n}
          </span>
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export interface JobOpeningFormProps {
  jobId?: number;
}

export function JobOpeningForm({ jobId }: JobOpeningFormProps) {
  const isEdit = jobId != null && jobId > 0;
  const router = useRouter();
  const pathname = usePathname();
  const hiringFlowsHref = `/hr/recruitment/hiring-flows?returnTo=${encodeURIComponent(pathname)}`;
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hydrated, setHydrated] = useState(!isEdit);
  const createJob = useCreateJobOpening();
  const updateJob = useUpdateJobOpening();
  const { data: existingJob, isLoading: jobLoading, isError: jobError } = useJobPosting(jobId ?? 0);

  useEffect(() => {
    if (!isEdit || !existingJob) return;
    setForm(jobOpeningRecordToFormState(existingJob as unknown as JobOpeningRecord));
    setHydrated(true);
  }, [isEdit, existingJob]);

  const { data: departments } = useHrDepartments();
  const { data: questions } = useInterviewQuestions();
  const { data: hiringFlows } = useHiringFlows();
  const { data: orgSettings, refetch: refetchOrgSettings, isFetching: orgSettingsFetching } = useOrgSettings({
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: hiringManagersRes, isLoading: hiringManagersLoading } = useOrgMembers(
    1,
    500,
    undefined,
    { roles: [ROLES.CEO, ROLES.HR], staleTime: 60_000 },
  );

  const hiringManagerOptions = useMemo(() => {
    const rows = hiringManagersRes?.data ?? [];
    return [...rows]
      .map((m) => hiringManagerPickLabel(m))
      .sort((a, b) => a.localeCompare(b));
  }, [hiringManagersRes?.data]);

  const officeLocationPresets = useMemo(() => {
    const raw = orgSettings?.jobOfficeLocations ?? [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const loc of raw) {
      if (typeof loc !== "object" || !loc.name) continue;
      const k = loc.name.trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(loc.name.trim());
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [orgSettings?.jobOfficeLocations]);

  const officeLocationMap = useMemo(() => {
    const map = new Map<string, { city: string; state: string; country: string }>();
    for (const loc of orgSettings?.jobOfficeLocations ?? []) {
      if (typeof loc !== "object" || !loc.name) continue;
      map.set(loc.name.trim().toLowerCase(), { city: loc.city, state: loc.state, country: loc.country });
    }
    return map;
  }, [orgSettings?.jobOfficeLocations]);

  const questionBanks = useMemo(() => {
    const list = Array.isArray(questions) ? questions : [];
    const set = new Set<string>();
    for (const q of list) {
      const cat = (q as { category?: string | null }).category;
      if (cat) set.add(cat);
    }
    return [...set].sort();
  }, [questions]);

  const indianCityOptions = useMemo(
    () => (form.country === "India" ? [...getIndianCitiesForState(form.indiaState)] : []),
    [form.country, form.indiaState],
  );

  const setField = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => {
      if (!p[key as string]) return p;
      const next = { ...p };
      delete next[key as string];
      return next;
    });
  }, []);

  const blockNonStrictKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isStrictNameChar(e.key)) {
      e.preventDefault();
    }
  };

  const toFloat = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(/,/g, "")));

  const buildPayload = useCallback(() => {
      const status = form.status;
      const resolvedStateCity =
        form.country === "India"
          ? [form.indiaState, form.indiaCity].filter((s) => s.trim()).join(", ")
          : form.stateCity;
      return {
        status,
        title: form.title,
        departmentId: form.departmentId || undefined,
        role: form.role,
        type: form.type || undefined,
        workMode: form.workMode || undefined,
        openings: form.openings || undefined,
        country: form.country,
        stateCity: resolvedStateCity,
        officeLocation: form.officeLocation,
        salaryMin: toFloat(form.salaryMin),
        salaryMax: toFloat(form.salaryMax),
        currency: form.currency || undefined,
        salaryType: form.salaryType || undefined,
        bonus: form.bonus,
        minExperience: form.minExperience || undefined,
        maxExperience: form.maxExperience || undefined,
        educationLevel: form.educationLevel || undefined,
        requiredSkills: form.requiredSkills,
        preferredSkills: form.preferredSkills,
        tags: form.tags,
        overview: form.overview,
        responsibilities: form.responsibilities,
        requirements: form.requirements,
        benefits: form.benefits,
        hiringManager: form.hiringManager,
        interviewRounds: form.interviewRounds,
        questionBank: form.questionBank,
        resumeRequired: (form.applicationFields?.resume ?? "required") === "required",
        coverLetterRequired: (form.applicationFields?.coverLetter ?? "optional") === "required",
        customFields: form.customFields,
        visibility: form.visibility || undefined,
        applicationDeadline: form.applicationDeadline,
        priority: form.priority || undefined,
        referralEnabled: form.referralEnabled,
        approvalRequired: form.approvalRequired,
        hiringFlowTemplateId: form.hiringFlowTemplateId ? Number(form.hiringFlowTemplateId) : undefined,
        applicationFields: Object.keys(form.applicationFields ?? {}).length > 0 ? form.applicationFields : undefined,
      };
    },
    [form]
  );

  const submit = useCallback(
    (statusOverride?: "DRAFT" | "OPEN") => {
      const status = statusOverride ?? form.status;
      if (status === "OPEN" && form.country === "India") {
        if (!form.indiaState.trim() || !form.indiaCity.trim()) {
          const map: FieldErrors = {};
          if (!form.indiaState.trim()) map.indiaState = "Select state";
          if (!form.indiaCity.trim()) map.indiaCity = "Select city";
          setErrors((prev) => ({ ...prev, ...map }));
          toast.error("Please select state and city for jobs in India");
          return;
        }
      }
      const schema = isEdit ? jobOpeningUpdateSchema : jobOpeningSchema;
      const parsed = schema.safeParse({ ...buildPayload(), status });
      if (!parsed.success) {
        const map: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "");
          if (key && !map[key]) map[key] = issue.message;
        }
        setErrors(map);
        toast.error(Object.values(map)[0] ?? "Please fix the highlighted fields");
        return;
      }
      if (isEdit && jobId) {
        updateJob.mutate(
          { id: jobId, ...parsed.data },
          {
            onSuccess: () => {
              toast.success(status === "OPEN" ? "Job updated and published" : "Job updated");
              router.push("/hr/recruitment/jobs");
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
        return;
      }

      createJob.mutate(parsed.data, {
        onSuccess: () => {
          toast.success(status === "OPEN" ? "Job published" : "Draft saved");
          router.push("/hr/recruitment/jobs");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [buildPayload, createJob, updateJob, router, form.country, form.indiaState, form.indiaCity, form.status, isEdit, jobId]
  );

  const saveAsDraft = () => {
    setField("status", "DRAFT");
    submit("DRAFT");
  };

  const publishJob = () => {
    setField("status", "OPEN");
    submit("OPEN");
  };

  const toggleRound = (round: string, checked: boolean) =>
    setField(
      "interviewRounds",
      checked ? [...form.interviewRounds, round] : form.interviewRounds.filter((r) => r !== round)
    );

  const isPending = isEdit ? updateJob.isPending : createJob.isPending;

  const backAction = <PageBackButton fallback="/hr/recruitment/jobs" />;

  const actions = (
    <div className="flex gap-2">
      {backAction}
      {isEdit ? (
        <>
          <Button size="sm" disabled={isPending || !hydrated} onClick={() => submit()}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </>
      ) : (
        <>
          <Button variant="outline" size="sm" disabled={isPending} onClick={saveAsDraft}>
            Save as Draft
          </Button>
          <Button size="sm" disabled={isPending} onClick={publishJob}>
            Publish Job
          </Button>
        </>
      )}
    </div>
  );

  if (isEdit && jobLoading) {
    return (
      <PageWrapper
        title="Edit Job Opening"
        subtitle="Loading job details…"
        stickyHeader
        actions={backAction}
      >
        <div className="space-y-4 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isEdit && (jobError || (!jobLoading && !existingJob))) {
    return (
      <PageWrapper
        title="Edit Job Opening"
        subtitle="Job not found"
        stickyHeader
        actions={backAction}
      >
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            This job posting could not be loaded. It may have been deleted.
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/hr/recruitment/jobs">Back to jobs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={isEdit ? "Edit Job Opening" : "Create New Job Opening"}
      subtitle={
        isEdit
          ? "Update all sections — same layout as creating a new job"
          : "Fill in the details to create a new job posting"
      }
      actions={actions}
      stickyHeader
    >
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-6 lg:items-start">
        <nav className="hidden lg:block sticky top-20 space-y-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-muted/60 transition-colors"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold">
                {s.n}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium leading-tight">{s.title}</span>
                <span className="block text-[10px] text-muted-foreground">{s.sub}</span>
              </span>
            </a>
          ))}
        </nav>

        <div className="space-y-4 min-w-0">
          <SectionCard id="basic" n={1} title="Basic Job Details">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium">Job Title<Req /></Label>
                <Input className="mt-1" placeholder="e.g. Software Engineer" maxLength={150} value={form.title} onKeyDown={blockNonStrictKey} onChange={(e) => setField("title", sanitizeStrictName(e.target.value))} aria-invalid={errors.title ? true : undefined} />
                <FieldError message={errors.title} />
              </div>
              <div>
                <Label className="text-xs font-medium">Department<Req /></Label>
                <Select value={form.departmentId} onValueChange={(v) => setField("departmentId", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {(departments ?? []).map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.departmentId} />
              </div>
              <div>
                <Label className="text-xs font-medium">Role<Req /></Label>
                <Input className="mt-1" placeholder="e.g. Frontend Developer" maxLength={120} value={form.role} onChange={(e) => setField("role", e.target.value)} aria-invalid={errors.role ? true : undefined} />
                <FieldError message={errors.role} />
              </div>
              <div>
                <Label className="text-xs font-medium">Job Type<Req /></Label>
                <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select job type" /></SelectTrigger>
                  <SelectContent>
                    {JOB_TYPE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.type} />
              </div>
              <div>
                <Label className="text-xs font-medium">Work Mode<Req /></Label>
                <Select value={form.workMode} onValueChange={(v) => setField("workMode", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select work mode" /></SelectTrigger>
                  <SelectContent>
                    {WORK_MODE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.workMode} />
              </div>
              <div>
                <Label className="text-xs font-medium">Number of Openings<Req /></Label>
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  max={JOB_OPENING_LIMITS.openingsMax}
                  placeholder="e.g. 1, 2, 5"
                  value={form.openings}
                  onChange={(e) =>
                    setField(
                      "openings",
                      clampIntegerString(e.target.value, JOB_OPENING_LIMITS.openingsMax, 3),
                    )
                  }
                  aria-invalid={errors.openings ? true : undefined}
                />
                <FieldError message={errors.openings} />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Maximum {JOB_OPENING_LIMITS.openingsMax} openings per posting.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="location" n={2} title="Location Details">
            <div
              className={cn(
                "grid gap-4",
                form.country === "India" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
              )}
            >
              <div>
                <Label className="text-xs font-medium">Country<Req /></Label>
                <Select
                  value={form.country || undefined}
                  onValueChange={(v) => {
                    setField("country", v);
                    if (v !== "India") {
                      setField("indiaState", "");
                      setField("indiaCity", "");
                    } else {
                      setField("stateCity", "");
                    }
                  }}
                >
                  <SelectTrigger className="mt-1" aria-invalid={errors.country ? true : undefined}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.country} />
              </div>
              {form.country === "India" ? (
                <>
                  <div>
                    <Label className="text-xs font-medium">State<Req /></Label>
                    <SearchableCombobox
                      className="mt-1"
                      options={INDIA_STATES_UTS}
                      value={form.indiaState}
                      onValueChange={(v) => {
                        setField("indiaState", v);
                        setField("indiaCity", "");
                      }}
                      placeholder="Search state…"
                      searchPlaceholder="Search states…"
                      emptyMessage="No state found."
                      aria-label="Job location state"
                      aria-invalid={errors.indiaState || errors.stateCity ? true : undefined}
                    />
                    <FieldError message={errors.indiaState ?? errors.stateCity} />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">City<Req /></Label>
                    <SearchableCombobox
                      className="mt-1"
                      options={indianCityOptions}
                      value={form.indiaCity}
                      onValueChange={(v) => setField("indiaCity", v)}
                      placeholder={form.indiaState ? "Search city…" : "Select state first"}
                      searchPlaceholder="Search cities…"
                      emptyMessage={form.indiaState ? "No city found." : "Select a state first."}
                      disabled={!form.indiaState}
                      aria-label="Job location city"
                      aria-invalid={errors.indiaCity || errors.stateCity ? true : undefined}
                    />
                    <FieldError message={errors.indiaCity} />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-xs font-medium">State / Region<Req /></Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. California, Los Angeles"
                    maxLength={150}
                    value={form.stateCity}
                    onKeyDown={blockNonStrictKey}
                    onChange={(e) => setField("stateCity", sanitizeStrictName(e.target.value))}
                    aria-invalid={errors.stateCity ? true : undefined}
                  />
                  <FieldError message={errors.stateCity} />
                </div>
              )}
              <div>
                <Label className="text-xs font-medium">Office Location<Req /></Label>
                {officeLocationPresets.length > 0 ? (
                  <SearchableCombobox
                    className="mt-1"
                    options={officeLocationPresets}
                    value={form.officeLocation}
                    onValueChange={(v) => {
                      setField("officeLocation", v);
                      const preset = officeLocationMap.get(v.toLowerCase());
                      if (preset) {
                        setField("country", preset.country);
                        if (preset.country === "India") {
                          setField("indiaState", preset.state);
                          setField("indiaCity", preset.city);
                          setField("stateCity", "");
                        } else {
                          setField("stateCity", [preset.state, preset.city].filter(Boolean).join(", "));
                          setField("indiaState", "");
                          setField("indiaCity", "");
                        }
                      }
                    }}
                    placeholder="Search office location…"
                    searchPlaceholder="Search…"
                    emptyMessage="No match."
                    aria-label="Office location"
                    aria-invalid={errors.officeLocation ? true : undefined}
                  />
                ) : (
                  <Input
                    className="mt-1"
                    placeholder="e.g. Head Office - Bangalore"
                    maxLength={200}
                    value={form.officeLocation}
                    onKeyDown={blockNonStrictKey}
                    onChange={(e) => setField("officeLocation", sanitizeStrictName(e.target.value))}
                    aria-invalid={errors.officeLocation ? true : undefined}
                  />
                )}
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {officeLocationPresets.length > 0 ? (
                    <>
                      Choosing from your org list.{" "}
                      <Link
                        href="/settings/job-office-locations"
                        className="underline underline-offset-2"
                      >
                        Manage locations
                      </Link>
                    </>
                  ) : (
                    <>
                      Add reusable names under{" "}
                      <Link
                        href="/settings/job-office-locations"
                        className="underline underline-offset-2"
                      >
                        Settings → Job office locations
                      </Link>{" "}
                      to enable a searchable picker here.{" "}
                      <button
                        type="button"
                        className="underline underline-offset-2 text-foreground font-medium disabled:opacity-50"
                        disabled={orgSettingsFetching}
                        onClick={() => {
                          void refetchOrgSettings().then((r) => {
                            const n = (r.data?.jobOfficeLocations ?? []).filter(Boolean).length;
                            if (n > 0) toast.success(`Loaded ${n} office location${n === 1 ? "" : "s"}`);
                            else toast.message("No saved office locations yet", { description: "Add and save them under Job office locations, then try again." });
                          });
                        }}
                      >
                        {orgSettingsFetching ? "Refreshing…" : "Refresh from settings"}
                      </button>
                    </>
                  )}
                </p>
                <FieldError message={errors.officeLocation} />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="compensation" n={3} title="Compensation Details">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium">Salary Range<Req /></Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input type="number" min={0} placeholder="Min Salary" value={form.salaryMin} onChange={(e) => setField("salaryMin", e.target.value)} aria-invalid={errors.salaryMin ? true : undefined} />
                  <span className="text-muted-foreground">–</span>
                  <Input type="number" min={0} placeholder="Max Salary" value={form.salaryMax} onChange={(e) => setField("salaryMax", e.target.value)} aria-invalid={errors.salaryMax ? true : undefined} />
                </div>
                <FieldError message={errors.salaryMin ?? errors.salaryMax} />
              </div>
              <div>
                <Label className="text-xs font-medium">Currency<Req /></Label>
                <Select value={form.currency} onValueChange={(v) => setField("currency", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.currency} />
              </div>
              <div>
                <Label className="text-xs font-medium">Salary Type<Req /></Label>
                <Select value={form.salaryType} onValueChange={(v) => setField("salaryType", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select salary type" /></SelectTrigger>
                  <SelectContent>
                    {SALARY_TYPE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.salaryType} />
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-xs font-medium">Bonus / Incentive (Optional)</Label>
              <Input className="mt-1" placeholder="e.g. Performance Bonus, Quarterly Incentive" maxLength={200} value={form.bonus} onChange={(e) => setField("bonus", e.target.value)} />
            </div>
          </SectionCard>

          <SectionCard id="experience" n={4} title="Experience & Education">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium">Minimum Experience<Req /></Label>
                <Input className="mt-1" type="number" min={0} max={60} placeholder="e.g. 0, 1, 3 years" value={form.minExperience} onChange={(e) => setField("minExperience", e.target.value)} aria-invalid={errors.minExperience ? true : undefined} />
                <FieldError message={errors.minExperience ?? errors.maxExperience} />
              </div>
              <div>
                <Label className="text-xs font-medium">Maximum Experience</Label>
                <Input className="mt-1" type="number" min={0} max={60} placeholder="e.g. 2, 5, 10 years" value={form.maxExperience} onChange={(e) => setField("maxExperience", e.target.value)} aria-invalid={errors.maxExperience || errors.minExperience ? true : undefined} />
              </div>
              <div>
                <Label className="text-xs font-medium">Education Level<Req /></Label>
                <Select value={form.educationLevel} onValueChange={(v) => setField("educationLevel", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select education level" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVEL_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.educationLevel} />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="skills" n={5} title="Skills & Tags">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium">Required Skills<Req /></Label>
                <div className="mt-1">
                  <TagInput value={form.requiredSkills} onChange={(v) => setField("requiredSkills", v)} placeholder="Add skills and press enter" error={errors.requiredSkills} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Preferred Skills</Label>
                <div className="mt-1">
                  <TagInput value={form.preferredSkills} onChange={(v) => setField("preferredSkills", v)} placeholder="Add preferred skills" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Tags</Label>
                <div className="mt-1">
                  <TagInput value={form.tags} onChange={(v) => setField("tags", v)} placeholder="Add tags and press enter" />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="description" n={6} title="Job Description">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium">Overview<Req /></Label>
                <Textarea className="mt-1 min-h-28" placeholder="e.g. We are looking for a skilled developer…" maxLength={JOB_OPENING_LIMITS.overviewMax} value={form.overview} onChange={(e) => setField("overview", e.target.value)} aria-invalid={errors.overview ? true : undefined} />
                <FieldCharCount length={form.overview.length} min={JOB_OPENING_LIMITS.overviewMin} max={JOB_OPENING_LIMITS.overviewMax} />
                <FieldError message={errors.overview} />
              </div>
              <div>
                <Label className="text-xs font-medium">Responsibilities<Req /></Label>
                <Textarea className="mt-1 min-h-28" placeholder="e.g. Build UI components, API integration" maxLength={JOB_OPENING_LIMITS.longTextMax} value={form.responsibilities} onChange={(e) => setField("responsibilities", e.target.value)} aria-invalid={errors.responsibilities ? true : undefined} />
                <FieldCharCount length={form.responsibilities.length} min={JOB_OPENING_LIMITS.longTextMin} max={JOB_OPENING_LIMITS.longTextMax} />
                <FieldError message={errors.responsibilities} />
              </div>
              <div>
                <Label className="text-xs font-medium">Requirements<Req /></Label>
                <Textarea className="mt-1 min-h-28" placeholder="e.g. 3+ years experience in React" maxLength={JOB_OPENING_LIMITS.longTextMax} value={form.requirements} onChange={(e) => setField("requirements", e.target.value)} aria-invalid={errors.requirements ? true : undefined} />
                <FieldCharCount length={form.requirements.length} min={JOB_OPENING_LIMITS.longTextMin} max={JOB_OPENING_LIMITS.longTextMax} />
                <FieldError message={errors.requirements} />
              </div>
              <div>
                <Label className="text-xs font-medium">Benefits</Label>
                <Textarea className="mt-1 min-h-28" placeholder="e.g. Health insurance, Work from home" maxLength={JOB_OPENING_LIMITS.longTextMax} value={form.benefits} onChange={(e) => setField("benefits", e.target.value)} />
                <FieldCharCount length={form.benefits.length} max={JOB_OPENING_LIMITS.longTextMax} />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="workflow" n={7} title="Hiring Workflow">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Hiring Flow Template<Req /></Label>
                <Select
                  value={form.hiringFlowTemplateId || "__none__"}
                  onValueChange={(v) => {
                    const id = v === "__none__" ? "" : v;
                    setField("hiringFlowTemplateId", id);
                    if (id) setField("interviewRounds", []);
                  }}
                >
                  <SelectTrigger className="mt-1" aria-invalid={errors.hiringFlowTemplateId ? true : undefined}>
                    <SelectValue placeholder="Select a hiring flow…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No flow selected</SelectItem>
                    {(hiringFlows ?? []).map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name}
                        {f.isDefault && (
                          <span className="ml-2 text-[10px] text-muted-foreground">(default)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Determines the interview rounds and pipeline stages for this job.{" "}
                  <Link href={hiringFlowsHref} className="underline underline-offset-2">
                    Manage hiring flows
                  </Link>
                </p>
                <FieldError message={errors.hiringFlowTemplateId} />
                {form.hiringFlowTemplateId && (() => {
                  const flow = (hiringFlows ?? []).find((f) => String(f.id) === form.hiringFlowTemplateId);
                  if (!flow?.rounds?.length) return null;
                  return (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {flow.rounds.map((r, i) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1 rounded-full border border-input bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium"
                        >
                          <span className="text-muted-foreground">{i + 1}.</span>
                          {r.name}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div>
                <Label className="text-xs font-medium">Hiring Manager<Req /></Label>
                {hiringManagersLoading ? (
                  <div
                    className="mt-1 h-9 rounded-md border bg-muted/40 animate-pulse"
                    aria-busy="true"
                    aria-label="Loading hiring managers"
                  />
                ) : hiringManagerOptions.length > 0 ? (
                  <SearchableCombobox
                    className="mt-1"
                    options={hiringManagerOptions}
                    value={form.hiringManager}
                    onValueChange={(v) => setField("hiringManager", v)}
                    placeholder="Search CEO or HR…"
                    searchPlaceholder="Search by name or role…"
                    emptyMessage="No CEO or HR member matches."
                    aria-label="Hiring manager"
                    aria-invalid={errors.hiringManager ? true : undefined}
                  />
                ) : (
                  <Input
                    className="mt-1"
                    placeholder="e.g. John Doe, HR Manager"
                    maxLength={200}
                    value={form.hiringManager}
                    onChange={(e) => setField("hiringManager", e.target.value)}
                    aria-invalid={errors.hiringManager ? true : undefined}
                  />
                )}
                {!hiringManagersLoading && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {hiringManagerOptions.length > 0 ? (
                      "Lists organization members with CEO or HR role. Search by name or role."
                    ) : (
                      <>
                        No CEO or HR members found in this org. Invite them under{" "}
                        <Link href="/settings/members" className="underline underline-offset-2">
                          Settings → Members
                        </Link>
                        , or type the hiring manager in this field.
                      </>
                    )}
                  </p>
                )}
                <FieldError message={errors.hiringManager} />
              </div>
              {!form.hiringFlowTemplateId && (
              <div>
                <Label className="text-xs font-medium">Interview Rounds<Req /></Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {INTERVIEW_ROUND_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm cursor-pointer">
                      <Checkbox checked={form.interviewRounds.includes(o.value)} onCheckedChange={(c) => toggleRound(o.value, c === true)} />
                      {o.label}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Legacy fallback when no hiring flow template is selected.
                </p>
                <FieldError message={errors.interviewRounds} />
              </div>
              )}
              <div>
                <Label className="text-xs font-medium">Question Bank Mapping<Req /></Label>
                <Select value={form.questionBank} onValueChange={(v) => setField("questionBank", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select question bank" /></SelectTrigger>
                  <SelectContent>
                    {questionBanks.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No question categories found.</div>
                    ) : (
                      questionBanks.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))
                    )}
                  </SelectContent>
                </Select>
                <FieldError message={errors.questionBank} />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="application" n={8} title="Application Form Fields">
            <p className="text-xs text-muted-foreground mb-4">
              Choose which fields candidates must fill in, can optionally fill, or won&apos;t see at all. Name and email are always required.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {APPLICATION_FIELD_DEFS.map(({ key, label }) => {
                const effective = resolveFieldVisibility(form.applicationFields, key);
                return (
                  <div key={key} className="rounded-lg border border-input bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-medium">{label}</p>
                    <div className="flex gap-1">
                      {(["required", "optional", "hidden"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setField("applicationFields", { ...form.applicationFields, [key]: v })}
                          className={cn(
                            "flex-1 rounded px-2 py-1 text-[11px] font-medium capitalize transition-colors",
                            effective === v
                              ? v === "required"
                                ? "bg-primary text-primary-foreground"
                                : v === "hidden"
                                  ? "bg-destructive/80 text-white"
                                  : "bg-muted-foreground/20 text-foreground"
                              : "text-muted-foreground hover:bg-muted/60"
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Label className="text-xs font-medium">Custom Fields (Optional)</Label>
              <div className="mt-1">
                <TagInput value={form.customFields} onChange={(v) => setField("customFields", v)} placeholder="e.g. Portfolio link, LinkedIn URL, Notice Period" />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="status" n={9} title="Job Status & Visibility">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setField("status", v as FormState["status"])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isEdit ? EDIT_STATUS_OPTIONS : (["DRAFT", "OPEN"] as const)).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "OPEN" && !isEdit ? "Open (Published)" : formatJobPostingStatusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {isEdit
                    ? "Open status requires all mandatory fields when saving."
                    : "Draft saves incomplete jobs. Open publishes and requires all mandatory fields."}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium">Visibility<Req /></Label>
                <Select value={form.visibility} onValueChange={(v) => setField("visibility", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select visibility" /></SelectTrigger>
                  <SelectContent>
                    {JOB_VISIBILITY_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.visibility} />
              </div>
              <div>
                <Label className="text-xs font-medium">Application Deadline</Label>
                <div className="mt-1">
                  <DatePicker value={form.applicationDeadline} onChange={(v) => setField("applicationDeadline", v)} placeholder="Select date" fromDate={new Date()} />
                </div>
                <FieldError message={errors.applicationDeadline} />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="additional" n={10} title="Additional Settings">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-medium">Priority<Req /></Label>
                <Select value={form.priority} onValueChange={(v) => setField("priority", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {JOB_PRIORITY_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.priority} />
              </div>
              <div>
                <Label className="text-xs font-medium">Referral Enabled</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Switch checked={form.referralEnabled} onCheckedChange={(c) => setField("referralEnabled", c)} />
                  <span className="text-sm text-muted-foreground">{form.referralEnabled ? "Yes" : "No"}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Approval Required</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Switch checked={form.approvalRequired} onCheckedChange={(c) => setField("approvalRequired", c)} />
                  <span className="text-sm text-muted-foreground">{form.approvalRequired ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end gap-2 pb-6">
            {isEdit ? (
              <Button disabled={isPending || !hydrated} onClick={() => submit()}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            ) : (
              <>
                <Button variant="outline" disabled={isPending} onClick={saveAsDraft}>
                  Save as Draft
                </Button>
                <Button disabled={isPending} onClick={publishJob}>
                  Publish Job
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
