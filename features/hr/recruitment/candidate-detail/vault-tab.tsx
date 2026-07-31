"use client";

import { useState, useCallback, useRef } from "react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
  Upload, FileText, Download, Trash2, ShieldCheck, ShieldX, Clock,
  CheckCircle2, AlertTriangle, ChevronDown, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCandidateVault,
  useAddVaultDocument,
  useDeleteVaultDocument,
  useUpdateCandidateBgv,
  useVaultAccessLogs,
  type VaultDocumentType,
  type BgvStatus,
} from "@/lib/api/hooks/hr/recruitment";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BgvStatus as CandidateBgvStatus } from "@/types/hr";


const DOCUMENT_TYPES: Array<{ value: VaultDocumentType; label: string }> = [
  { value: "AADHAR", label: "Aadhar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "CERTIFICATE", label: "Certificate/Degree" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "OTHER", label: "Other" },
];

const BGV_STATUSES: Array<{ value: BgvStatus; label: string; color: string }> = [
  { value: "NOT_INITIATED", label: "Not Initiated", color: "bg-muted text-muted-foreground border-border" },
  { value: "INITIATED", label: "Initiated", color: "bg-blue/10 text-blue border-blue/20" },
  { value: "PENDING", label: "Pending", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "CLEARED", label: "Cleared", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "FAILED", label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/20" },
];

function getBgvStyle(status: string | null) {
  return BGV_STATUSES.find((s) => s.value === status) ?? BGV_STATUSES[0]!;
}


function AvScanBadge({ result }: { result: "PENDING" | "CLEAN" | "INFECTED" | null }) {
  if (result === "CLEAN") {
    return (
      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
        <ShieldCheck className="h-2.5 w-2.5" />
        Clean
      </Badge>
    );
  }
  if (result === "INFECTED") {
    return (
      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 gap-1">
        <ShieldX className="h-2.5 w-2.5" />
        Infected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      <Clock className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: "2s" }} />
      Scanning
    </Badge>
  );
}


interface BgvTrackerProps {
  candidateId: number;
  bgvStatus: CandidateBgvStatus | null;
  bgvAgency: string | null;
  bgvNotes: string | null;
  bgvInitiatedAt: string | null;
  bgvCompletedAt: string | null;
}

function BgvTracker({ candidateId, bgvStatus, bgvAgency, bgvNotes, bgvInitiatedAt, bgvCompletedAt }: BgvTrackerProps) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<BgvStatus>(bgvStatus ?? "NOT_INITIATED");
  const [agency, setAgency] = useState(bgvAgency ?? "");
  const [notes, setNotes] = useState(bgvNotes ?? "");

  const update = useUpdateCandidateBgv(candidateId);
  const style = getBgvStyle(bgvStatus);

  const handleSave = useCallback(() => {
    update.mutate(
      { bgvStatus: status, bgvAgency: agency || undefined, bgvNotes: notes || undefined },
      {
        onSuccess: () => { toast.success("BgV status updated"); setEditing(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [update, status, agency, notes]);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Background Verification
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-[11px]", style.color)}>
            {style.label}
          </Badge>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setEditing((p) => !p)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {bgvInitiatedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Initiated {format(new Date(bgvInitiatedAt), "d MMM yyyy")}
            </span>
          )}
          {bgvCompletedAt && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completed {format(new Date(bgvCompletedAt), "d MMM yyyy")}
            </span>
          )}
          {bgvAgency && !editing && (
            <span>Agency: <strong className="text-foreground">{bgvAgency}</strong></span>
          )}
        </div>

        {bgvNotes && !editing && (
          <p className="text-xs text-muted-foreground italic">{bgvNotes}</p>
        )}

        {editing && (
          <div className="space-y-3 pt-1 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as BgvStatus)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BGV_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Agency</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. AuthBridge"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                className="text-xs resize-none"
                rows={2}
                placeholder="Internal notes about the verification..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={update.isPending}
            >
              {update.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


interface UploadAreaProps {
  candidateId: number;
}

function UploadArea({ candidateId }: UploadAreaProps) {
  const [docType, setDocType] = useState<VaultDocumentType>("OTHER");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addDoc = useAddVaultDocument(candidateId);

  const handleFile = useCallback(
    async (file: File) => {
      const fakeUrl = URL.createObjectURL(file);
      const fakeKey = `org/candidates/${candidateId}/${Date.now()}-${file.name}`;

      addDoc.mutate(
        {
          filename: file.name,
          s3Key: fakeKey,
          fileUrl: fakeUrl,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          documentType: docType,
        },
        {
          onSuccess: () => toast.success(`${file.name} uploaded`),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [addDoc, candidateId, docType]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={docType} onValueChange={(v) => setDocType(v as VaultDocumentType)}>
          <SelectTrigger className="h-8 text-xs w-48">
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={addDoc.isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3 w-3 mr-1" />
          {addDoc.isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
          dragging ? "border-primary/50 bg-primary/5" : "border-border hover:border-muted-foreground/40"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">Drop PDF or DOCX here, or click to browse</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        aria-label="Upload vault document"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}


interface DocumentListProps {
  candidateId: number;
}

function DocumentList({ candidateId }: DocumentListProps) {
  const { data: docs, isLoading } = useCandidateVault(candidateId);
  const deleteDoc = useDeleteVaultDocument(candidateId);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (!docs?.length) {
    return (
      <div className="py-6 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {docs.map((doc) => {
          const docTypeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.documentType)?.label ?? doc.documentType ?? "Document";
          return (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{doc.filename}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{docTypeLabel}</Badge>
                    <AvScanBadge result={doc.avResult} />
                    {doc.expiresAt && (() => {
                      const daysLeft = differenceInDays(new Date(doc.expiresAt), new Date());
                      if (daysLeft < 0) {
                        return (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Expired
                          </Badge>
                        );
                      }
                      if (daysLeft <= 30) {
                        return (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-400 gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Expires in {daysLeft}d
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                    {doc.createdAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(doc.createdAt), "d MMM yy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {doc.avResult !== "INFECTED" && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted transition-colors"
                    aria-label={`Download ${doc.filename}`}
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {doc.avResult === "INFECTED" && (
                  <span className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Blocked
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  aria-label={`Delete ${doc.filename}`}
                  onClick={() => setPendingDelete(doc.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete Document"
        description="This will permanently delete the document from the vault. This action cannot be undone."
        confirmLabel={deleteDoc.isPending ? "Deleting..." : "Delete"}
        destructive
        onConfirm={() => {
          if (pendingDelete === null) return;
          deleteDoc.mutate(pendingDelete, {
            onSuccess: () => { toast.success("Document deleted"); setPendingDelete(null); },
            onError: (e) => { toast.error(getErrorMessage(e)); setPendingDelete(null); },
          });
        }}
      />
    </>
  );
}


export interface VaultTabProps {
  candidateId: number;
  bgvStatus: CandidateBgvStatus | null;
  bgvAgency: string | null;
  bgvNotes: string | null;
  bgvInitiatedAt: string | null;
  bgvCompletedAt: string | null;
}

export function VaultTab(props: VaultTabProps) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-4">
      <BgvTracker
        candidateId={props.candidateId}
        bgvStatus={props.bgvStatus}
        bgvAgency={props.bgvAgency}
        bgvNotes={props.bgvNotes}
        bgvInitiatedAt={props.bgvInitiatedAt ? String(props.bgvInitiatedAt) : null}
        bgvCompletedAt={props.bgvCompletedAt ? String(props.bgvCompletedAt) : null}
      />

      <Card>
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Verification Documents
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowUpload((p) => !p)}
          >
            <Upload className="h-3 w-3" />
            {showUpload ? "Hide Upload" : "Upload"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", showUpload && "rotate-180")} />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {showUpload && <UploadArea candidateId={props.candidateId} />}
          <DocumentList candidateId={props.candidateId} />
        </CardContent>
      </Card>

      <AccessLogSection candidateId={props.candidateId} />
    </div>
  );
}

function AccessLogSection({ candidateId }: { candidateId: number }) {
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const isHr = role && ["CEO", "HR", "ADMIN"].includes(role);

  const { data: logs, isLoading } = useVaultAccessLogs(isHr ? candidateId : 0);

  if (!isHr) return null;

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Access Log</CardTitle>
        <span className="text-xs text-muted-foreground ml-auto">HR only</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !logs?.length ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No access events recorded.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 py-1 text-xs">
                <Badge
                  variant={log.action === "DOWNLOAD" ? "default" : "secondary"}
                  className="text-[10px] px-1 py-0 shrink-0"
                >
                  {log.action}
                </Badge>
                <span className="font-medium truncate flex-1">{log.fileName}</span>
                <span className="text-muted-foreground shrink-0">{log.accessorDisplayName}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {log.accessedAt ? format(new Date(log.accessedAt), "dd MMM, HH:mm") : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
