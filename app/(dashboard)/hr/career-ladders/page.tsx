"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useHrDepartments } from "@/lib/api/hooks/hr/employees";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { ListToolbar } from "@/components/shared/list-toolbar";
import type { Tone } from "@/lib/design/tones";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  filterCareerLadderTitleInput,
  getCareerLadderTitleError,
  CAREER_LADDER_STATUSES,
  CAREER_LADDER_TRACK_TYPES,
  CAREER_LADDER_VISIBILITIES,
} from "@/lib/validations/career-ladder";
import { cn } from "@/lib/utils";
import {
  Plus, ChevronRight, ExternalLink, Eye, EyeOff, Building2,
  TrendingUp, Users, Code2, Star, X,
} from "lucide-react";
import type {
  CareerLadder, CareerLadderStatus, CareerLadderTrackType, CareerLadderVisibility,
} from "@/types/hr";

const clKeys = {
  all: [...queryKeys.hr.all, "career-ladders"] as const,
  list: (p?: Record<string, string>) => [...clKeys.all, "list", p ?? {}] as const,
};

const STATUS_CONFIG: Record<CareerLadderStatus, { label: string; tone: Tone }> = {
  draft:    { label: "Draft",    tone: "warning" },
  active:   { label: "Active",   tone: "success" },
  archived: { label: "Archived", tone: "neutral" },
};

const TRACK_CONFIG: Record<CareerLadderTrackType, { label: string; icon: React.ElementType; tone: Tone }> = {
  individual_contributor: { label: "Individual Contributor", icon: TrendingUp, tone: "info" },
  management:             { label: "Management",             icon: Users,      tone: "plum" },
  technical:              { label: "Technical",              icon: Code2,      tone: "teal" },
  specialist:             { label: "Specialist",             icon: Star,       tone: "brand" },
};

/** Gold progression: each rung a step deeper on the brand scale. */
const LEVEL_STRIP_COLORS = [
  "bg-gold-100",
  "bg-gold-200",
  "bg-gold-300",
  "bg-gold-400",
  "bg-gold-500",
  "bg-gold-600",
];

