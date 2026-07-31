"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}: {
  hideWhenEmpty?: boolean;
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
    <Card className="bg-card border-border shadow-noir">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between px-4 py-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-gold" aria-hidden="true" />
          Public Documents
        </CardTitle>
        <Link href="/hr/documents">
          <Button variant="ghost" size="sm" className="hover:bg-gold/10 hover:text-gold" aria-label="View all documents">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2" role="alert">
            <p className="text-sm text-muted-foreground">Failed to load documents</p>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            compact
            icon={FileText}
            title="No public documents shared yet"
            description="Shared documents will appear here."
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                onClick={() => viewFile(doc.fileUrl)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    viewFile(doc.fileUrl);
                  }
                }}
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {DOC_TYPE_LABELS[doc.type] || doc.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {doc.createdAt ? format(new Date(doc.createdAt), "MMM dd, yyyy") : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); viewFile(doc.fileUrl); }}
                    aria-label="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); downloadFile(doc.fileUrl, doc.fileName || doc.name); }}
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
