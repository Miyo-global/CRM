"use client";

import { useState } from "react";
import { FileText, ExternalLink, Download, Loader2 } from "lucide-react";

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
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Résumé</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <EmptyState
            compact
            icon={FileText}
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
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-1.5 min-w-0">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Résumé</span>
        </CardTitle>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <a href={openSrc} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={downloading}
            onClick={handleDownload}
          >
            {downloading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Download className="h-3 w-3 mr-1" />
            )}
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {pdf ? (
          iframeError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 px-4 py-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
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
              className="w-full h-[640px] rounded-md border bg-muted/30"
              onError={() => setIframeError(true)}
            />
          )
        ) : (
          <a
            href={openSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
          >
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground">
                Preview isn&apos;t available for Word files — click to open.
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
