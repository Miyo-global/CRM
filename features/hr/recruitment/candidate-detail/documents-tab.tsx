"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  FileSignature,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

import { useRolloutDocuments, type RolloutDocumentRecord } from "@/lib/api/hooks/hr/recruitment";
import { RolloutDocumentsDialog } from "@/components/hr/recruitment/rollout-documents-dialog";


type DocStatus = "GENERATED" | "SENT" | "VIEWED" | "SIGNED" | "DECLINED";

const STATUS_CONFIG: Record<
  DocStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  GENERATED: {
    label: "Generated",
    icon: FileText,
    className: "bg-muted text-muted-foreground border-border",
  },
  SENT: {
    label: "Sent",
    icon: Send,
    className: "bg-blue/10 text-blue border-blue/20",
  },
  VIEWED: {
    label: "Viewed",
    icon: Eye,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  SIGNED: {
    label: "Signed",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  DECLINED: {
    label: "Declined",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as DocStatus] ?? STATUS_CONFIG.GENERATED;
}


function EsignTimeline({ doc }: { doc: RolloutDocumentRecord }) {
  const steps: Array<{
    key: keyof RolloutDocumentRecord;
    label: string;
    icon: React.ElementType;
  }> = [
    { key: "sentAt", label: "Sent", icon: Send },
    { key: "viewedAt", label: "Viewed", icon: Eye },
    { key: "signedAt", label: "Signed", icon: CheckCircle2 },
  ];

  if (doc.declinedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
        <XCircle className="h-3 w-3" />
        <span>Declined {format(new Date(doc.declinedAt), "PPp")}</span>
      </div>
    );
  }

  const doneCount = steps.filter((s) => doc[s.key] !== null && doc[s.key] !== undefined).length;

  return (
    <div className="flex items-center gap-1 mt-2">
      {steps.map((step, idx) => {
        const ts = doc[step.key] as string | null;
        const done = ts !== null && ts !== undefined;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                done
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
              title={ts ? format(new Date(ts), "PPp") : step.label}
            >
              <Icon className="h-3 w-3" />
              <span>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight
                className={`h-3 w-3 ${doneCount > idx ? "text-emerald-500" : "text-muted-foreground/30"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}


interface DocumentsTabProps {
  candidateId: number;
  candidateName: string;
  jobTitle?: string;
  candidateStatus: string | null;
}

export function DocumentsTab({
  candidateId,
  candidateName,
  jobTitle,
  candidateStatus,
}: DocumentsTabProps) {
  const { data: docs, isLoading, refetch } = useRolloutDocuments(candidateId);
  const [rolloutOpen, setRolloutOpen] = useState(false);

  const isSelected =
    candidateStatus === "OFFER" ||
    candidateStatus === "HIRED" ||
    candidateStatus === "SELECTED";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const list = docs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {list.length} document{list.length !== 1 ? "s" : ""} generated
        </p>
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          className="gap-2 h-8 text-xs"
          onClick={() => setRolloutOpen(true)}
        >
          <FileSignature className="h-3.5 w-3.5" />
          Generate Offer
        </Button>
      </div>

      {!isSelected && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Move this candidate to the <strong>Offer</strong> stage to trigger the automatic offer generation prompt.
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="h-24 w-24" />}
          title="No documents yet"
          description="Generate and send offer documents to this candidate."
          action={{ label: "Generate Offer", onClick: () => setRolloutOpen(true) }}
          compact
        />
      ) : (
        <div className="space-y-3">
          {list.map((doc) => {
            const cfg = getStatusConfig(doc.status);
            const StatusIcon = cfg.icon;
            return (
              <Card key={doc.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{doc.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {doc.createdAt
                          ? `Created ${format(new Date(doc.createdAt), "PPP")}`
                          : ""}
                      </p>
                      <EsignTimeline doc={doc} />
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[11px] shrink-0 flex items-center gap-1 px-2 py-0.5 ${cfg.className}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RolloutDocumentsDialog
        open={rolloutOpen}
        onOpenChange={(open) => {
          setRolloutOpen(open);
          if (!open) void refetch();
        }}
        candidateId={candidateId}
        candidateName={candidateName}
        jobTitle={jobTitle}
      />
    </div>
  );
}
