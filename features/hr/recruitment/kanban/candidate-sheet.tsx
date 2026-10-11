"use client";

import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Briefcase,
  MailIcon,
  Phone,
  Star,
  ExternalLink,
  Calendar,
  FileText,
  Download,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconChip } from "@/components/ui/icon-chip";
import type { AtsPipelineCandidate } from "@/types/hr";
import { getInitials, formatDate } from "./types";
import { getResumePreviewSrc, getResumeOpenSrc, isResumePdf } from "@/lib/files/resume-preview-url";
import { downloadFile } from "@/hooks/use-file-url";

interface CandidateSheetProps {
  candidate: AtsPipelineCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CandidateSheet = memo(function CandidateSheet({
  candidate,
  open,
  onOpenChange,
}: CandidateSheetProps) {
  if (!candidate) return null;

  const rawResumeUrl = candidate.resumeUrl ?? null;
  const previewSrc = rawResumeUrl ? getResumePreviewSrc(rawResumeUrl) : null;
  const openSrc = rawResumeUrl ? getResumeOpenSrc(rawResumeUrl) : null;
  const isPdf = rawResumeUrl ? isResumePdf(rawResumeUrl) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="xl" className="flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-brand-soft text-sm font-semibold text-brand-soft-foreground">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="leading-tight">{candidate.name}</SheetTitle>
              {candidate.jobTitle && (
                <p className="text-sm text-muted-foreground truncate">{candidate.jobTitle}</p>
              )}
              <Link
                href={`/hr/recruitment/candidates/${candidate.id}`}
                className="inline-flex items-center gap-1 text-xs text-brand-text hover:underline mt-0.5"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
                Full Profile
              </Link>
            </div>
          </div>
        </SheetHeader>

        {/* Split body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          {/* Left — Resume PDF viewer */}
          <div className="flex min-h-96 min-w-0 flex-1 flex-col border-b border-border bg-surface-sunken md:border-r md:border-b-0">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2">
              <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="size-3.5" aria-hidden="true" />
                Resume
              </p>
              {openSrc && (
                <div className="flex items-center gap-3">
                  <a
                    href={openSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-text hover:underline"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => rawResumeUrl && downloadFile(rawResumeUrl, "resume.pdf")}
                    className="flex items-center gap-1 text-xs text-brand-text hover:underline"
                  >
                    <Download className="size-3" aria-hidden="true" />
                    Download
                  </button>
                </div>
              )}
            </div>
            {previewSrc ? (
              <>
                <iframe
                  src={isPdf ? `${previewSrc}#toolbar=0&navpanes=0` : previewSrc}
                  title="Candidate Resume"
                  className="flex-1 w-full h-full border-0"
                />
                <div className="shrink-0 border-t border-border bg-background px-4 py-1.5 text-xs text-muted-foreground">
                  Preview not showing?{" "}
                  <a
                    href={openSrc ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-text underline"
                  >
                    Open in a new tab
                  </a>
                  .
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <IconChip icon={FileText} tone="neutral" size="lg" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No resume uploaded</p>
                  <p className="mt-0.5 text-xs text-subtle-foreground">
                    The candidate hasn&apos;t uploaded a resume yet.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right — Actions & info panel */}
          <div className="w-full shrink-0 space-y-4 p-4 md:w-[280px] md:overflow-y-auto">
            {/* Contact */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contact
              </p>
              <div className="flex items-center gap-2 text-sm">
                <MailIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{candidate.phone}</span>
                </div>
              )}
            </div>

            {/* Application */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Application
              </p>
              {candidate.jobTitle && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{candidate.jobTitle}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Applied {formatDate(candidate.appliedAt)}</span>
              </div>
              {candidate.source && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Source:</span>
                  <Badge variant="secondary" className="text-xs">
                    {candidate.source}
                  </Badge>
                </div>
              )}
            </div>

            {/* Rating */}
            {candidate.rating !== null && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Rating
                </p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-4",
                        i < (candidate.rating ?? 0)
                          ? "fill-current text-warning-500"
                          : "text-border-strong"
                      )}
                    />
                  ))}
                  <span className="ml-1 text-sm font-medium tabular-nums">{candidate.rating}/5</span>
                </div>
              </div>
            )}


            {/* Notes */}
            {candidate.notes && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <StickyNote className="size-3.5" aria-hidden="true" />
                  Notes
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {candidate.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});
