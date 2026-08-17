"use client";

import { useState } from "react";
import { ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RolloutDocumentsDialog } from "./rollout-documents-dialog";
import { useRolloutDocuments } from "@/lib/api/hooks/hr/recruitment";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";


const STATUS_VARIANTS: Record<string, string> = {
  GENERATED: "bg-muted text-muted-foreground border-muted-foreground/30",
  SENT: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  SIGNED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  DECLINED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
};

function StatusBadge({ status }: { status: string }) {
  const className = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.GENERATED;
  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {status}
    </Badge>
  );
}


function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


interface CandidateDocumentsTabProps {
  candidateId: number;
  candidateName: string;
  jobTitle?: string;
}


export function CandidateDocumentsTab({
  candidateId,
  candidateName,
  jobTitle,
}: CandidateDocumentsTabProps) {
  const [rolloutOpen, setRolloutOpen] = useState(false);

  const { data: docs, isLoading, isError, refetch } = useRolloutDocuments(candidateId);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gold" aria-hidden="true" />
            <span className="text-sm font-medium">Generated Documents</span>
            {docs && docs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {docs.length}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              aria-label="Refresh documents list"
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </Button>
            <Button
              size="sm"
              className="bg-gold hover:bg-gold/90 text-white"
              onClick={() => setRolloutOpen(true)}
              aria-label="Generate offer documents for candidate"
            >
              Generate Offer
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="text-sm">Loading documents…</span>
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-8 text-center">
            <p className="text-sm text-destructive">Failed to load documents.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !docs || docs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden="true" />
            <p className="text-sm font-medium">No documents generated yet</p>
            <p className="text-xs mt-1">
              Click &quot;Generate Offer&quot; to create offer letters and other documents for this candidate.
            </p>
          </div>
        ) : (
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[560px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template / Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Signed</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium text-sm">
                        {doc.templateTitle ?? doc.title}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.sentAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.signedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          aria-label={`View document ${doc.templateTitle ?? doc.title}`}
                        >
                          <a
                            href={`/api/hr/recruitment/candidates/${candidateId}/documents/${doc.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}
      </div>

      <RolloutDocumentsDialog
        candidateId={candidateId}
        candidateName={candidateName}
        jobTitle={jobTitle}
        open={rolloutOpen}
        onOpenChange={(open) => {
          setRolloutOpen(open);
          if (!open) void refetch();
        }}
      />
    </>
  );
}
