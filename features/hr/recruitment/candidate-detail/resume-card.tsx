"use client";

import { useState } from "react";
import { FileText, ExternalLink, Download } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadFile } from "@/hooks/use-file-url";
import {
  getResumeOpenSrc,
  getResumePreviewSrc,
  isResumePdf,
} from "@/lib/files/resume-preview-url";
import { getFileKeyFromUrl } from "@/lib/files/storage-url";

function resumeFileName(url: string): string {
  try {
    const path = new URL(url, "http://local").pathname;
    const segment = decodeURIComponent(path.split("/").pop() ?? "résumé");
    return segment.replace(/^\d+-[a-f0-9-]+-/i, "");
  } catch {
    const key = getFileKeyFromUrl(url);
    const segment = key.split("/").pop() ?? "résumé";
    return segment.replace(/^\d+-[a-f0-9-]+-/i, "");
  }
}

interface ResumeCardProps {
  resumeUrl?: string | null;
  candidateName: string;
}

export function ResumeCard({ resumeUrl, candidateName }: ResumeCardProps) {
  const [iframeError, setIframeError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!resumeUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            compact
            illustration={<EmptyDocumentsIllustration className="size-24" />}
            title="No résumé uploaded"
            description="This candidate hasn't uploaded a résumé yet."
            className="border-0 bg-transparent"
          />
        </CardContent>
      </Card>
    );
  }

  const name = resumeFileName(resumeUrl);
  const previewSrc = getResumePreviewSrc(resumeUrl);
  const openSrc = getResumeOpenSrc(resumeUrl);
  const pdf = isResumePdf(resumeUrl);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadFile(resumeUrl, name);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">Résumé</span>
        </CardTitle>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button asChild size="xs" variant="outline">
            <a href={openSrc} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              Open
            </a>
          </Button>
          <Button
            size="xs"
            variant="outline"
            loading={downloading}
            onClick={handleDownload}
          >
            <Download aria-hidden="true" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pdf ? (
          iframeError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-sunken/40 px-4 py-10 text-center">
              <IconChip icon={FileText} tone="neutral" />
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t preview this résumé inline.
              </p>
              <Button asChild size="sm" variant="outline">
                <a href={openSrc} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                </a>
              </Button>
            </div>
          ) : (
            <iframe
              src={`${previewSrc}#toolbar=0&navpanes=0`}
              title={`${candidateName} résumé`}
              className="h-160 w-full rounded-md border border-border bg-surface-sunken"
              onError={() => setIframeError(true)}
            />
          )
        ) : (
          <a
            href={openSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors hover:bg-accent focus-visible:focus-ring"
          >
            <IconChip icon={FileText} tone="info" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground">
                Preview isn&apos;t available for Word files — click to open.
              </p>
            </div>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
