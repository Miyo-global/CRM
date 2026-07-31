"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Filter,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageSquare,
  Search,
  Star,
  Users,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { StatCard } from "@/components/ui/stat-card";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFindExpert, useHrDepartments, useSkillSuggestions, type ExpertResult } from "@/lib/api/hooks/hr";
import { useBranches } from "@/lib/api/hooks/branches";
import { canonicalizeSkill, getRelatedSkills, normalizeSkill } from "@/lib/hr/skills-catalog";
import { ROLE_LABELS } from "@/features/hr/employees/hr-types";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  formatExperience,
  getInitials,
  LEVEL_COLORS,
  LEVEL_LABELS,
  LEVEL_NAMES,
  FIND_EXPERT_ROLE_SLUGS,
  type SortOption,
  type ViewMode,
} from "./constants";

/** After this many characters (trimmed), run the expert search automatically while typing (debounced). */
const MIN_SKILL_CHARS_AUTO_SEARCH = 2;

function SkillLevelBadge({ level }: { level: number | null }) {
  if (level == null) return null;
  const clamped = Math.min(5, Math.max(1, level));
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        LEVEL_COLORS[clamped],
      )}
      title={LEVEL_NAMES[clamped]}
    >
      {LEVEL_LABELS[clamped]}
    </span>
  );
}

function AvailabilityBadge({ available, status }: { available: boolean; status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        available
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", available ? "bg-emerald-500" : "bg-amber-500")} />
      {status}
    </span>
  );
}

