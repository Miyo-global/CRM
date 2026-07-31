"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Pencil, Trash2, Search, Filter,
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { SKILLS_CATALOG, canonicalizeSkill } from "@/lib/hr/skills-catalog";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import {
  getCertStatus, certBadgeClass, certStatusLabel, formatCertDate,
} from "@/features/hr/skills/cert-status";

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

function levelColor(level: number | null): string {
  if (level === null) return "bg-muted";
  if (level >= 5) return "bg-purple-500";
  if (level >= 4) return "bg-green-500";
  if (level >= 3) return "bg-blue-500";
  if (level >= 2) return "bg-amber-500";
  return "bg-muted-foreground";
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
                  {canonical && !canonical.recognized && <Badge variant="outline" className="ml-auto text-[9px]">custom</Badge>}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Skills">
              {options.filter((o) => !trimmed ? true : o.skill.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 50).map((opt) => (
                <CommandItem key={opt.skill} value={opt.skill} onSelect={() => { onValueChange(opt.skill); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value.toLowerCase() === opt.skill.toLowerCase() ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.skill}</span>
                  {!opt.recognized && <Badge variant="outline" className="ml-auto text-[9px]">custom</Badge>}
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
  const { data: skills, isLoading } = useEmployeeSkills();
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
      <PageWrapper title="Skills Matrix" subtitle="Track team competencies">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Skills Matrix"
      subtitle="Organisation-wide skill mapping and competency tracking"
      badge={`${uniqueSkillCount} skill${uniqueSkillCount !== 1 ? "s" : ""} · ${totalEntryCount} entries`}
      actions={
        <div className="flex items-center gap-2">
          <ExportButton
            filename={`skills-${new Date().toISOString().slice(0, 10)}.xlsx`}
            sheets={skillExportSheets}
          />
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Skill
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 text-sm w-[160px]">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATALOG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {(search || categoryFilter !== "all") && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>
              Clear
            </Button>
          )}
        </div>

        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              {skillGroups.length === 0 ? (
                <>
                  <EmptyTeamIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
                  <p className="text-sm text-muted-foreground">No skills recorded yet. Add your first skill.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No skills match your filters.</p>
              )}
            </CardContent>
          </Card>
        ) : categoryFilter !== "all" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                  <span className="text-[10px] text-muted-foreground/60">({groups.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        title="Add Skill"
        onSubmit={handleAdd}
        submitLabel="Add Skill"
        isPending={addSkill.isPending}
        submitDisabled={!skillName.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Skill Name <span className="text-destructive">*</span></label>
            <SkillCombobox value={skillName} onValueChange={setSkillName} />
            <p className="text-[11px] text-muted-foreground">Pick from the catalog to keep names consistent, or type to add a custom one.</p>
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
          <p className="text-[11px] text-muted-foreground">Expired or soon-to-expire certifications are flagged automatically.</p>
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
        title="Remove Skill"
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
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold truncate leading-snug">{canonicalName}</h3>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {expiredCount > 0 && (
              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", certBadgeClass("expired"))}>{expiredCount} expired</Badge>
            )}
            {expiringCount > 0 && (
              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", certBadgeClass("expiring"))}>{expiringCount} expiring</Badge>
            )}
            {verifiedCount > 0 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-500/5 text-green-700 border-green-200">{verifiedCount} verified</Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{entries.length} {entries.length === 1 ? "person" : "people"}</Badge>
          </div>
        </div>
        <div className="space-y-1">
          {entries.slice(0, 5).map((s) => {
            const certStatus = getCertStatus(s.validUntil);
            const isCertified = !!s.certifiedAt;
            const canEdit = canVerify || s.userId === userId;
            return (
              <div key={s.id} className="flex items-center gap-1.5 text-xs group/row">
                <div className={`h-2 w-2 rounded-full shrink-0 ${levelColor(s.level)}`} title={`${LEVELS.find(l => l.value === String(s.level))?.label ?? ""}`} />
                <span className="flex-1 truncate min-w-0">{s.user?.name ?? "You"}</span>
                {isCertified && (
                  <span
                    className="shrink-0"
                    title={s.certifiedAt ? `Certified ${formatCertDate(typeof s.certifiedAt === "string" ? s.certifiedAt : new Date(s.certifiedAt).toISOString())}` : "Certified"}
                  >
                    <Award className="h-3 w-3 text-amber-500" aria-label="Certified" />
                  </span>
                )}
                {certStatus !== "none" && (
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 px-1.5 py-0 text-[9px] font-medium", certBadgeClass(certStatus))}
                    title={`Valid until ${formatCertDate(s.validUntil)}`}
                  >
                    {certStatus === "valid" ? `Valid · ${formatCertDate(s.validUntil)}` : certStatusLabel(certStatus, s.validUntil)}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0">{LEVELS.find(l => l.value === String(s.level))?.label ?? ""}</span>
                {canVerify && (
                  <button
                    type="button"
                    onClick={() => onVerify(s)}
                    disabled={verifyPending}
                    title={s.verifiedBy ? "Click to unverify" : "Click to verify"}
                    className="shrink-0 disabled:opacity-50"
                    aria-label={s.verifiedBy ? "Unverify" : "Verify"}
                  >
                    <CheckCircle2 className={cn("h-3.5 w-3.5 transition-colors", s.verifiedBy ? "text-green-500" : "text-muted-foreground/30 hover:text-muted-foreground")} />
                  </button>
                )}
                {!canVerify && s.verifiedBy && (
                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                )}
                {canEdit && (
                  <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="p-0.5 rounded hover:bg-muted"
                      aria-label="Edit skill"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(s)}
                      className="p-0.5 rounded hover:bg-muted"
                      aria-label="Remove skill"
                    >
                      <Trash2 className="h-3 w-3 text-destructive/70" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {entries.length > 5 && (
            <p className="text-[10px] text-muted-foreground pl-3.5">+{entries.length - 5} more</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
