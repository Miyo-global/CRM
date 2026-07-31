"use client";

import { useState, useMemo, useEffect } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useSkillsMatrix } from "@/lib/api/hooks/hr";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Search, LayoutGrid, Star, Users, Award, Layers } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LEVEL_COLORS,
  LEVEL_LABELS,
  LEVEL_NAMES,
} from "@/features/hr/find-expert/constants";
import { getInitials } from "@/lib/format-utils";
import {
  getCertStatus,
  certDotClass,
  certStatusLabel,
  formatCertDate,
} from "@/features/hr/skills/cert-status";

type ViewMode = "matrix" | "expert";

type SkillCategory =
  | "Technical"
  | "Soft Skills"
  | "Domain Knowledge"
  | "Languages"
  | "Tools & Platforms"
  | "Other";

const SKILL_CATEGORIES: SkillCategory[] = [
  "Technical",
  "Soft Skills",
  "Domain Knowledge",
  "Languages",
  "Tools & Platforms",
  "Other",
];

const TECHNICAL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c#", "c++", "go", "rust", "swift",
  "kotlin", "ruby", "php", "scala", "r ", " r,", "dart", "elixir", "haskell",
  "react", "vue", "angular", "next", "nuxt", "svelte", "node", "express", "fastapi",
  "django", "flask", "spring", "rails", "laravel", "graphql", "rest", "api",
  "sql", "nosql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
  "html", "css", "sass", "tailwind", "webpack", "vite", "babel",
  "algorithm", "data structure", "machine learning", "deep learning", "nlp",
  "computer vision", "tensorflow", "pytorch", "pandas", "numpy", "scikit",
  "microservice", "serverless", "cloud", "devops", "ci/cd", "testing", "unit test",
  "integration", "frontend", "backend", "fullstack", "mobile", "ios", "android",
  "security", "cryptography", "blockchain", "solidity",
];

const SOFT_SKILLS_KEYWORDS = [
  "communication", "leadership", "teamwork", "collaboration", "problem solving",
  "critical thinking", "creativity", "adaptability", "time management",
  "project management", "presentation", "negotiation", "conflict", "mentoring",
  "coaching", "empathy", "emotional", "interpersonal", "decision", "planning",
  "organisation", "organization", "facilitation", "public speaking", "writing",
  "listening", "feedback", "motivation", "resilience", "agile", "scrum",
];

const DOMAIN_KNOWLEDGE_KEYWORDS = [
  "finance", "accounting", "tax", "audit", "compliance", "legal", "regulatory",
  "marketing", "sales", "crm", "customer", "product", "strategy", "business",
  "operations", "supply chain", "logistics", "procurement", "hr", "recruitment",
  "healthcare", "medical", "clinical", "pharmaceutical", "education", "research",
  "analytics", "business intelligence", "reporting", "forecasting", "budgeting",
  "investment", "trading", "risk", "insurance", "banking",
];

const LANGUAGES_KEYWORDS = [
  "english", "spanish", "french", "german", "mandarin", "chinese", "japanese",
  "korean", "arabic", "portuguese", "italian", "hindi", "bengali", "russian",
  "dutch", "swedish", "norwegian", "danish", "polish", "turkish", "vietnamese",
  "thai", "indonesian", "malay", "tagalog",
];

const TOOLS_KEYWORDS = [
  "git", "github", "gitlab", "bitbucket", "jira", "confluence", "notion",
  "slack", "teams", "zoom", "figma", "sketch", "adobe", "photoshop", "illustrator",
  "excel", "sheets", "powerpoint", "word", "docs", "tableau", "power bi", "looker",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible",
  "jenkins", "github actions", "circleci", "datadog", "sentry", "linear",
  "asana", "trello", "clickup", "hubspot", "salesforce", "zendesk",
  "postman", "swagger", "linux", "bash", "shell", "vim",
];