function ExpertRow({
  expert,
  activeQuery,
  matchedSkills,
}: {
  expert: ExpertResult;
  activeQuery: string;
  matchedSkills: Set<string>;
}) {
  const q = activeQuery.toLowerCase();
  const displaySkills = expert.skillLevels.slice(0, 6);
  /** Narrow column beside tenure: primarily office/location; aligns with grid branch/site meta (not department — that has its own md+ column). */
  const experienceAsideLabel =
    expert.location?.trim() ||
    expert.branch?.trim() ||
    expert.skillLevels[0]?.name?.trim() ||
    null;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card shadow-noir hover:border-gold/30 transition-colors sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 min-w-0 sm:w-[220px] shrink-0">
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-gold/10">
          <AvatarImage src={resolveImageUrl(expert.image)} />
          <AvatarFallback className="bg-gold/10 text-gold font-semibold text-sm">
            {getInitials(expert.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium text-sm truncate">{expert.name ?? "Unknown"}</p>
            {!expert.isActive && (
              <Badge variant="destructive" className="shrink-0 text-[9px] px-1.5 py-0">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {expert.designation ?? expert.role}
            {expert.matchedLevel != null && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle">
                <span className="text-muted-foreground/80">·</span>
                <SkillLevelBadge level={expert.matchedLevel} />
              </span>
            )}
          </p>
          <div className="mt-0.5">
            <AvailabilityBadge available={expert.available} status={expert.status} />
          </div>
        </div>
      </div>

      <div className="hidden md:block w-[130px] shrink-0 text-xs text-muted-foreground truncate">
        {expert.department ?? ""}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1.5">
          {displaySkills.map(({ name, level, recognized }) => {
            const isMatch =
              matchedSkills.has(name) || name.toLowerCase().includes(q);
            return (
              <div key={name} className="inline-flex items-center gap-1">
                <Badge
                  variant={isMatch ? "default" : "secondary"}
                  className={cn(
                    "text-[11px] font-normal",
                    isMatch && "bg-gold hover:bg-gold/90 text-white border-gold",
                    !recognized && !isMatch && "border-dashed text-muted-foreground",
                  )}
                  title={recognized ? undefined : "Unrecognised skill — not in the skills catalog"}
                >
                  {name}
                  {!recognized && <span className="ml-1 opacity-60">?</span>}
                </Badge>
                <SkillLevelBadge level={level} />
              </div>
            );
          })}
          {expert.skillLevels.length > 6 && (
            <Badge variant="outline" className="text-[11px]">
              +{expert.skillLevels.length - 6}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground sm:w-[180px] sm:justify-end">
        <span className="tabular-nums">{formatExperience(expert.experienceYears)}</span>
        {experienceAsideLabel ? (
          <span className="hidden sm:inline truncate max-w-[90px]" title={experienceAsideLabel}>
            {experienceAsideLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0 sm:ml-auto">
        <Button asChild variant="default" size="sm" className="h-8 text-xs bg-gold hover:bg-gold/90 text-white">
          <Link href={`/hr/employees/${expert.userId}`}>View profile</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1 border-border">
          <Link href={`/chat?userId=${expert.userId}`}>
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </Link>
        </Button>
        {expert.email ? (
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1 border-border">
            <a href={`mailto:${expert.email}`}>
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ExpertGridCard({
  expert,
  activeQuery,
  matchedSkills,
}: {
  expert: ExpertResult;
  activeQuery: string;
  matchedSkills: Set<string>;
}) {
  const q = activeQuery.toLowerCase();

  return (
    <Card className="shadow-noir border-border hover:border-gold/30 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-gold/10">
            <AvatarImage src={resolveImageUrl(expert.image)} />
            <AvatarFallback className="bg-gold/10 text-gold font-semibold text-sm">
              {getInitials(expert.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-medium text-sm truncate">{expert.name ?? "Unknown"}</p>
              {!expert.isActive && (
                <Badge variant="destructive" className="shrink-0 text-[9px] px-1.5 py-0">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {expert.designation ?? expert.role}
            </p>
          </div>
          {expert.matchedLevel != null && (
            <SkillLevelBadge level={expert.matchedLevel} />
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {expert.skillLevels.slice(0, 4).map(({ name, level, recognized }) => {
            const isMatch =
              matchedSkills.has(name) || name.toLowerCase().includes(q);
            return (
              <Badge
                key={name}
                variant={isMatch ? "default" : "secondary"}
                className={cn(
                  "text-[10px]",
                  isMatch && "bg-gold text-white border-gold",
                  !recognized && !isMatch && "border-dashed text-muted-foreground",
                )}
                title={recognized ? undefined : "Unrecognised skill — not in the skills catalog"}
              >
                {name}
                {level != null ? ` · ${LEVEL_LABELS[level]}` : ""}
              </Badge>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="truncate">{expert.branch ?? expert.department ?? ""}</span>
          <AvailabilityBadge available={expert.available} status={expert.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default" className="flex-1 h-8 text-xs bg-gold hover:bg-gold/90 text-white">
            <Link href={`/hr/employees/${expert.userId}`}>View profile</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs border-border" aria-label="Message expert">
            <Link href={`/chat?userId=${expert.userId}`}>
              <MessageSquare className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {expert.email ? (
            <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs border-border" aria-label="Email expert">
              <a href={`mailto:${expert.email}`}>
                <Mail className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function FindExpertView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: departments } = useHrDepartments();
  const { data: branches } = useBranches();

  const { data: experts, isLoading } = useFindExpert({
    skill: activeQuery,
    department: deptFilter !== "all" ? deptFilter : undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    branch: branchFilter !== "all" ? branchFilter : undefined,
    includeInactive,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length >= MIN_SKILL_CHARS_AUTO_SEARCH) {
      setActiveQuery(debouncedQuery);
      setPage(1);
    } else {
      setActiveQuery("");
      setPage(1);
    }
  }, [debouncedQuery]);

  const { data: suggestions } = useSkillSuggestions(showSuggestions ? debouncedQuery : "");

  function runSearch(skill: string) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setActiveQuery(trimmed);
    setShowSuggestions(false);
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  const filterOptions = useMemo(() => {
    const list = experts ?? [];
    return {
      locations: [...new Set(list.map((e) => e.location).filter(Boolean))].sort() as string[],
    };
  }, [experts]);

  const filteredExperts = useMemo(() => {
    let list = [...(experts ?? [])];

    if (locationFilter !== "all") {
      list = list.filter((e) => e.location === locationFilter);
    }
    if (availabilityFilter !== "all") {
      list = list.filter((e) => (availabilityFilter === "available" ? e.available : !e.available));
    }
    if (experienceFilter !== "all") {
      list = list.filter((e) => {
        const yrs = Number(e.experienceYears ?? 0);
        if (experienceFilter === "0-2") return yrs < 2;
        if (experienceFilter === "2-5") return yrs >= 2 && yrs < 5;
        if (experienceFilter === "5+") return yrs >= 5;
        return true;
      });
    }
    if (levelFilter !== "all") {
      const minLevel = Number(levelFilter);
      list = list.filter((e) => (e.matchedLevel ?? 0) >= minLevel);
    }

    if (sortBy === "name") {
      list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    } else if (sortBy === "experience") {
      list.sort(
        (a, b) => Number(b.experienceYears ?? 0) - Number(a.experienceYears ?? 0),
      );
    } else if (sortBy === "level") {
      list.sort((a, b) => (b.matchedLevel ?? 0) - (a.matchedLevel ?? 0));
    }

    return list;
  }, [experts, locationFilter, experienceFilter, levelFilter, availabilityFilter, sortBy]);

  const paginatedExperts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredExperts.slice(start, start + pageSize);
  }, [filteredExperts, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredExperts.length / pageSize));

  const stats = useMemo(() => {
    const list = filteredExperts;
    const departments = new Set(list.map((e) => e.department).filter(Boolean));
    const locations = new Set(list.map((e) => e.location).filter(Boolean));
    const levels = list.map((e) => e.matchedLevel).filter((l): l is number => l != null);
    const avgLevel =
      levels.length > 0
        ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10
        : 0;
    return {
      count: list.length,
      departments: departments.size,
      locations: locations.size,
      avgLevel,
    };
  }, [filteredExperts]);

  const topSkills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expert of filteredExperts) {
      for (const skill of expert.skills) {
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filteredExperts]);

  const relatedSkills = useMemo(() => {
    const qc = canonicalizeSkill(activeQuery);
    const catalogRelated = qc?.recognized ? getRelatedSkills(qc.canonical) : [];
    const qLower = activeQuery.toLowerCase();
    const qNorm = normalizeSkill(activeQuery);
    const extra = new Set<string>();
    for (const expert of filteredExperts) {
      for (const skill of expert.skills) {
        if (normalizeSkill(skill) === qNorm) continue;
        if (!skill.toLowerCase().includes(qLower)) extra.add(skill);
      }
    }
    return [...catalogRelated, ...extra].filter(
      (s, i, arr) => arr.indexOf(s) === i && s.toLowerCase() !== qLower,
    ).slice(0, 14);
  }, [filteredExperts, activeQuery]);

  const matchedSkillSet = useMemo(() => {
    const qc = canonicalizeSkill(activeQuery);
    const names = new Set<string>();
    if (qc) names.add(qc.canonical);
    const qn = normalizeSkill(activeQuery);
    const qLower = activeQuery.toLowerCase();
    for (const e of experts ?? []) {
      names.add(e.matchedSkill);
      for (const sl of e.skillLevels) {
        if (
          sl.name.toLowerCase().includes(qLower) ||
          normalizeSkill(sl.name) === qn ||
          (qc && normalizeSkill(sl.name) === normalizeSkill(qc.canonical))
        ) {
          names.add(sl.name);
        }
      }
    }
    return names;
  }, [experts, activeQuery]);

  const hasActiveFilters =
    deptFilter !== "all" ||
    roleFilter !== "all" ||
    branchFilter !== "all" ||
    locationFilter !== "all" ||
    experienceFilter !== "all" ||
    levelFilter !== "all" ||
    availabilityFilter !== "all" ||
    includeInactive;

  function clearFilters() {
    setDeptFilter("all");
    setRoleFilter("all");
    setBranchFilter("all");
    setLocationFilter("all");
    setExperienceFilter("all");
    setLevelFilter("all");
    setAvailabilityFilter("all");
    setIncludeInactive(false);
    setPage(1);
  }

  return (
    <PageWrapper
      title="Find Expert"
      subtitle="Search across the org to find colleagues with specific skills"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border"
          type="button"
          onClick={() => {
            router.push("/hr");
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      }
    >
      {activeQuery && !isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Experts Found" value={stats.count} icon={Users} color="gold" index={0} />
          <StatCard label="Departments" value={stats.departments} icon={Building2} color="gold" index={1} />
          <StatCard label="Locations" value={stats.locations} icon={MapPin} color="gold" index={2} />
          <StatCard
            label="Avg. Skill Level"
            value={stats.avgLevel || ""}
            icon={Star}
            color="gold"
            index={3}
          />
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowSuggestions(false);
            }}
            placeholder="e.g. React, Financial Modelling, Python…"
            className="pl-9 h-10 border-border shadow-noir"
            aria-label="Skill search"
            autoComplete="off"
          />
          {showSuggestions && debouncedQuery && (suggestions?.length ?? 0) > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
              {suggestions!.map((s) => (
                <button
                  key={s.skill}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    runSearch(s.skill);
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{s.skill}</span>
                    {s.category && (
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        {s.category}
                      </Badge>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {s.count} {s.count === 1 ? "expert" : "experts"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="submit"
          disabled={!query.trim()}
          className="h-10 px-6 bg-gold hover:bg-gold/90 text-white shadow-noir glow-gold"
        >
          Search
        </Button>
      </form>

      {activeQuery && !isLoading ? (() => {
        const c = canonicalizeSkill(activeQuery);
        if (!c?.recognized) return null;
        return (
          <p className="text-xs text-muted-foreground mt-2">
            Catalog skill: <span className="font-medium text-foreground">{c.canonical}</span>
            {c.category ? ` · ${c.category}` : ""}
          </p>
        );
      })() : null}

      {activeQuery && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {FIND_EXPERT_ROLE_SLUGS.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {ROLE_LABELS[slug] ?? slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {(branches ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={(v) => { setAvailabilityFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Availability</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {filterOptions.locations.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={experienceFilter} onValueChange={(v) => { setExperienceFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experience</SelectItem>
                <SelectItem value="0-2">0–2 years</SelectItem>
                <SelectItem value="2-5">2–5 years</SelectItem>
                <SelectItem value="5+">5+ years</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Skill Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <SelectItem key={lvl} value={String(lvl)}>
                    {LEVEL_LABELS[lvl]}+ — {LEVEL_NAMES[lvl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="find-expert-inactive"
                checked={includeInactive}
                onCheckedChange={(v) => {
                  setIncludeInactive(!!v);
                  setPage(1);
                }}
              />
              <Label htmlFor="find-expert-inactive" className="text-xs text-muted-foreground cursor-pointer font-normal">
                Include inactive employees
              </Label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={clearFilters}>
                  <Filter className="h-3.5 w-3.5" />
                  Clear filters
                </Button>
              )}
              </div>
              {sortBy === "relevance" && (
                <p className="text-[11px] text-muted-foreground max-w-md leading-snug">
                  Relevance: match quality, structured level (when rated), experience, skill breadth; ties break by level, tenure, skill count, then name.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="level">Skill level</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border border-border rounded-md overflow-hidden h-8">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 px-2.5 rounded-none", viewMode === "list" && "bg-gold/10 text-gold")}
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 px-2.5 rounded-none border-l border-border", viewMode === "grid" && "bg-gold/10 text-gold")}
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={cn("mt-6", activeQuery && "lg:grid lg:grid-cols-[1fr_280px] lg:gap-6 lg:items-start")}>
        <div className="min-w-0">
          {!activeQuery ? (
            <EmptyState
              illustration={<EmptyPersonIllustration className="h-40 w-40" />}
              title="Search for a skill"
              description="Enter a skill name above to find colleagues who can help."
            />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredExperts.length === 0 ? (
            <EmptyState
              illustration={<EmptyPersonIllustration className="h-40 w-40" />}
              title={`No experts found for "${activeQuery}"`}
              description="Try a different skill or adjust your filters."
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  Found <span className="font-medium text-foreground">{filteredExperts.length}</span> expert
                  {filteredExperts.length !== 1 ? "s" : ""} with skills matching &ldquo;{activeQuery}&rdquo;
                </p>
              </div>

              {viewMode === "list" ? (
                <div className="space-y-2">
                  {paginatedExperts.map((expert) => (
                    <ExpertRow
                      key={expert.userId}
                      expert={expert}
                      activeQuery={activeQuery}
                      matchedSkills={matchedSkillSet}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {paginatedExperts.map((expert) => (
                    <ExpertGridCard
                      key={expert.userId}
                      expert={expert}
                      activeQuery={activeQuery}
                      matchedSkills={matchedSkillSet}
                    />
                  ))}
                </div>
              )}

              <DataTablePagination
                page={page}
                totalPages={totalPages}
                total={filteredExperts.length}
                limit={pageSize}
                onPageChange={setPage}
                onLimitChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            </>
          )}
        </div>

        {activeQuery && !isLoading && filteredExperts.length > 0 && (
          <aside className="hidden lg:flex flex-col gap-4 mt-6 lg:mt-0">
            <Card className="shadow-noir border-border">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Top Skills</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {topSkills.map(([skill, count]) => (
                  <div key={skill} className="flex items-center justify-between text-sm">
                    <span className="truncate">{skill}</span>
                    <Badge variant="secondary" className="text-xs tabular-nums shrink-0 ml-2">
                      {count}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-gold"
                  onClick={() => router.push("/hr/employees/skills-matrix")}
                >
                  View all skills
                </Button>
              </CardContent>
            </Card>

            {relatedSkills.length > 0 && (
              <Card className="shadow-noir border-border">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">Related Skills</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {relatedSkills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:border-gold/40 hover:bg-gold/5 transition-colors"
                        onClick={() => {
                          setQuery(skill);
                          setActiveQuery(skill);
                          setPage(1);
                        }}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-noir border-border bg-gold/5 border-gold/20">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground leading-snug">
                  Can&apos;t find the right expert? Raise a request and we&apos;ll help you.
                </p>
                <Button
                  asChild
                  className="w-full bg-gold hover:bg-gold/90 text-white glow-gold"
                >
                  <Link href="/chat">Request Expert</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </PageWrapper>
  );
}
