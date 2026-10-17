"use client";

import { memo, useEffect, useState } from "react";
import { FileText, Download, Eye } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getPublicDocuments } from "@/server/actions/document-actions";
import { format } from "date-fns";
import { viewFile, downloadFile } from "@/hooks/use-file-url";

type PublicDoc = Awaited<ReturnType<typeof getPublicDocuments>>[number];

const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Contract",
  CERTIFICATE: "Certificate",
  ID_PROOF: "ID Proof",
  PAYSLIP: "Payslip",
  POLICY: "Policy",
  OFFER_LETTER: "Offer Letter",
  RESUME: "Resume",
  OTHER: "Other",
};

export const PublicDocumentsCard = memo(function PublicDocumentsCard({
  hideWhenEmpty = false,
  className,
}: {
  hideWhenEmpty?: boolean;
  className?: string;
} = {}) {
  const [documents, setDocuments] = useState<PublicDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(false);
    getPublicDocuments(6)
      .then((docs) => {
        if (active) setDocuments(docs);
      })
      .catch(() => {
        if (active) {
          setDocuments([]);
          setError(true);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (hideWhenEmpty && !isLoading && !error && documents.length === 0) {
    return null;
  }

  return (
    <WidgetCard
      title="Public documents"
      className={className}
      icon={FileText}
      count={documents.length || undefined}
      actions={<ViewAllLink href="/hr/documents" label="View All" ariaLabel="View all documents" />}
    >
      <div aria-live="polite">
        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex h-14 items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <WidgetError onRetry={() => setReloadKey((k) => k + 1)} />
        ) : documents.length === 0 ? (
          <EmptyState
            compact
            icon={FileText}
            title="No public documents shared yet"
            description="Shared documents will appear here."
          />
        ) : (
          <div className="-mx-2 grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                role="button"
                tabIndex={0}
                className="group flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-accent focus-visible:focus-ring"
                onClick={() => viewFile(doc.fileUrl)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    viewFile(doc.fileUrl);
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={doc.name}>
                    {doc.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StatusPill tone="neutral">{DOC_TYPE_LABELS[doc.type] || doc.type}</StatusPill>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {doc.createdAt ? format(new Date(doc.createdAt), "MMM dd, yyyy") : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => { e.stopPropagation(); viewFile(doc.fileUrl); }}
                    aria-label="View"
                  >
                    <Eye aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => { e.stopPropagation(); downloadFile(doc.fileUrl, doc.fileName || doc.name); }}
                    aria-label="Download"
                  >
                    <Download aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetCard>
  );
});
