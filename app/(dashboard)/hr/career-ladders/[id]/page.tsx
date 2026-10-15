"use client";

import { useState, useCallback, use, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { DetailHeader, DetailLayout } from "@/components/shared/detail-header";
import { PropertyList } from "@/components/shared/property-list";
import type { Tone } from "@/lib/design/tones";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronRight, Settings2,
  IndianRupee, Clock3, Layers, CheckCircle2,
} from "lucide-react";
import {
  filterCareerLadderTitleInput,
  getCareerLadderTitleError,
  CAREER_LADDER_STATUSES,
  CAREER_LADDER_TRACK_TYPES,
  CAREER_LADDER_VISIBILITIES,
} from "@/lib/validations/career-ladder";
import { cn } from "@/lib/utils";
import type {
  CareerLadder, CareerLevel,
  CareerLadderStatus, CareerLadderTrackType, CareerLadderVisibility,
} from "@/types/hr";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants/locale";

/** Gold progression: each rung's accent strip a step deeper on the brand scale. */
const LEVEL_COLORS = ["bg-gold-200", "bg-gold-300", "bg-gold-400", "bg-gold-500", "bg-gold-600", "bg-gold-700"].map(
  (strip) => ({ bg: "bg-brand-soft", border: "border-border", text: "text-brand-soft-foreground", strip }),
);

const STATUS_LABELS: Record<CareerLadderStatus, string> = {
  draft: "Draft", active: "Active", archived: "Archived",
};
const STATUS_TONE: Record<CareerLadderStatus, Tone> = {
  draft: "warning",
  active: "success",
  archived: "neutral",
};
const TRACK_LABELS: Record<CareerLadderTrackType, string> = {
  individual_contributor: "Individual Contributor",
  management: "Management",
  technical: "Technical",
  specialist: "Specialist",
};
const VISIBILITY_LABELS: Record<CareerLadderVisibility, string> = {
  all: "All employees",
  department: "Department only",
  admin: "Admin only",
};

const EMPTY_LEVEL = {
  title: "", description: "", minExperience: 0, skills: [] as string[],
  scope: "", responsibilities: [] as string[], behaviors: [] as string[],
  leadershipExpectations: "", promotionCriteria: "",
  salaryBandMin: undefined as number | undefined,
  salaryBandMax: undefined as number | undefined,
  typicalDuration: "",
  competencies: [] as string[],
};

type LevelForm = typeof EMPTY_LEVEL & {
  skillsText: string;
  responsibilitiesText: string;
  behaviorsText: string;
  competenciesText: string;
};

function arrayFromText(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

function formatCurrency(n: number | undefined): string {
  if (n == null) return "";
  return new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
}

function LevelPill({ level, title, color }: { level: number; title: string; color: typeof LEVEL_COLORS[0] }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", color.bg, color.border, color.text)}>
      <span className="font-bold tabular-nums">L{level}</span>
      <span className="max-w-36 truncate">{title}</span>
    </div>
  );
}

