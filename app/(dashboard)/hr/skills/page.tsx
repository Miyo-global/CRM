"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useEmployeeSkills, useAddSkill, useVerifySkill, useDeleteSkill, useUpdateSkill,
  type EmployeeSkill,
} from "@/lib/api/hooks/hr";
import { useSkillSuggestions } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import {
  Plus, CheckCircle2, ChevronsUpDown, Check, Award,
  Pencil, Trash2, Filter,
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { ListToolbar } from "@/components/shared/list-toolbar";
import type { Tone } from "@/lib/design/tones";
import { SKILLS_CATALOG, canonicalizeSkill } from "@/lib/hr/skills-catalog";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import {
  getCertStatus, certStatusLabel, formatCertDate, type CertStatus,
} from "@/features/hr/skills/cert-status";
import { getTodayString } from "@/lib/date-utils";
import { pluralise } from "@/lib/format-utils";

const CERT_TONE: Record<CertStatus, Tone> = {
  expired: "danger",
  expiring: "warning",
  valid: "success",
  none: "neutral",
};

const LEVELS = [
  { value: "1", label: "Beginner" },
  { value: "2", label: "Intermediate" },
  { value: "3", label: "Advanced" },
  { value: "4", label: "Expert" },
  { value: "5", label: "Master" },
];

const CATALOG_SKILL_NAMES = SKILLS_CATALOG.map((s) => s.name);
const CATALOG_CATEGORIES = Array.from(
  new Set(SKILLS_CATALOG.map((s) => s.category))
).sort();

function levelLabel(level: number | null): string {
  return LEVELS.find((l) => l.value === String(level))?.label ?? "Unknown";
}

/** Proficiency heat scale (§8.8): 5 gold buckets, no level = muted. */
const LEVEL_SCALE: Record<string, string> = {
  "1": "bg-gold-200",
  "2": "bg-gold-300",
  "3": "bg-gold-400",
  "4": "bg-gold-500",
  "5": "bg-gold-700",
};

function levelColor(level: number | null): string {
  if (level === null || level < 1) return "bg-muted";
  return LEVEL_SCALE[String(Math.min(5, Math.floor(level)))] ?? "bg-muted";
}

function LevelLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground" aria-label="Proficiency scale">
      <span className="font-semibold uppercase tracking-wider">Proficiency</span>
      {LEVELS.map((l) => (
        <span key={l.value} className="inline-flex items-center gap-1">
          <span className={cn("size-2.5 rounded-full", LEVEL_SCALE[l.value])} aria-hidden="true" />
          {l.label}
        </span>
      ))}
    </div>
  );
}

function getCategory(skillName: string): string {
  return canonicalizeSkill(skillName)?.category ?? "Other";
}

function toCertDateInput(raw: Date | string | null): string {
  if (!raw) return "";
  const iso = typeof raw === "string" ? raw : new Date(raw).toISOString();
  return iso.slice(0, 10);
}

interface SkillGroup {
  canonicalName: string;
  category: string;
  entries: EmployeeSkill[];
}

