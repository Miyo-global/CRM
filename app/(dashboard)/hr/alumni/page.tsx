"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Briefcase, Calendar, Mail } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { isAdminOrOwner } from "@/lib/constants/roles";

interface Alumni {
  id: number; name: string; email: string | null; phone: string | null;
  lastDesignation: string | null; department: string | null;
  exitDate: string | null; currentCompany: string | null;
  linkedinUrl: string | null; createdAt: string | null;
}

const alumniKeys = { all: [...queryKeys.hr.all, "alumni"] as const, list: () => [...alumniKeys.all, "list"] as const };

export default function AlumniPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = isAdminOrOwner(session?.user?.role);

  const { data: alumni, isLoading, isError, error, refetch } = useQuery({
    queryKey: alumniKeys.list(),
    queryFn: () => apiClient.get<Alumni[]>("/hr/alumni"),
  });

  const create = useMutation({
    mutationFn: (data: { name: string; email?: string; phone?: string; lastDesignation?: string; department?: string; exitDate?: string; currentCompany?: string; linkedinUrl?: string }) =>
      apiClient.post<Alumni>("/hr/alumni", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: alumniKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");

  const handleCreate = useCallback(() => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    create.mutate(
      { name: name.trim(), email: email || undefined, lastDesignation: designation || undefined, department: department || undefined, exitDate: exitDate || undefined, currentCompany: currentCompany || undefined },
      {
        onSuccess: () => {
          toast.success("Alumni added"); setSheetOpen(false);
          setName(""); setEmail(""); setDesignation(""); setDepartment(""); setExitDate(""); setCurrentCompany("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, email, designation, department, exitDate, currentCompany, create]);

  if (isLoading) {
    return (
      <PageWrapper title="Alumni Network" subtitle="Stay connected with former employees">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Alumni Network"
      subtitle="Stay connected with former team members"
      badge={`${alumni?.length ?? 0} alumni`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />Add Alumni</Button> : undefined}
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : !alumni?.length ? (
        <EmptyState
          illustration={<EmptyTeamIllustration className="size-32" />}
          title="No alumni records yet"
          description="Add former team members to stay connected with your alumni network."
          action={isAdmin ? { label: "Add Alumni", onClick: () => setSheetOpen(true) } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {alumni.map((a: Alumni) => (
            <Card key={a.id} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                    {a.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground" title={a.name}>{a.name}</h3>
                    {a.lastDesignation && <p className="truncate text-xs text-muted-foreground">{a.lastDesignation}{a.department ? ` - ${a.department}` : ""}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  {a.exitDate && <span className="flex items-center gap-1"><Calendar className="size-3.5" aria-hidden="true" />Left {format(new Date(a.exitDate), "MMM yyyy")}</span>}
                  {a.currentCompany && <span className="flex min-w-0 items-center gap-1"><Briefcase className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{a.currentCompany}</span></span>}
                  {a.email && <span className="flex min-w-0 items-center gap-1"><Mail className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{a.email}</span></span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Add Alumni" onSubmit={handleCreate} submitLabel="Add" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Full Name</label>
          <Input placeholder="Employee name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Last Designation</label>
            <Input placeholder="e.g., Sr. Engineer" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Department</label>
            <Input placeholder="e.g., Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Exit Date</label>
            <Input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Company</label>
            <Input placeholder="Where they work now" value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