export default function CareerLadderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ladderId } = use(params);
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";
  const qc = useQueryClient();
  const ladderKey = ["hr", "career-ladders", ladderId];

  const { data: ladder, isLoading, isError, error, refetch } = useQuery({
    queryKey: ladderKey,
    queryFn: () => apiClient.get<CareerLadder>(`/hr/career-ladders/${ladderId}`),
  });

  const updateLadder = useMutation({
    mutationFn: (data: Partial<CareerLadder>) =>
      apiClient.patch<CareerLadder>(`/hr/career-ladders/${ladderId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ladderKey }),
  });

  const [levelSheet, setLevelSheet]   = useState<"add" | number | null>(null);
  const [deleteLevel, setDeleteLevel] = useState<number | null>(null);
  const [editMeta, setEditMeta]       = useState(false);

  const [metaForm, setMetaForm] = useState({
    title: "", department: "", description: "",
    status: "active" as CareerLadderStatus,
    trackType: "" as CareerLadderTrackType | "",
    visibility: "all" as CareerLadderVisibility,
  });

  const openEditMeta = useCallback(() => {
    if (!ladder) return;
    setMetaForm({
      title: ladder.title,
      department: ladder.department ?? "",
      description: ladder.description ?? "",
      status: ladder.status as CareerLadderStatus,
      trackType: (ladder.trackType as CareerLadderTrackType) ?? "",
      visibility: ladder.visibility as CareerLadderVisibility,
    });
    setEditMeta(true);
  }, [ladder]);

  const handleSaveMeta = useCallback(() => {
    const titleErr = getCareerLadderTitleError(metaForm.title);
    if (titleErr) { toast.error(titleErr); return; }
    if (metaForm.description.length > 500) { toast.error("Description must be 500 characters or less"); return; }
    updateLadder.mutate(
      {
        title: metaForm.title.trim(),
        department: metaForm.department || null,
        description: metaForm.description.trim() || null,
        status: metaForm.status,
        trackType: (metaForm.trackType as CareerLadderTrackType) || null,
        visibility: metaForm.visibility,
      },
      {
        onSuccess: () => { toast.success("Ladder updated"); setEditMeta(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [metaForm, updateLadder]);

  const [form, setForm] = useState<LevelForm>({
    ...EMPTY_LEVEL,
    skillsText: "", responsibilitiesText: "", behaviorsText: "", competenciesText: "",
  });

  const openAdd = useCallback(() => {
    setForm({ ...EMPTY_LEVEL, skillsText: "", responsibilitiesText: "", behaviorsText: "", competenciesText: "" });
    setLevelSheet("add");
  }, []);

  const openEdit = useCallback((level: CareerLevel) => {
    setForm({
      title: level.title,
      description: level.description,
      minExperience: level.minExperience,
      skills: level.skills ?? [],
      scope: level.scope ?? "",
      responsibilities: level.responsibilities ?? [],
      behaviors: level.behaviors ?? [],
      leadershipExpectations: level.leadershipExpectations ?? "",
      promotionCriteria: level.promotionCriteria ?? "",
      salaryBandMin: level.salaryBandMin,
      salaryBandMax: level.salaryBandMax,
      typicalDuration: level.typicalDuration ?? "",
      competencies: level.competencies ?? [],
      skillsText:           (level.skills ?? []).join("\n"),
      responsibilitiesText: (level.responsibilities ?? []).join("\n"),
      behaviorsText:        (level.behaviors ?? []).join("\n"),
      competenciesText:     (level.competencies ?? []).join("\n"),
    });
    setLevelSheet(level.level);
  }, []);

  const handleSaveLevel = useCallback(() => {
    const titleErr = getCareerLadderTitleError(form.title);
    if (titleErr) { toast.error(titleErr); return; }
    if (form.salaryBandMin != null && form.salaryBandMax != null && form.salaryBandMin > form.salaryBandMax) {
      toast.error("Salary band min cannot exceed max"); return;
    }

    const newLevel: CareerLevel = {
      level: levelSheet === "add" ? (ladder?.levels?.length ?? 0) + 1 : (levelSheet as number),
      title: form.title.trim(),
      description: form.description.trim(),
      minExperience: form.minExperience,
      skills: arrayFromText(form.skillsText),
      scope: form.scope?.trim() || undefined,
      responsibilities: arrayFromText(form.responsibilitiesText),
      behaviors: arrayFromText(form.behaviorsText),
      leadershipExpectations: form.leadershipExpectations?.trim() || undefined,
      promotionCriteria: form.promotionCriteria?.trim() || undefined,
      salaryBandMin: form.salaryBandMin,
      salaryBandMax: form.salaryBandMax,
      typicalDuration: form.typicalDuration?.trim() || undefined,
      competencies: arrayFromText(form.competenciesText),
    };

    const existing = (ladder?.levels ?? []) as CareerLevel[];
    const updated =
      levelSheet === "add"
        ? [...existing, newLevel]
        : existing.map((l) => (l.level === levelSheet ? newLevel : l));

    updateLadder.mutate(
      { levels: updated },
      {
        onSuccess: () => {
          toast.success(levelSheet === "add" ? "Level added" : "Level updated");
          setLevelSheet(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [form, levelSheet, ladder, updateLadder]);

  const handleDeleteLevel = useCallback(() => {
    if (deleteLevel === null) return;
    const existing = (ladder?.levels ?? []) as CareerLevel[];
    const filtered = existing
      .filter((l) => l.level !== deleteLevel)
      .map((l, i) => ({ ...l, level: i + 1 }));
    updateLadder.mutate(
      { levels: filtered },
      {
        onSuccess: () => { toast.success("Level removed"); setDeleteLevel(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteLevel, ladder, updateLadder]);

  const levels = useMemo(() => (ladder?.levels ?? []) as CareerLevel[], [ladder]);

  if (isLoading) {
    return (
      <PageWrapper title="Career ladder">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
          <Skeleton className="h-56 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  if (isError && !ladder) {
    return (
      <PageWrapper title="Career ladder">
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  if (!ladder) {
    return (
      <PageWrapper title="Not found">
        <EmptyState
          title="Career ladder not found."
          action={{ label: "Back", href: "/hr/career-ladders" }}
        />
      </PageWrapper>
    );
  }

  const statusTone = STATUS_TONE[ladder.status as CareerLadderStatus] ?? STATUS_TONE.active;
  const statusLbl = STATUS_LABELS[ladder.status as CareerLadderStatus] ?? ladder.status;

  return (
    <div className="flex w-full flex-col space-y-6 px-4 pb-10 pt-6 sm:px-6 xl:px-8">
      <DetailHeader
        back={
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link href="/hr/career-ladders">
              <ArrowLeft className="size-4" aria-hidden="true" />
              All Ladders
            </Link>
          </Button>
        }
        icon={Layers}
        title={ladder.title}
        subtitle={ladder.description ?? "Career progression path"}
        status={<StatusPill tone={statusTone} dot>{statusLbl}</StatusPill>}
        meta={
          <>
            {ladder.department && <span>{ladder.department}</span>}
            {ladder.trackType && (
              <span>{TRACK_LABELS[ladder.trackType as CareerLadderTrackType] ?? ladder.trackType}</span>
            )}
            {levels.length > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Layers className="size-3.5" aria-hidden="true" />{levels.length} level{levels.length !== 1 ? "s" : ""}
              </span>
            )}
          </>
        }
        actions={
          isAdmin ? (
            <>
              <Button variant="outline" size="sm" onClick={openEditMeta}>
                <Settings2 className="size-4" aria-hidden="true" />
                Edit Info
              </Button>
              <Button size="sm" onClick={openAdd}>
                <Plus className="size-4" aria-hidden="true" />
                Add Level
              </Button>
            </>
          ) : undefined
        }
      />

      <DetailLayout
        rail={
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <PropertyList
                items={[
                  { label: "Status", value: <StatusPill tone={statusTone} dot>{statusLbl}</StatusPill> },
                  {
                    label: "Track",
                    value: ladder.trackType
                      ? TRACK_LABELS[ladder.trackType as CareerLadderTrackType] ?? ladder.trackType
                      : null,
                  },
                  {
                    label: "Visibility",
                    value: VISIBILITY_LABELS[ladder.visibility as CareerLadderVisibility] ?? ladder.visibility,
                  },
                  { label: "Department", value: ladder.department || null },
                  { label: "Levels", value: <span className="tabular-nums">{levels.length}</span> },
                ]}
              />
            </CardContent>
          </Card>
        }
        main={
          levels.length === 0 ? (
            <EmptyState
              title="No levels defined yet."
              {...(isAdmin ? { action: { label: "Add First Level", onClick: openAdd } } : {})}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {levels.map((lvl, idx) => (
                  <div key={lvl.level} className="flex items-center gap-1.5">
                    <LevelPill level={lvl.level} title={lvl.title} color={LEVEL_COLORS[idx % LEVEL_COLORS.length]} />
                    {idx < levels.length - 1 && <ChevronRight className="size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />}
                  </div>
                ))}
              </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {levels.map((lvl, idx) => {
                const c = LEVEL_COLORS[idx % LEVEL_COLORS.length];
                const hasSalary = lvl.salaryBandMin != null || lvl.salaryBandMax != null;
                return (
                  <Card key={lvl.level} className="overflow-hidden">
                    <div className={cn("h-1 w-full", c.strip)} aria-hidden="true" />
                    <div className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <LevelPill level={lvl.level} title={lvl.title} color={c} />
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button type="button" size="icon-sm" variant="ghost" aria-label="Edit level" onClick={() => openEdit(lvl)}>
                              <Pencil className="size-4" aria-hidden="true" />
                            </Button>
                            <Button type="button" size="icon-sm" variant="ghost" aria-label="Delete level" className="text-destructive hover:text-destructive" onClick={() => setDeleteLevel(lvl.level)}>
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {lvl.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{lvl.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {lvl.minExperience > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock3 className="size-3 shrink-0" aria-hidden="true" />
                            <span className="tabular-nums">{lvl.minExperience} yr{lvl.minExperience !== 1 ? "s" : ""} exp.</span>
                          </div>
                        )}
                        {lvl.typicalDuration && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
                            <span>{lvl.typicalDuration}</span>
                          </div>
                        )}
                      </div>

                      {hasSalary && (
                        <div className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium tabular-nums", c.bg, c.text)}>
                          <IndianRupee className="size-3 shrink-0" aria-hidden="true" />
                          <span>
                            {lvl.salaryBandMin != null && lvl.salaryBandMax != null
                              ? `${formatCurrency(lvl.salaryBandMin)} – ${formatCurrency(lvl.salaryBandMax)}`
                              : lvl.salaryBandMin != null
                                ? `From ${formatCurrency(lvl.salaryBandMin)}`
                                : `Up to ${formatCurrency(lvl.salaryBandMax)}`}
                          </span>
                        </div>
                      )}

                      {lvl.scope && (
                        <div>
                          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Scope</p>
                          <p className="text-xs text-foreground line-clamp-2">{lvl.scope}</p>
                        </div>
                      )}

                      {(lvl.responsibilities ?? []).length > 0 && (
                        <div>
                          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Responsibilities</p>
                          <ul className="space-y-0.5">
                            {(lvl.responsibilities ?? []).slice(0, 3).map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-success-strong" aria-hidden="true" />
                                <span className="line-clamp-1">{r}</span>
                              </li>
                            ))}
                            {(lvl.responsibilities ?? []).length > 3 && (
                              <li className="text-2xs text-muted-foreground pl-4.5">+{(lvl.responsibilities ?? []).length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {(lvl.competencies ?? []).length > 0 && (
                        <div>
                          <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Competencies</p>
                          <div className="flex flex-wrap gap-1">
                            {(lvl.competencies ?? []).slice(0, 4).map((c) => (
                              <Badge key={c} variant="outline">{c}</Badge>
                            ))}
                            {(lvl.competencies ?? []).length > 4 && (
                              <Badge variant="outline">+{(lvl.competencies ?? []).length - 4}</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {(lvl.skills ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(lvl.skills ?? []).slice(0, 5).map((s) => (
                            <Badge key={s} variant="secondary">{s}</Badge>
                          ))}
                          {(lvl.skills ?? []).length > 5 && (
                            <Badge variant="outline">+{(lvl.skills ?? []).length - 5}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
            </div>
          )
        }
      />

      {isAdmin && (
        <HrSheet
          open={editMeta}
          onOpenChange={(o) => { if (!o) setEditMeta(false); }}
          title="Edit ladder info"
          description="Update the metadata for this career ladder."
          onSubmit={handleSaveMeta}
          submitLabel="Save Changes"
          isPending={updateLadder.isPending}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
              <Input
                value={metaForm.title}
                onChange={(e) => setMetaForm((f) => ({ ...f, title: filterCareerLadderTitleInput(e.target.value) }))}
                maxLength={120}
                placeholder="e.g., Engineering Career Path"
              />
              <p className="text-2xs text-muted-foreground text-right">{metaForm.title.length}/120</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={metaForm.status} onValueChange={(v) => setMetaForm((f) => ({ ...f, status: v as CareerLadderStatus }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAREER_LADDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Visibility</label>
                <Select value={metaForm.visibility} onValueChange={(v) => setMetaForm((f) => ({ ...f, visibility: v as CareerLadderVisibility }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAREER_LADDER_VISIBILITIES.map((v) => (
                      <SelectItem key={v} value={v}>{VISIBILITY_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Track Type</label>
              <Select value={metaForm.trackType || "none"} onValueChange={(v) => setMetaForm((f) => ({ ...f, trackType: v === "none" ? "" : v as CareerLadderTrackType }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="No track type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No track type</SelectItem>
                  {CAREER_LADDER_TRACK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Department</label>
              <Input
                value={metaForm.department}
                onChange={(e) => setMetaForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="e.g., Engineering"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={metaForm.description}
                onChange={(e) => setMetaForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this career path…"
                rows={3}
                maxLength={500}
              />
              <p className="text-2xs text-muted-foreground text-right">{metaForm.description.length}/500</p>
            </div>
          </div>
        </HrSheet>
      )}

      {isAdmin && (
        <HrSheet
          open={levelSheet !== null}
          onOpenChange={(o) => { if (!o) setLevelSheet(null); }}
          title={levelSheet === "add" ? "Add Level" : `Edit Level ${levelSheet}`}
          description="Define what is expected at this level of the career ladder."
          onSubmit={handleSaveLevel}
          submitLabel={levelSheet === "add" ? "Add Level" : "Save Changes"}
          isPending={updateLadder.isPending}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: filterCareerLadderTitleInput(e.target.value) }))}
                placeholder="e.g., Senior Engineer"
                maxLength={120}
                aria-invalid={!!getCareerLadderTitleError(form.title) && form.title.length > 0}
                className={cn(form.title.length > 0 && getCareerLadderTitleError(form.title) && "border-destructive")}
              />
              {form.title.length > 0 && getCareerLadderTitleError(form.title) && (
                <p className="text-2xs text-destructive">{getCareerLadderTitleError(form.title)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief overview of this level…"
                rows={2}
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Min. Experience (yrs)</label>
                <Input
                  type="number"
                  min={0}
                  max={40}
                  value={form.minExperience}
                  onChange={(e) => setForm((f) => ({ ...f, minExperience: Math.max(0, parseInt(e.target.value) || 0) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Typical Duration</label>
                <Input
                  value={form.typicalDuration ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, typicalDuration: e.target.value }))}
                  placeholder="e.g., 2–3 years"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Salary Band (INR)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Min (e.g. 800000)"
                  value={form.salaryBandMin ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? undefined : Number(e.target.value);
                    setForm((f) => ({ ...f, salaryBandMin: v }));
                  }}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Max (e.g. 1200000)"
                  value={form.salaryBandMax ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? undefined : Number(e.target.value);
                    setForm((f) => ({ ...f, salaryBandMax: v }));
                  }}
                />
              </div>
              {form.salaryBandMin != null && form.salaryBandMax != null && form.salaryBandMin > form.salaryBandMax && (
                <p className="text-2xs text-destructive">Min cannot exceed max</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scope</label>
              <Textarea
                value={form.scope ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                placeholder="Scope of impact and autonomy at this level…"
                rows={2}
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Responsibilities <span className="text-xs text-muted-foreground font-normal">— one per line</span></label>
              <Textarea
                value={form.responsibilitiesText}
                onChange={(e) => setForm((f) => ({ ...f, responsibilitiesText: e.target.value }))}
                placeholder={"Leads team planning\nReviews code from juniors\nDefines technical roadmap"}
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Core Competencies <span className="text-xs text-muted-foreground font-normal">— one per line</span></label>
              <Textarea
                value={form.competenciesText}
                onChange={(e) => setForm((f) => ({ ...f, competenciesText: e.target.value }))}
                placeholder={"Problem solving\nStrategic thinking\nCollaboration"}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Behaviors <span className="text-xs text-muted-foreground font-normal">— one per line</span></label>
              <Textarea
                value={form.behaviorsText}
                onChange={(e) => setForm((f) => ({ ...f, behaviorsText: e.target.value }))}
                placeholder={"Demonstrates ownership\nCommunicates proactively\nMentors junior team members"}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Leadership Expectations</label>
              <Textarea
                value={form.leadershipExpectations ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, leadershipExpectations: e.target.value }))}
                placeholder="What is expected in terms of leadership at this level…"
                rows={2}
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Promotion Criteria</label>
              <Textarea
                value={form.promotionCriteria ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, promotionCriteria: e.target.value }))}
                placeholder="What must be demonstrated to be promoted from this level…"
                rows={2}
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Skills <span className="text-xs text-muted-foreground font-normal">— one per line</span></label>
              <Textarea
                value={form.skillsText}
                onChange={(e) => setForm((f) => ({ ...f, skillsText: e.target.value }))}
                placeholder={"TypeScript\nSystem design\nMentoring\nArchitecture review"}
                rows={3}
              />
            </div>
          </div>
        </HrSheet>
      )}

      <ConfirmActionDialog
        open={deleteLevel !== null}
        onOpenChange={(o) => { if (!o) setDeleteLevel(null); }}
        title="Remove this level?"
        description="All subsequent levels will be renumbered. This cannot be undone."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDeleteLevel}
        isPending={updateLadder.isPending}
      />
    </div>
  );
}
