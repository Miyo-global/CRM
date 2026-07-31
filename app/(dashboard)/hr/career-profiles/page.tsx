"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus, UserCheck } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { EmployeeCareerProfile, CareerLadder, CareerLevel } from "@/types/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { Employee } from "@/types/hr";

const profileKeys = {
  all: ["hr", "career-profiles"] as const,
  list: () => [...profileKeys.all, "list"] as const,
};
const ladderKeys = {
  list: () => ["hr", "career-ladders", "list"] as const,
};

const EMPTY_FORM = { userId: "", ladderId: "", currentLevel: "1", notes: "" };

export default function CareerProfilesPage() {
  const { data: session } = useSession();
  const isAdmin = ["CEO", "HR", "ADMIN"].includes(session?.user?.role ?? "");
  const qc = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: profileKeys.list(),
    queryFn: () => apiClient.get<EmployeeCareerProfile[]>("/hr/career-profiles"),
  });

  const { data: laddersRaw } = useQuery({
    queryKey: ladderKeys.list(),
    queryFn: () => apiClient.get<CareerLadder[]>("/hr/career-ladders"),
  });

  const { data: employeesRaw } = useHrEmployees({ limit: 200 });

  const employees = useMemo(() => {
    const raw = employeesRaw as { data?: Employee[]; items?: Employee[] } | Employee[] | undefined;
    const list: Employee[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
    return list.map((e) => ({
      value: e.id,
      label: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email || e.id,
    }));
  }, [employeesRaw]);

  const ladders: CareerLadder[] = Array.isArray(laddersRaw) ? laddersRaw : [];

  const [addOpen, setAddOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<EmployeeCareerProfile | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const createProfile = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post<EmployeeCareerProfile>("/hr/career-profiles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.list() }),
  });

  const updateProfile = useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: Record<string, unknown> }) =>
      apiClient.patch<EmployeeCareerProfile>(`/hr/career-profiles/${employeeId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.list() }),
  });

  const selectedLadder = useMemo(
    () => ladders.find((l) => String(l.id) === form.ladderId),
    [ladders, form.ladderId],
  );

  const levelOptions = useMemo(() => {
    if (!selectedLadder?.levels) return [];
    return (selectedLadder.levels as CareerLevel[]).map((l) => ({
      value: String(l.level),
      label: `L${l.level} — ${l.title}`,
    }));
  }, [selectedLadder]);

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM);
    setAddOpen(true);
  }, []);

  const openEdit = useCallback((profile: EmployeeCareerProfile) => {
    setForm({
      userId: profile.userId,
      ladderId: profile.ladderId ? String(profile.ladderId) : "",
      currentLevel: profile.currentLevel ? String(profile.currentLevel) : "1",
      notes: profile.notes ?? "",
    });
    setEditProfile(profile);
  }, []);

  const handleCreate = useCallback(() => {
    if (!form.userId) { toast.error("Select an employee"); return; }
    createProfile.mutate(
      {
        userId: form.userId,
        ladderId: form.ladderId ? parseInt(form.ladderId) : null,
        currentLevel: form.currentLevel ? parseInt(form.currentLevel) : 1,
        notes: form.notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Career profile created");
          setAddOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [form, createProfile]);

  const handleUpdate = useCallback(() => {
    if (!editProfile) return;
    updateProfile.mutate(
      {
        employeeId: editProfile.userId,
        data: {
          ladderId: form.ladderId ? parseInt(form.ladderId) : null,
          currentLevel: form.currentLevel ? parseInt(form.currentLevel) : null,
          notes: form.notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Career profile updated");
          setEditProfile(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editProfile, form, updateProfile]);

  const rows: EmployeeCareerProfile[] = Array.isArray(profiles) ? profiles : [];

  if (isLoading) {
    return (
      <PageWrapper title="Career Profiles" subtitle="Employee career positions">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      </PageWrapper>
    );
  }

  const LevelForm = (
    <div className="space-y-4">
      {!editProfile && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
          <SearchableSelect
            options={employees}
            value={form.userId}
            onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}
            placeholder="Select employee"
            searchPlaceholder="Search employees…"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Career Ladder</label>
        <SearchableSelect
          options={[{ value: "", label: "No ladder" }, ...ladders.map((l) => ({ value: String(l.id), label: l.title }))]}
          value={form.ladderId}
          onValueChange={(v) => setForm((f) => ({ ...f, ladderId: v, currentLevel: "1" }))}
          placeholder="Select ladder"
          searchPlaceholder="Search ladders…"
        />
      </div>
      {levelOptions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Current Level</label>
          <SearchableSelect
            options={levelOptions}
            value={form.currentLevel}
            onValueChange={(v) => setForm((f) => ({ ...f, currentLevel: v }))}
            placeholder="Select level"
            searchPlaceholder="Search levels…"
          />
        </div>
      )}
      {!levelOptions.length && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Current Level</label>
          <Input
            type="number"
            min={1}
            max={20}
            value={form.currentLevel}
            onChange={(e) => setForm((f) => ({ ...f, currentLevel: e.target.value }))}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes</label>
        <Input
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Optional notes…"
          maxLength={1000}
        />
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Career Profiles"
      subtitle="Track each employee's position on a career ladder"
      badge={`${rows.length} profiles`}
      actions={
        isAdmin ? (
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Assign Profile
          </Button>
        ) : undefined
      }
    >
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[620px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Ladder</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Last Updated</TableHead>
                  {isAdmin && <TableHead className="text-right w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="h-10 w-10 opacity-30" />
                        <p className="text-sm">No career profiles yet.</p>
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={openAdd}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Assign Profile
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{p.employeeName ?? p.userId}</span>
                          {p.employeeEmail && (
                            <span className="text-xs text-muted-foreground">{p.employeeEmail}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.ladderTitle ? (
                          <Badge variant="outline" className="text-[11px]">{p.ladderTitle}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.currentLevel ? (
                          <Badge variant="secondary" className="text-[11px]">L{p.currentLevel}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.updatedAt ? format(new Date(p.updatedAt), "dd MMM yyyy") : "—"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>

      <HrSheet
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); }}
        title="Assign Career Profile"
        description="Assign an employee to a career ladder and level."
        onSubmit={handleCreate}
        submitLabel="Assign"
        isPending={createProfile.isPending}
      >
        {LevelForm}
      </HrSheet>

      <HrSheet
        open={editProfile !== null}
        onOpenChange={(o) => { if (!o) setEditProfile(null); }}
        title="Edit Career Profile"
        description={editProfile ? `Update career position for ${editProfile.employeeName ?? editProfile.userId}` : ""}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
        isPending={updateProfile.isPending}
      >
        {LevelForm}
      </HrSheet>
    </PageWrapper>
  );
}