function categorizeSkill(skillName: string): SkillCategory {
  const lower = skillName.toLowerCase();

  if (LANGUAGES_KEYWORDS.some((k) => lower === k || lower.startsWith(k + " ") || lower.endsWith(" " + k))) {
    return "Languages";
  }
  if (TECHNICAL_KEYWORDS.some((k) => lower.includes(k))) return "Technical";
  if (TOOLS_KEYWORDS.some((k) => lower.includes(k))) return "Tools & Platforms";
  if (SOFT_SKILLS_KEYWORDS.some((k) => lower.includes(k))) return "Soft Skills";
  if (DOMAIN_KNOWLEDGE_KEYWORDS.some((k) => lower.includes(k))) return "Domain Knowledge";
  return "Other";
}

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "Just starting out, limited hands-on experience",
  2: "Can handle simple tasks with guidance",
  3: "Works independently on standard tasks",
  4: "Handles complex work, guides others",
  5: "Deep mastery, recognised authority",
};

const LEVEL_WEIGHTS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
const PAGE_SIZE = 25;

function weightedScore(skills: Record<string, number>): number {
  return Object.values(skills).reduce((sum, lvl) => sum + (LEVEL_WEIGHTS[lvl] ?? 1), 0);
}

export default function SkillsMatrixPage() {
  const { data, isLoading } = useSkillsMatrix();

  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  const [expertSkill, setExpertSkill] = useState<string>("all");
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [page, setPage] = useState(1);

  const allEmployees = data?.employees ?? [];
  const allSkills = data?.skills ?? [];
  const roleGaps = data?.roleGaps ?? [];

  const filteredEmployees = useMemo(() => {
    let list = allEmployees;
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((emp) => {
        const nameMatch = (emp.name ?? "").toLowerCase().includes(q);
        const skillMatch = Object.keys(emp.skills).some((s) => s.toLowerCase().includes(q));
        return nameMatch || skillMatch;
      });
    }

    if (skillFilter !== "all") {
      list = list.filter((emp) => skillFilter in emp.skills);
    }

    if (levelFilter !== "all") {
      const lvl = Number(levelFilter);
      if (skillFilter !== "all") {
        list = list.filter((emp) => (emp.skills[skillFilter] ?? 0) >= lvl);
      } else {
        list = list.filter((emp) => Object.values(emp.skills).some((l) => l >= lvl));
      }
    }

    return list;
  }, [allEmployees, search, skillFilter, levelFilter]);

  const filteredSkills = useMemo(() => {
    if (skillFilter !== "all") return [skillFilter];
    const q = search.trim().toLowerCase();
    if (!q) return allSkills;
    return allSkills.filter((s) => s.toLowerCase().includes(q));
  }, [allSkills, skillFilter, search]);

  const skillsByCategory = useMemo(() => {
    const map = new Map<SkillCategory, string[]>();
    for (const cat of SKILL_CATEGORIES) map.set(cat, []);
    for (const skill of filteredSkills) {
      const cat = categorizeSkill(skill);
      map.get(cat)!.push(skill);
    }
    for (const [cat, skills] of map.entries()) {
      if (skills.length === 0) map.delete(cat);
    }
    return map;
  }, [filteredSkills]);

  useEffect(() => { setPage(1); }, [search, skillFilter, levelFilter]);

  const pagedEmployees = useMemo(
    () => filteredEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredEmployees, page],
  );
  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE);

  const expertRanking = useMemo(() => {
    if (viewMode !== "expert") return [];
    const skill = expertSkill === "all" ? null : expertSkill;
    if (skill) {
      return allEmployees
        .filter((e) => skill in e.skills)
        .map((e) => ({ ...e, score: e.skills[skill] ?? 0, expertSkillCount: 0 }))
        .sort((a, b) => b.score - a.score);
    }
    return allEmployees
      .map((e) => ({
        ...e,
        score: weightedScore(e.skills),
        skillCount: Object.keys(e.skills).length,
        expertSkillCount: Object.values(e.skills).filter((v) => v >= 4).length,
      }))
      .sort((a, b) => b.score - a.score || b.expertSkillCount - a.expertSkillCount);
  }, [viewMode, expertSkill, allEmployees]);

  const topSkills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const emp of allEmployees) {
      for (const s of Object.keys(emp.skills)) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [allEmployees]);

  const relatedSkills = useMemo(
    () =>
      expertSkill === "all"
        ? []
        : topSkills.map(([s]) => s).filter((s) => s !== expertSkill).slice(0, 12),
    [topSkills, expertSkill],
  );

  const expertStats = useMemo(() => {
    const specific = expertSkill !== "all";
    const levels = specific
      ? expertRanking.map((e) => e.skills[expertSkill] ?? 0).filter((l) => l > 0)
      : [];
    const avgLevel = levels.length
      ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10
      : 0;
    return { count: expertRanking.length, skillsTracked: allSkills.length, avgLevel, specific };
  }, [expertRanking, expertSkill, allSkills]);

  const matrixExportSheets = useMemo(() => [{
    name: "Skills Matrix",
    columns: [
      { header: "Employee", key: "employee", width: 25 },
      { header: "Skill", key: "skill", width: 28 },
      { header: "Level", key: "level", width: 14 },
      { header: "Score", key: "score", width: 10 },
    ],
    rows: filteredEmployees.flatMap((e) =>
      Object.entries(e.skills).map(([skill, lvl]) => ({
        employee: e.name ?? e.userId,
        skill,
        level: ["", "Beginner", "Intermediate", "Advanced", "Expert", "Master"][lvl] ?? String(lvl),
        score: lvl,
      }))
    ),
  }], [filteredEmployees]);

  if (isLoading) {
    return (
      <PageWrapper title="Skills Matrix">
        <Skeleton className="h-96 rounded-lg" />
      </PageWrapper>
    );
  }

  const hasData = allEmployees.length > 0 && allSkills.length > 0;

  return (
    <PageWrapper
      title="Skills Matrix"
      subtitle="Cross-reference of employee skill proficiencies across the organisation"
      actions={
        <div className="flex items-center gap-2">
          <ExportButton
            filename={`skills-matrix-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheets={matrixExportSheets}
          />
          <Button asChild size="sm" className="gap-2 bg-gold hover:bg-gold/90 text-white glow-gold">
            <Link href="/hr/employees/find-expert">
              <Search className="h-3.5 w-3.5" />
              Find Expert
            </Link>
          </Button>
        </div>
      }
    >
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-muted-foreground">
          <EmptyTeamIllustration className="h-40 w-40 opacity-95" />
          <p>No skills data yet. Add skills to employee profiles to build the matrix.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Search employee or skill…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <SearchableSelect
              options={[
                { value: "all", label: "All skills" },
                ...allSkills.map((s) => ({ value: s, label: s })),
              ]}
              value={skillFilter}
              onValueChange={setSkillFilter}
              placeholder="All skills"
              searchPlaceholder="Search skill…"
              triggerClassName="h-8 text-sm w-[160px]"
              className="w-[220px]"
            />

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="h-8 text-sm w-[160px]">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <SelectItem key={lvl} value={String(lvl)}>
                    {LEVEL_LABELS[lvl]} — {LEVEL_NAMES[lvl]}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md overflow-hidden h-8">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-3 rounded-none text-xs gap-1.5 ${viewMode === "matrix" ? "bg-muted" : ""}`}
                onClick={() => setViewMode("matrix")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Matrix
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-3 rounded-none text-xs gap-1.5 border-l ${viewMode === "expert" ? "bg-muted" : ""}`}
                onClick={() => setViewMode("expert")}
              >
                <Star className="h-3.5 w-3.5" />
                Expert View
              </Button>
            </div>

            {viewMode === "matrix" && (
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 px-3 text-xs gap-1.5", groupByCategory && "bg-muted border-foreground/30")}
                onClick={() => setGroupByCategory((v) => !v)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75ZM1 7.75A.75.75 0 0 1 1.75 7h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 1 7.75ZM1 12.75a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Group columns
              </Button>
            )}
          </div>

          {viewMode === "expert" && (
            <div className="flex items-center gap-3">
              <SearchableSelect
                options={[
                  { value: "all", label: "Overall score (all skills)" },
                  ...allSkills.map((s) => ({ value: s, label: s })),
                ]}
                value={expertSkill}
                onValueChange={setExpertSkill}
                placeholder="Rank by skill"
                searchPlaceholder="Search skill…"
                triggerClassName="h-8 text-sm w-[200px]"
                className="w-[240px]"
              />
              <span className="text-xs text-muted-foreground">
                Ranked by {expertSkill === "all" ? "total proficiency score" : `"${expertSkill}" proficiency`}
              </span>
            </div>
          )}

          {viewMode === "matrix" ? (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-max">
                  <table className="text-xs border-collapse">
                    <thead>
                      {groupByCategory ? (
                        <>
                          <tr>
                            <th
                              className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2 text-left font-medium min-w-[180px]"
                              rowSpan={2}
                            >
                              Employee
                            </th>
                            {SKILL_CATEGORIES.filter((cat) => skillsByCategory.has(cat)).map((cat) => {
                              const catSkills = skillsByCategory.get(cat) ?? [];
                              return (
                                <th
                                  key={cat}
                                  colSpan={catSkills.length}
                                  className="border-b border-r px-2 py-1 text-center font-semibold text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40"
                                >
                                  {cat}
                                </th>
                              );
                            })}
                            <th
                              className="border-b px-2 py-2 font-medium text-center min-w-[60px]"
                              rowSpan={2}
                              title="Weighted proficiency score"
                            >
                              Score
                            </th>
                          </tr>
                          <tr>
                            {SKILL_CATEGORIES.filter((cat) => skillsByCategory.has(cat)).flatMap((cat) =>
                              (skillsByCategory.get(cat) ?? []).map((skill) => (
                                <th
                                  key={skill}
                                  className="border-b border-r px-2 py-2 font-medium text-center max-w-[90px] truncate"
                                  title={skill}
                                >
                                  <div className="[writing-mode:vertical-rl] rotate-180 max-h-24 py-1">{skill}</div>
                                </th>
                              ))
                            )}
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <th className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2 text-left font-medium min-w-[180px]">
                            Employee
                          </th>
                          {filteredSkills.map((skill) => (
                            <th
                              key={skill}
                              className="border-b border-r px-2 py-2 font-medium text-center max-w-[90px] truncate"
                              title={skill}
                            >
                              <div className="[writing-mode:vertical-rl] rotate-180 max-h-24 py-1">{skill}</div>
                            </th>
                          ))}
                          <th className="border-b px-2 py-2 font-medium text-center min-w-[60px]" title="Weighted proficiency score">
                            Score
                          </th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={filteredSkills.length + 2} className="px-3 py-8 text-center text-muted-foreground text-sm">
                            No employees match the current filters.
                          </td>
                        </tr>
                      ) : (
                        pagedEmployees.map((emp) => {
                          const score = weightedScore(emp.skills);
                          const orderedSkills = groupByCategory
                            ? SKILL_CATEGORIES.flatMap((cat) => skillsByCategory.get(cat) ?? [])
                            : filteredSkills;
                          return (
                            <tr key={emp.userId} className="hover:bg-muted/30">
                              <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={emp.image ?? undefined} />
                                    <AvatarFallback className="text-[9px]">{getInitials(emp.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium truncate max-w-[120px]">{emp.name}</span>
                                </div>
                              </td>
                              {orderedSkills.map((skill) => {
                                const level = emp.skills[skill];
                                const cert = emp.certs?.[skill];
                                const certStatus = getCertStatus(cert?.validUntil);
                                const showDot = certStatus === "expired" || certStatus === "expiring";
                                const cellTitle = level
                                  ? [
                                      LEVEL_NAMES[level],
                                      cert?.validUntil
                                        ? `${certStatusLabel(certStatus, cert.validUntil)} (valid until ${formatCertDate(cert.validUntil)})`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")
                                  : undefined;
                                return (
                                  <td key={skill} className="border-b border-r px-1 py-1 text-center">
                                    {level ? (
                                      <span className="relative inline-flex items-center justify-center" title={cellTitle}>
                                        <span
                                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_COLORS[level] ?? LEVEL_COLORS[1]}`}
                                        >
                                          {LEVEL_LABELS[level] ?? `L${level}`}
                                        </span>
                                        {showDot && (
                                          <span
                                            className={cn(
                                              "absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-background",
                                              certDotClass(certStatus),
                                            )}
                                          />
                                        )}
                                      </span>
                                    ) : (
                                      null
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border-b px-2 py-2 text-center font-semibold text-foreground/80">
                                {score}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredEmployees.length)} of {filteredEmployees.length} employees
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      Prev
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                        <Button variant={p === page ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>{p}</Button>
                      </span>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_1fr] gap-3 items-start px-1">
                <Card className="w-full sm:w-auto">
                  <CardContent className="p-3 grid grid-cols-1 gap-2">
                    {Object.entries(LEVEL_LABELS).map(([lvl, lbl]) => {
                      const n = Number(lvl);
                      return (
                        <div key={lvl} className="flex items-start gap-2">
                          <span className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_COLORS[n]}`}>
                            {lbl}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-medium">{LEVEL_NAMES[n]}</span>
                            <p className="text-[10px] text-muted-foreground leading-snug">{LEVEL_DESCRIPTIONS[n]}</p>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                <div className="self-end pb-1 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Score = Σ(L1×1 + L2×2 + L3×4 + L4×8 + L5×16) — weighted by proficiency
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", certDotClass("expired"))} />
                      Certification expired
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", certDotClass("expiring"))} />
                      Expiring within 30 days
                    </span>
                  </div>
                </div>
              </div>

              {roleGaps.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex items-center gap-2">
                        <Layers className="h-4 w-4 text-gold" />
                        Role Skill Gaps
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        Open roles vs. skills available across the team
                      </span>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-flex h-4 items-center rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 text-[10px] text-emerald-700 dark:text-emerald-400">
                          Skill
                        </span>
                        Covered in team
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-flex h-4 items-center rounded-full border border-dashed border-amber-500/40 bg-amber-500/5 px-2 text-[10px] text-amber-700 dark:text-amber-400">
                          Skill
                        </span>
                        Missing from team
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {roleGaps.map((gap) => (
                      <div key={gap.jobId} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{gap.title}</span>
                            <Badge variant="outline" className="text-[9px] shrink-0">{gap.status}</Badge>
                          </div>
                          <Badge
                            variant={gap.missingCount === 0 ? "success" : "warning"}
                            className="shrink-0 tabular-nums text-xs font-semibold"
                          >
                            {gap.missingCount === 0
                              ? "All skills covered"
                              : `${gap.missingCount} skill${gap.missingCount === 1 ? "" : "s"} missing`}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {gap.required.map((req) => (
                            <span
                              key={req.skill}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                                req.covered
                                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                                  : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400 border-dashed",
                              )}
                              title={req.covered ? "Available in the team" : "Missing — no one in the team has this skill"}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full shrink-0",
                                  req.covered ? "bg-emerald-500" : "bg-amber-500",
                                )}
                              />
                              <span>{req.skill}</span>
                              {!req.covered && (
                                <span className="text-[9px] font-medium uppercase tracking-wide opacity-80">
                                  missing
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Experts Found" value={expertStats.count} icon={Users} color="gold" index={0} />
                <StatCard label="Skills Tracked" value={expertStats.skillsTracked} icon={Layers} color="gold" index={1} />
                <StatCard
                  label={expertStats.specific ? "Avg Skill Level" : "Top Skill"}
                  value={expertStats.specific ? (expertStats.avgLevel || "") : (topSkills[0]?.[0] ?? "")}
                  icon={Star}
                  color="gold"
                  index={2}
                />
                <StatCard
                  label="Ranked By"
                  value={expertSkill === "all" ? "Overall" : expertSkill}
                  icon={Award}
                  color="gold"
                  index={3}
                />
              </div>

              <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6 lg:items-start">
                <div className="min-w-0 space-y-2">
                  {expertRanking.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No employees found for this skill.
                    </p>
                  ) : (
                    expertRanking.map((emp, index) => {
                      const isSpecificSkill = expertSkill !== "all";
                      const level = isSpecificSkill ? (emp.skills[expertSkill] ?? 0) : null;
                      const displaySkills = Object.entries(emp.skills)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6);
                      const extra = Object.keys(emp.skills).length - displaySkills.length;
                      const expertSkillCount = "expertSkillCount" in emp ? emp.expertSkillCount : 0;
                      return (
                        <div
                          key={emp.userId}
                          className="flex flex-col gap-3 p-4 rounded-xl border bg-card hover:border-gold/30 transition-colors sm:flex-row sm:items-center"
                        >
                          <div className="flex items-center gap-3 min-w-0 sm:w-[230px] shrink-0">
                            <span className="text-sm font-bold text-muted-foreground w-5 text-right shrink-0">
                              {index + 1}
                            </span>
                            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-gold/10">
                              <AvatarImage src={emp.image ?? undefined} />
                              <AvatarFallback className="bg-gold/10 text-gold font-semibold text-sm">
                                {getInitials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{emp.name ?? "Unknown"}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {Object.keys(emp.skills).length} skill{Object.keys(emp.skills).length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1.5">
                              {displaySkills.map(([name, lvl]) => {
                                const isMatch = isSpecificSkill && name === expertSkill;
                                const cert = emp.certs?.[name];
                                const certStatus = getCertStatus(cert?.validUntil);
                                const showDot = certStatus === "expired" || certStatus === "expiring";
                                return (
                                  <div key={name} className="inline-flex items-center gap-1">
                                    <Badge
                                      variant={isMatch ? "default" : "secondary"}
                                      className={cn(
                                        "text-[11px] font-normal",
                                        isMatch && "bg-gold hover:bg-gold/90 text-white border-gold",
                                      )}
                                    >
                                      {showDot && (
                                        <span
                                          className={cn("mr-1 h-1.5 w-1.5 rounded-full", certDotClass(certStatus))}
                                          title={`${certStatusLabel(certStatus, cert?.validUntil)} (valid until ${formatCertDate(cert?.validUntil)})`}
                                        />
                                      )}
                                      {name}
                                    </Badge>
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                        LEVEL_COLORS[lvl] ?? LEVEL_COLORS[1],
                                      )}
                                      title={LEVEL_NAMES[lvl]}
                                    >
                                      {LEVEL_LABELS[lvl] ?? `L${lvl}`}
                                    </span>
                                  </div>
                                );
                              })}
                              {extra > 0 && (
                                <Badge variant="outline" className="text-[11px]">
                                  +{extra}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                            <Badge variant="outline" className="text-xs font-semibold tabular-nums">
                              {isSpecificSkill && level
                                ? `${LEVEL_LABELS[level] ?? `L${level}`} · ${LEVEL_NAMES[level] ?? ""}`
                                : expertSkillCount > 0
                                  ? `Score ${emp.score} · ${expertSkillCount} L4+ skill${expertSkillCount !== 1 ? "s" : ""}`
                                  : `Score ${emp.score}`}
                            </Badge>
                            <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-gold hover:text-gold">
                              <Link href={`/hr/employees/${emp.userId}`}>View Profile</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {expertRanking.length > 0 && (
                  <aside className="hidden lg:flex flex-col gap-4 mt-6 lg:mt-0">
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-medium">Top Skills</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        {topSkills.map(([skill, count]) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => setExpertSkill(skill)}
                            className="flex w-full items-center justify-between text-sm hover:text-gold transition-colors"
                          >
                            <span className="truncate">{skill}</span>
                            <Badge variant="secondary" className="text-xs tabular-nums shrink-0 ml-2">
                              {count}
                            </Badge>
                          </button>
                        ))}
                      </CardContent>
                    </Card>

                    {relatedSkills.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm font-medium">Related Skills</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                          <div className="flex flex-wrap gap-1.5">
                            {relatedSkills.map((skill) => (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => setExpertSkill(skill)}
                                className="text-xs px-2.5 py-1 rounded-full border bg-muted/50 hover:border-gold/40 hover:bg-gold/5 transition-colors"
                              >
                                {skill}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="bg-gold/5 border-gold/20">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm text-muted-foreground leading-snug">
                          Need a deeper search across departments, locations and experience?
                        </p>
                        <Button asChild className="w-full bg-gold hover:bg-gold/90 text-white">
                          <Link href="/hr/employees/find-expert">Open Find Expert</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </aside>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