function SkillCombobox({
  value, onValueChange,
}: { value: string; onValueChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: suggestions } = useSkillSuggestions(search.trim());

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: { skill: string; recognized: boolean }[] = [];
    for (const s of suggestions ?? []) {
      const key = s.skill.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ skill: s.skill, recognized: s.recognized });
    }
    for (const name of CATALOG_SKILL_NAMES) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ skill: name, recognized: true });
    }
    return list;
  }, [suggestions]);

  const trimmed = search.trim();
  const exactExists = !!trimmed && options.some((o) => o.skill.toLowerCase() === trimmed.toLowerCase());
  const canonical = trimmed ? canonicalizeSkill(trimmed) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Skill name"
          className={cn("w-full justify-between font-normal border-input h-9 px-3", !value && "text-muted-foreground")}
        >
          <span className="truncate text-left">{value || "Select or type a skill…"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden" align="start" onWheel={(e) => e.stopPropagation()}>
        <Command className="flex h-auto max-h-[min(320px,70vh)] min-h-0 w-full flex-col overflow-hidden" shouldFilter={false}>
          <CommandInput placeholder="Search skill…" className="h-9" value={search} onValueChange={setSearch} />
          <CommandList className="max-h-[min(260px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
            <CommandEmpty>No matching skill. Type to add a custom one.</CommandEmpty>
            {trimmed && !exactExists && (
              <CommandGroup heading="Add new">
                <CommandItem value={`__add__${trimmed}`} onSelect={() => { onValueChange(canonical?.canonical ?? trimmed); setOpen(false); }}>
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Add &ldquo;{canonical?.canonical ?? trimmed}&rdquo;</span>
                  {canonical && !canonical.recognized && <Badge variant="outline" className="ml-auto text-3xs">custom</Badge>}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Skills">
              {options.filter((o) => !trimmed ? true : o.skill.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 50).map((opt) => (
                <CommandItem key={opt.skill} value={opt.skill} onSelect={() => { onValueChange(opt.skill); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value.toLowerCase() === opt.skill.toLowerCase() ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.skill}</span>
                  {!opt.recognized && <Badge variant="outline" className="ml-auto text-3xs">custom</Badge>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function SkillsPage() {
  const { data: skills, isLoading, isError, error, refetch } = useEmployeeSkills();
  const addSkill = useAddSkill();
  const verifySkill = useVerifySkill();
  const deleteSkill = useDeleteSkill();
  const updateSkill = useUpdateSkill();
  const { data: session } = useSession();
  const canVerify = isAdminOrOwner(session?.user?.role);
  const userId = session?.user?.id;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [level, setLevel] = useState("3");
  const [certifiedAt, setCertifiedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const [editTarget, setEditTarget] = useState<EmployeeSkill | null>(null);
  const [editLevel, setEditLevel] = useState("3");
  const [editCertifiedAt, setEditCertifiedAt] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<EmployeeSkill | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    if (!sheetOpen) { setSkillName(""); setLevel("3"); setCertifiedAt(""); setValidUntil(""); }
  }, [sheetOpen]);

  const openEdit = useCallback((entry: EmployeeSkill) => {
    setEditTarget(entry);
    setEditLevel(String(entry.level ?? 3));
    setEditCertifiedAt(toCertDateInput(entry.certifiedAt));
    setEditValidUntil(entry.validUntil ?? "");
  }, []);

  const skillGroups = useMemo<SkillGroup[]>(() => {
    const byCanonical = new Map<string, SkillGroup>();
    for (const s of skills ?? []) {
      const result = canonicalizeSkill(s.skillName);
      const canonical = result?.canonical ?? s.skillName;
      const category = result?.category ?? "Other";
      const key = canonical.toLowerCase();
      if (!byCanonical.has(key)) {
        byCanonical.set(key, { canonicalName: canonical, category, entries: [] });
      }
      byCanonical.get(key)!.entries.push(s);
    }
    return [...byCanonical.values()].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
  }, [skills]);

  const filteredGroups = useMemo(() => {
    let list = skillGroups;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.canonicalName.toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") {
      list = list.filter((g) => g.category === categoryFilter);
    }
    return list;
  }, [skillGroups, search, categoryFilter]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, SkillGroup[]>();
    for (const g of filteredGroups) {
      if (!map.has(g.category)) map.set(g.category, []);
      map.get(g.category)!.push(g);
    }
    return map;
  }, [filteredGroups]);

  const uniqueSkillCount = skillGroups.length;
  const totalEntryCount = (skills ?? []).length;

  const skillExportSheets = useMemo(() => [{
    name: "Skills",
    columns: [
      { header: "Skill", key: "skill", width: 28 },
      { header: "Category", key: "category", width: 20 },
      { header: "Level", key: "level", width: 16 },
      { header: "Certified At", key: "certifiedAt", width: 16 },
      { header: "Valid Until", key: "validUntil", width: 16 },
    ],
    rows: filteredGroups.flatMap((g) =>
      g.entries.map((e) => ({
        skill: g.canonicalName,
        category: g.category,
        level: levelLabel(e.level),
        certifiedAt: e.certifiedAt ? String(e.certifiedAt).slice(0, 10) : "",
        validUntil: e.validUntil ?? "",
      }))
    ),
  }], [filteredGroups]);

  const handleAdd = useCallback(() => {
    if (!skillName.trim()) { toast.error("Skill name is required"); return; }
    if (certifiedAt && validUntil && validUntil < certifiedAt) {
      toast.error("Valid-until date cannot be before the certified-on date"); return;
    }
    addSkill.mutate(
      { skillName: skillName.trim(), level: Number(level), certifiedAt: certifiedAt || null, validUntil: validUntil || null },
      {
        onSuccess: () => { toast.success("Skill added"); setSheetOpen(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [skillName, level, certifiedAt, validUntil, addSkill]);

  const handleUpdate = useCallback(() => {
    if (!editTarget) return;
    if (editCertifiedAt && editValidUntil && editValidUntil < editCertifiedAt) {
      toast.error("Valid-until date cannot be before the certified-on date"); return;
    }
    updateSkill.mutate(
      {
        skillId: editTarget.id,
        level: Number(editLevel),
        certifiedAt: editCertifiedAt || null,
        validUntil: editValidUntil || null,
      },
      {
        onSuccess: () => { toast.success("Skill updated"); setEditTarget(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editTarget, editLevel, editCertifiedAt, editValidUntil, updateSkill]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteSkill.mutate(
      { skillId: deleteTarget.id },
      {
        onSuccess: () => { toast.success("Skill removed"); setDeleteTarget(null); },
        onError: (e) => { toast.error(getErrorMessage(e)); setDeleteTarget(null); },
      },
    );
  }, [deleteTarget, deleteSkill]);

  const handleToggleVerify = useCallback((entry: EmployeeSkill) => {
    const verified = !entry.verifiedBy;
    verifySkill.mutate(
      { skillId: entry.id, verified },
      {
        onSuccess: () => toast.success(verified ? "Skill verified" : "Verification removed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [verifySkill]);

  if (isLoading) {
    return (
      <PageWrapper title="Skills matrix">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Skills matrix"
      badge={`${pluralise(uniqueSkillCount, "skill")} · ${pluralise(totalEntryCount, "entry", "entries")}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            filename={`skills-${getTodayString()}.xlsx`}
            sheets={skillExportSheets}
          />
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />Add Skill
          </Button>
        </div>
      }
      filters={
        <ListToolbar
          className="w-full"
          search={{ value: search, onChange: setSearch, placeholder: "Search skills…" }}
          filters={
            <>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATALOG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {(search || categoryFilter !== "all") && (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>
                  Clear
                </Button>
              )}
            </>
          }
        />
      }
    >
      <div className="space-y-4">
        {!isError && skillGroups.length > 0 && <LevelLegend />}

        {isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : filteredGroups.length === 0 ? (
          skillGroups.length === 0 ? (
            <EmptyState
              title="No skills recorded yet. Add your first skill."
              action={{ label: "Add Skill", onClick: () => setSheetOpen(true) }}
            />
          ) : (
            <EmptyState
              title="No results for these filters"
              description="No skills match your filters."
              action={{ label: "Clear filters", onClick: () => { setSearch(""); setCategoryFilter("all"); } }}
            />
          )
        ) : categoryFilter !== "all" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredGroups.map((g) => (
              <SkillCard
                key={g.canonicalName}
                group={g}
                canVerify={canVerify}
                userId={userId}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onVerify={handleToggleVerify}
                verifyPending={verifySkill.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedByCategory.entries()).map(([cat, groups]) => (
              <div key={cat}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                  <span className="text-2xs tabular-nums text-subtle-foreground">({groups.length})</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {groups.map((g) => (
                    <SkillCard
                      key={g.canonicalName}
                      group={g}
                      canVerify={canVerify}
                      userId={userId}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onVerify={handleToggleVerify}
                      verifyPending={verifySkill.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Add skill"
        onSubmit={handleAdd}
        submitLabel="Add Skill"
        isPending={addSkill.isPending}
        submitDisabled={!skillName.trim()}
        submitDisabledReason="Enter a skill name."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Skill Name <span className="text-destructive">*</span></label>
            <SkillCombobox value={skillName} onValueChange={setSkillName} />
            <p className="text-2xs text-muted-foreground">Pick from the catalog to keep names consistent, or type to add a custom one.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Proficiency Level</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.value} — {l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Certified on <span className="text-muted-foreground font-normal">(optional)</span></label>
              <DatePicker value={certifiedAt} onChange={setCertifiedAt} placeholder="Cert date" toDate={new Date()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valid until <span className="text-muted-foreground font-normal">(optional)</span></label>
              <DatePicker value={validUntil} onChange={setValidUntil} placeholder="Expiry date" fromDate={certifiedAt ? new Date(certifiedAt) : undefined} />
            </div>
          </div>
          <p className="text-2xs text-muted-foreground">Expired or soon-to-expire certifications are flagged automatically.</p>
        </div>
      </HrSheet>

      <HrSheet
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        title={`Edit: ${editTarget?.skillName ?? ""}`}
        description={`Update proficiency level or certification details for this skill.`}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        isPending={updateSkill.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Proficiency Level</label>
            <Select value={editLevel} onValueChange={setEditLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.value} — {l.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Certified on <span className="text-muted-foreground font-normal">(optional)</span></label>
              <DatePicker value={editCertifiedAt} onChange={setEditCertifiedAt} placeholder="Cert date" toDate={new Date()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valid until <span className="text-muted-foreground font-normal">(optional)</span></label>
              <DatePicker value={editValidUntil} onChange={setEditValidUntil} placeholder="Expiry date" fromDate={editCertifiedAt ? new Date(editCertifiedAt) : undefined} />
            </div>
          </div>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Remove skill"
        description={`Remove "${deleteTarget?.skillName}" for ${deleteTarget?.user?.name ?? "this employee"}? This cannot be undone.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteSkill.isPending}
      />
    </PageWrapper>
  );
}

function SkillCard({
  group, canVerify, userId, onEdit, onDelete, onVerify, verifyPending,
}: {
  group: SkillGroup;
  canVerify: boolean;
  userId: string | undefined;
  onEdit: (e: EmployeeSkill) => void;
  onDelete: (e: EmployeeSkill) => void;
  onVerify: (e: EmployeeSkill) => void;
  verifyPending: boolean;
}) {
  const { canonicalName, entries } = group;
  const expiredCount = entries.filter((s) => getCertStatus(s.validUntil) === "expired").length;
  const expiringCount = entries.filter((s) => getCertStatus(s.validUntil) === "expiring").length;
  const verifiedCount = entries.filter((s) => !!s.verifiedBy).length;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold leading-snug" title={canonicalName}>{canonicalName}</h3>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 tabular-nums">
            {expiredCount > 0 && (
              <StatusPill tone={CERT_TONE.expired}>{expiredCount} expired</StatusPill>
            )}
            {expiringCount > 0 && (
              <StatusPill tone={CERT_TONE.expiring}>{expiringCount} expiring</StatusPill>
            )}
            {verifiedCount > 0 && (
              <StatusPill tone="success">{verifiedCount} verified</StatusPill>
            )}
            <Badge variant="outline">{entries.length} {entries.length === 1 ? "person" : "people"}</Badge>
          </div>
        </div>
        <div className="space-y-1">
          {entries.slice(0, 5).map((s) => {
            const certStatus = getCertStatus(s.validUntil);
            const isCertified = !!s.certifiedAt;
            const canEdit = canVerify || s.userId === userId;
            return (
              <div key={s.id} className="group/row flex min-h-7 items-center gap-1.5 text-xs">
                <div className={cn("size-2.5 shrink-0 rounded-full", levelColor(s.level))} title={`${LEVELS.find(l => l.value === String(s.level))?.label ?? ""}`} />
                <span className="flex-1 truncate min-w-0">{s.user?.name ?? "You"}</span>
                {isCertified && (
                  <span
                    className="shrink-0"
                    title={s.certifiedAt ? `Certified ${formatCertDate(typeof s.certifiedAt === "string" ? s.certifiedAt : new Date(s.certifiedAt).toISOString())}` : "Certified"}
                  >
                    <Award className="size-3.5 text-brand-text" aria-label="Certified" />
                  </span>
                )}
                {certStatus !== "none" && (
                  <span title={`Valid until ${formatCertDate(s.validUntil)}`} className="shrink-0">
                    <StatusPill tone={CERT_TONE[certStatus]} className="tabular-nums">
                      {certStatus === "valid" ? `Valid · ${formatCertDate(s.validUntil)}` : certStatusLabel(certStatus, s.validUntil)}
                    </StatusPill>
                  </span>
                )}
                <span className="shrink-0 text-2xs text-muted-foreground">{LEVELS.find(l => l.value === String(s.level))?.label ?? ""}</span>
                {canVerify && (
                  <button
                    type="button"
                    onClick={() => onVerify(s)}
                    disabled={verifyPending}
                    title={s.verifiedBy ? "Click to unverify" : "Click to verify"}
                    className="shrink-0 rounded-full outline-none focus-visible:focus-ring disabled:opacity-50"
                    aria-label={s.verifiedBy ? "Unverify" : "Verify"}
                  >
                    <CheckCircle2 aria-hidden="true" className={cn("size-4 transition-colors", s.verifiedBy ? "text-success-strong" : "text-subtle-foreground hover:text-muted-foreground")} />
                  </button>
                )}
                {!canVerify && s.verifiedBy && (
                  <CheckCircle2 className="size-3.5 shrink-0 text-success-strong" aria-label="Verified" />
                )}
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="rounded-sm p-1 outline-none hover:bg-accent focus-visible:focus-ring"
                      aria-label="Edit skill"
                    >
                      <Pencil className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(s)}
                      className="rounded-sm p-1 outline-none hover:bg-accent focus-visible:focus-ring"
                      aria-label="Remove skill"
                    >
                      <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {entries.length > 5 && (
            <p className="pl-4 text-2xs tabular-nums text-muted-foreground">+{entries.length - 5} more</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
