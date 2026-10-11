"use client";

import { useState, useCallback } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useReferenceChecks,
  useCreateReferenceCheck,
  useUpdateReferenceCheck,
  useDeleteReferenceCheck,
} from "@/lib/api/hooks/hr/recruitment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import type { PhoneValue } from "@/lib/phone";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import type { Tone } from "@/lib/design/tones";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Mail, Phone, Building2, User2, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "DECLINED"] as const;
type ReferenceStatus = typeof STATUS_OPTIONS[number];

const STATUS_CONFIG: Record<ReferenceStatus, { label: string; tone: Tone; icon: React.FC<{ className?: string }> }> = {
  PENDING: { label: "Pending", tone: "warning", icon: Clock },
  IN_PROGRESS: { label: "In Progress", tone: "info", icon: AlertCircle },
  COMPLETED: { label: "Completed", tone: "success", icon: CheckCircle2 },
  DECLINED: { label: "Declined", tone: "danger", icon: XCircle },
};

interface Props {
  candidateId: number;
}

export function ReferenceChecksTab({ candidateId }: Props) {
  const { data: checks, isLoading } = useReferenceChecks(candidateId);
  const createCheck = useCreateReferenceCheck(candidateId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [refName, setRefName] = useState("");
  const [refDesignation, setRefDesignation] = useState("");
  const [refCompany, setRefCompany] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [refPhone, setRefPhone] = useState<PhoneValue>("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = useCallback(() => {
    if (!refName.trim()) { toast.error("Reference name is required"); return; }
    if (refEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(refEmail.trim())) {
      toast.error("Enter a valid reference email");
      return;
    }
    createCheck.mutate(
      {
        referenceName: refName.trim(),
        referenceDesignation: refDesignation.trim() || undefined,
        referenceCompany: refCompany.trim() || undefined,
        referenceEmail: refEmail.trim() || undefined,
        referencePhone: refPhone?.toString().trim() || undefined,
        relationship: relationship.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Reference check added");
          setSheetOpen(false);
          setRefName(""); setRefDesignation(""); setRefCompany("");
          setRefEmail(""); setRefPhone(""); setRelationship(""); setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [refName, refDesignation, refCompany, refEmail, refPhone, relationship, notes, createCheck]);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm tabular-nums text-muted-foreground">
          {checks?.length ?? 0} reference{checks?.length !== 1 ? "s" : ""}
        </p>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus aria-hidden="true" />Add Reference
            </Button>
          </SheetTrigger>
          <SheetContent size="md" className="flex flex-col gap-0 p-0">
            <SheetHeader className="shrink-0 border-b border-border">
              <SheetTitle>Add Reference</SheetTitle>
              <SheetDescription>Add a reference contact to track.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference Name</label>
                <Input placeholder="e.g. Rajesh Kumar" value={refName} onChange={(e) => setRefName(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Designation</label>
                  <Input placeholder="e.g. VP Engineering" value={refDesignation} onChange={(e) => setRefDesignation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Input placeholder="e.g. Infosys" value={refCompany} onChange={(e) => setRefCompany(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="ref@company.com" value={refEmail} onChange={(e) => setRefEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <PhoneInput value={refPhone} onChange={(v) => setRefPhone(v ?? "")} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Relationship</label>
                <Input placeholder="e.g. Direct Manager, Team Lead" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea placeholder="Any notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <SheetFooter>
              <Button variant="ghost" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} loading={createCheck.isPending}>
                Add Reference
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {!checks?.length ? (
        <EmptyState
          compact
          illustration={<EmptyPersonIllustration className="size-24" />}
          title="No reference checks added yet."
          className="border-0 bg-transparent"
        />
      ) : (
        <div className="space-y-3">
          {checks.map((check) => (
            <ReferenceCheckCard key={check.id} check={check} candidateId={candidateId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReferenceCheckCard({
  check,
  candidateId,
}: {
  check: {
    id: number;
    referenceName: string;
    referenceDesignation: string | null;
    referenceCompany: string | null;
    referenceEmail: string | null;
    referencePhone: string | null;
    relationship: string | null;
    status: string;
    outcome: string | null;
    notes: string | null;
  };
  candidateId: number;
}) {
  const updateCheck = useUpdateReferenceCheck(candidateId, check.id);
  const deleteCheck = useDeleteReferenceCheck(candidateId, check.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const status = (check.status as ReferenceStatus) in STATUS_CONFIG ? (check.status as ReferenceStatus) : "PENDING";
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  const handleStatusChange = useCallback((newStatus: string) => {
    updateCheck.mutate(
      { status: newStatus as ReferenceStatus },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [updateCheck]);

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{check.referenceName}</p>
            <StatusPill tone={cfg.tone}>
              <Icon className="size-3" aria-hidden="true" />
              {cfg.label}
            </StatusPill>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {check.referenceDesignation && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User2 className="size-3" aria-hidden="true" />{check.referenceDesignation}
              </span>
            )}
            {check.referenceCompany && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="size-3" aria-hidden="true" />{check.referenceCompany}
              </span>
            )}
            {check.referenceEmail && (
              <a href={`mailto:${check.referenceEmail}`} className="flex items-center gap-1 rounded-sm text-xs text-brand-text outline-none hover:underline focus-visible:focus-ring">
                <Mail className="size-3" aria-hidden="true" />{check.referenceEmail}
              </a>
            )}
            {check.referencePhone && (
              <a href={`tel:${check.referencePhone}`} className="flex items-center gap-1 rounded-sm text-xs tabular-nums text-muted-foreground outline-none hover:underline focus-visible:focus-ring">
                <Phone className="size-3" aria-hidden="true" />{check.referencePhone}
              </a>
            )}
          </div>
          {check.relationship && (
            <p className="text-xs text-muted-foreground mt-1">
              Relationship: <span className="text-foreground">{check.relationship}</span>
            </p>
          )}
          {check.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{check.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Select value={status} onValueChange={handleStatusChange} disabled={updateCheck.isPending}>
            <SelectTrigger className="h-8 w-36 text-xs" aria-label="Reference status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            disabled={deleteCheck.isPending}
            onClick={() => setConfirmDelete(true)}
            aria-label="Remove reference"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <ConfirmActionDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove reference?"
        description="This will permanently remove this reference check. This action cannot be undone."
        confirmLabel="Remove"
        variant="destructive"
        isPending={deleteCheck.isPending}
        onConfirm={() => deleteCheck.mutate(undefined, {
          onSuccess: () => { toast.success("Reference removed"); setConfirmDelete(false); },
          onError: (e) => toast.error(getErrorMessage(e)),
        })}
      />
    </div>
  );
}
