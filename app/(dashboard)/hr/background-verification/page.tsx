"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import {
  useBackgroundVerifications, useCreateBackgroundVerification, useUpdateBackgroundVerification,
  type BackgroundVerification,
} from "@/lib/api/hooks/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tone } from "@/lib/design/tones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, ShieldCheck, CheckCircle2, XCircle, BarChart2 } from "lucide-react";
import type { Employee } from "@/types/hr";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

const BGV_TYPES = ["Identity", "Education", "Employment", "Criminal", "Address", "Credit"];

function statusTone(s: string | null): Tone {
  if (s === "CLEAR") return "success";
  if (s === "IN_PROGRESS") return "info";
  if (s === "FLAGGED") return "danger";
  return "warning";
}

function BGVContent() {
  const { data: items, isLoading, isError, error, refetch } = useBackgroundVerifications();
  const { data: employeesRaw } = useHrEmployees();
  const create = useCreateBackgroundVerification();
  const update = useUpdateBackgroundVerification();

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("Identity");
  const [provider, setProvider] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = useCallback(() => {
    if (!userId) { toast.error("Employee is required"); return; }
    create.mutate(
      { userId, type, provider: provider || undefined, referenceNumber: refNumber || undefined, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Verification initiated");
          setSheetOpen(false); setUserId(""); setType("Identity"); setProvider(""); setRefNumber(""); setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, type, provider, refNumber, notes, create]);

  const handleUpdateStatus = useCallback((id: number, status: string) => {
    update.mutate({ id, status }, {
      onSuccess: () => toast.success("Status updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [update]);

  return (
    <PageWrapper
      title="Background Verification"
      subtitle="Initiate, track employee background checks, and view candidate compliance"
      badge={`${items?.length ?? 0} checks`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="size-4" aria-hidden="true" />Initiate BGV</Button>}
    >
      <Tabs defaultValue="employee-bgv">
        <TabsList variant="underline" className="mb-4">
          <TabsTrigger value="employee-bgv">Employee BGV</TabsTrigger>
        </TabsList>

        <TabsContent value="employee-bgv">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</div>
          ) : isError ? (
            <QueryErrorState error={error} onRetry={() => void refetch()} />
          ) : !items?.length ? (
            <EmptyState
              illustration={<EmptyDocumentsIllustration className="h-32 w-32" />}
              title="No background verifications initiated"
              description="Initiate a background check to start tracking employee verifications."
              action={{ label: "Initiate BGV", onClick: () => setSheetOpen(true) }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Initiated</TableHead>
                  <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((bgv: BackgroundVerification) => (
                  <TableRow key={bgv.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <IconChip icon={ShieldCheck} tone={statusTone(bgv.status)} size="sm" />
                        <span className="truncate font-medium text-foreground">{bgv.user?.name ?? "Employee"}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{bgv.type}</Badge></TableCell>
                    <TableCell><StatusPill tone={statusTone(bgv.status)} dot>{bgv.status ?? "PENDING"}</StatusPill></TableCell>
                    <TableCell className="text-muted-foreground">{bgv.provider ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{bgv.referenceNumber ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {bgv.createdAt ? format(new Date(bgv.createdAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {(!bgv.status || bgv.status === "IN_PROGRESS") && (
                        <div className="flex justify-end gap-2">
                          <Button size="xs" onClick={() => handleUpdateStatus(bgv.id, "CLEAR")} disabled={update.isPending} loading={update.isPending && update.variables?.id === bgv.id && update.variables?.status === "CLEAR"}>
                            <CheckCircle2 aria-hidden="true" />Clear
                          </Button>
                          <Button size="xs" variant="outline" onClick={() => handleUpdateStatus(bgv.id, "FLAGGED")} disabled={update.isPending} loading={update.isPending && update.variables?.id === bgv.id && update.variables?.status === "FLAGGED"}>
                            <XCircle aria-hidden="true" />Flag
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

      </Tabs>

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Initiate BGV" onSubmit={handleCreate} submitLabel="Initiate" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee</label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Verification Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BGV_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Provider</label>
          <Input placeholder="e.g., AuthBridge" value={provider} onChange={(e) => setProvider(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reference Number</label>
          <Input placeholder="Tracking reference" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}

export default function BackgroundVerificationPage() {
  return (
    <DashboardGate allowedRoles={["HR"]}>
      <BGVContent />
    </DashboardGate>
  );
}