function LevelStrip({ levels }: { levels: CareerLadder["levels"] }) {
  if (!levels?.length) return null;
  return (
    <div className="flex items-center gap-1 pt-1">
      {levels.map((lvl, i) => (
        <div key={lvl.level} className="flex items-center gap-1">
          <div
            title={lvl.title}
            className={cn(
              "h-1.5 rounded-full",
              LEVEL_STRIP_COLORS[i % LEVEL_STRIP_COLORS.length],
            )}
            style={{ width: `${Math.max(20, 64 / levels.length)}px` }}
          />
          {i < levels.length - 1 && (
            <ChevronRight className="size-2.5 shrink-0 text-subtle-foreground" aria-hidden="true" />
          )}
        </div>
      ))}
      <span className="ml-1 text-2xs tabular-nums text-muted-foreground">
        {levels.length} level{levels.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function VisibilityIcon({ visibility }: { visibility: CareerLadderVisibility }) {
  if (visibility === "all") return <Eye className="size-3.5 text-muted-foreground" aria-label="Visible to all" />;
  if (visibility === "department") return <Building2 className="size-3.5 text-muted-foreground" aria-label="Department only" />;
  return <EyeOff className="size-3.5 text-muted-foreground" aria-label="Admin only" />;
}

export default function CareerLaddersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const role = session?.user?.role ?? "";
  const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";

  const [statusFilter, setStatusFilter]   = useState("");
  const [trackFilter, setTrackFilter]     = useState("");
  const [deptFilter, setDeptFilter]       = useState("");
  const [search, setSearch]               = useState("");

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (isAdmin && statusFilter) p.status = statusFilter;
    if (isAdmin && trackFilter)  p.trackType = trackFilter;
    return p;
  }, [isAdmin, statusFilter, trackFilter]);

  const { data: ladders, isLoading, isError, error, refetch } = useQuery({
    queryKey: clKeys.list(queryParams),
    queryFn: () => apiClient.get<CareerLadder[]>("/hr/career-ladders", queryParams),
  });

  const { data: depsRaw } = useHrDepartments();
  const deptOptions = useMemo(() => {
    const list = Array.isArray(depsRaw) ? depsRaw : [];
    return list.map((d: { id: number; name: string }) => ({ value: d.name, label: d.name }));
  }, [depsRaw]);

  const filteredLadders = useMemo(() => {
    if (!ladders) return [];
    return ladders.filter((cl) => {
      if (deptFilter && cl.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          cl.title.toLowerCase().includes(q) ||
          (cl.description ?? "").toLowerCase().includes(q) ||
          (cl.department ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ladders, deptFilter, search]);

  const hasActiveFilters = !!(statusFilter || trackFilter || deptFilter || search);

  const create = useMutation({
    mutationFn: (data: {
      title: string; department?: string; description?: string;
      status: CareerLadderStatus; trackType?: CareerLadderTrackType | null;
      visibility: CareerLadderVisibility;
    }) => apiClient.post<CareerLadder>("/hr/career-ladders", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clKeys.all }),
  });

  const [sheetOpen, setSheetOpen]           = useState(false);
  const [title, setTitle]                   = useState("");
  const [department, setDepartment]         = useState("");
  const [description, setDescription]       = useState("");
  const [status, setStatus]                 = useState<CareerLadderStatus>("active");
  const [trackType, setTrackType]           = useState<CareerLadderTrackType | "">("");
  const [visibility, setVisibility]         = useState<CareerLadderVisibility>("all");
  const [titleTouched, setTitleTouched]     = useState(false);

  const titleError = useMemo(() => getCareerLadderTitleError(title), [title]);
  const descError  = useMemo(
    () => (description.length > 500 ? "Description must be 500 characters or less" : null),
    [description],
  );
  const isFormValid = !titleError && !descError;

  const resetForm = useCallback(() => {
    setTitle(""); setDepartment(""); setDescription("");
    setStatus("active"); setTrackType(""); setVisibility("all");
    setTitleTouched(false);
  }, []);

  const handleCreate = useCallback(() => {
    setTitleTouched(true);
    if (titleError) { toast.error(titleError); return; }
    if (descError) { toast.error(descError); return; }
    create.mutate(
      {
        title: title.trim(),
        department: department || undefined,
        description: description.trim() || undefined,
        status,
        trackType: trackType || null,
        visibility,
      },
      {
        onSuccess: () => {
          toast.success("Career ladder created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, department, description, status, trackType, visibility, titleError, descError, create, resetForm]);

  if (isLoading) {
    return (
      <PageWrapper title="Career ladders">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-36 rounded-md" />)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Career ladders"
      badge={`${filteredLadders.length} path${filteredLadders.length !== 1 ? "s" : ""}`}
      actions={
        isAdmin ? (
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Create Ladder
          </Button>
        ) : undefined
      }
      filters={
        <ListToolbar
          className="w-full"
          search={{ value: search, onChange: setSearch, placeholder: "Search ladders…" }}
          filters={
            <>
              {isAdmin && (
                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 w-36 text-sm">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {CAREER_LADDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isAdmin && (
                <Select value={trackFilter || "all"} onValueChange={(v) => setTrackFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 w-44 text-sm">
                    <SelectValue placeholder="All tracks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tracks</SelectItem>
                    {CAREER_LADDER_TRACK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{TRACK_CONFIG[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {deptOptions.length > 0 && (
                <Select value={deptFilter || "all"} onValueChange={(v) => setDeptFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 w-44 text-sm">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {deptOptions.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => { setStatusFilter(""); setTrackFilter(""); setDeptFilter(""); setSearch(""); }}
                >
                  <X className="size-4" aria-hidden="true" />
                  Clear
                </Button>
              )}
            </>
          }
        />
      }
    >
      <div className="space-y-4">
        {isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : !filteredLadders.length ? (
          hasActiveFilters ? (
            <EmptyState
              title="No results for these filters"
              description="Try clearing your filters to see all ladders"
              action={{ label: "Clear filters", onClick: () => { setStatusFilter(""); setTrackFilter(""); setDeptFilter(""); setSearch(""); } }}
            />
          ) : (
            <EmptyState
              title="No career ladders defined yet"
              description={isAdmin
                ? "Create your first career ladder to define growth paths"
                : "Career ladders will appear here once your organization defines them"}
              {...(isAdmin ? { action: { label: "Create Ladder", onClick: () => setSheetOpen(true) } } : {})}
            />
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredLadders.map((cl) => {
              const statusCfg = STATUS_CONFIG[cl.status as CareerLadderStatus] ?? STATUS_CONFIG.active;
              const trackCfg = cl.trackType ? TRACK_CONFIG[cl.trackType as CareerLadderTrackType] : null;
              const TrackIcon = trackCfg?.icon;
              return (
                <Card
                  key={cl.id}
                  className={cn(
                    "group transition-[border-color,box-shadow] duration-100 hover:border-border-strong hover:shadow-md",
                    cl.status === "archived" && "opacity-60",
                  )}
                >
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <StatusPill tone={statusCfg.tone} dot>{statusCfg.label}</StatusPill>
                        {trackCfg && TrackIcon && (
                          <StatusPill tone={trackCfg.tone}>
                            <TrackIcon aria-hidden="true" />
                            {trackCfg.label}
                          </StatusPill>
                        )}
                      </div>
                      <VisibilityIcon visibility={cl.visibility as CareerLadderVisibility} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold leading-snug text-foreground truncate">{cl.title}</h3>
                      {cl.department && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 className="size-3 text-muted-foreground" aria-hidden="true" />
                          <span className="text-2xs text-muted-foreground">{cl.department}</span>
                        </div>
                      )}
                    </div>

                    {cl.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{cl.description}</p>
                    )}

                    <LevelStrip levels={cl.levels} />

                    <div className="mt-auto border-t border-border pt-2">
                      <Button
                        asChild
                        size="xs"
                        variant="ghost"
                        className="-ml-2 text-brand-text hover:bg-brand-soft"
                      >
                        <Link href={`/hr/career-ladders/${cl.id}`}>
                          {isAdmin ? "View / Edit" : "View Details"}
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <HrSheet
        open={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm(); }}
        title="Create career ladder"
        description="Define a new career progression path for your organization."
        onSubmit={handleCreate}
        submitLabel="Create Ladder"
        isPending={create.isPending}
        // Title errors wait for the field to be touched (or a submit attempt);
        // flagging an empty, untouched form on open read as an error.
        submitDisabled={titleTouched ? !isFormValid : !!descError}
        submitDisabledReason={titleTouched ? (titleError ?? descError) : descError}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g., Engineering Career Path"
              value={title}
              onChange={(e) => { setTitle(filterCareerLadderTitleInput(e.target.value)); setTitleTouched(true); }}
              onBlur={() => setTitleTouched(true)}
              maxLength={120}
              aria-required
              aria-invalid={titleTouched && !!titleError}
              className={cn(titleTouched && titleError && "border-destructive")}
            />
            {titleTouched && titleError ? (
              <p className="text-2xs text-destructive">{titleError}</p>
            ) : (
              <p className="text-2xs text-muted-foreground">
                Letters, numbers, spaces, and - &apos; . &amp; / , only
              </p>
            )}
            <p className="text-2xs text-muted-foreground text-right">{title.length}/120</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as CareerLadderStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAREER_LADDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Visibility</label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as CareerLadderVisibility)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAREER_LADDER_VISIBILITIES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v === "all" ? "All employees" : v === "department" ? "Department only" : "Admin only"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Track Type</label>
            <Select value={trackType || "none"} onValueChange={(v) => setTrackType(v === "none" ? "" : v as CareerLadderTrackType)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select track type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No track type</SelectItem>
                {CAREER_LADDER_TRACK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{TRACK_CONFIG[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Department</label>
            {deptOptions.length > 0 ? (
              <SearchableSelect
                options={[{ value: "", label: "No department" }, ...deptOptions]}
                value={department}
                onValueChange={setDepartment}
                placeholder="Select department"
                searchPlaceholder="Search departments…"
              />
            ) : (
              <Input
                placeholder="e.g., Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Brief description of this career path and its purpose…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              aria-invalid={!!descError}
              className={cn(descError && "border-destructive")}
            />
            {descError && <p className="text-2xs text-destructive">{descError}</p>}
            <p className="text-2xs text-muted-foreground text-right">{description.length}/500</p>
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
