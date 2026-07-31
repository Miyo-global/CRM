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
      <SheetContent className="flex flex-col p-0 gap-0 w-full sm:max-w-[900px]">
        {/* Header */}
        <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-tight">{candidate.name}</SheetTitle>
              {candidate.jobTitle && (
                <p className="text-sm text-muted-foreground truncate">{candidate.jobTitle}</p>
              )}
              <Link
                href={`/hr/recruitment/candidates/${candidate.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
              >
                <ExternalLink className="h-3 w-3" />
                Full Profile
              </Link>
            </div>
          </div>
        </SheetHeader>

        {/* Split body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left — Resume PDF viewer */}
          <div className="flex-1 border-r bg-muted/20 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Resume
              </p>
              {openSrc && (
                <div className="flex items-center gap-3">
                  <a
                    href={openSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => rawResumeUrl && downloadFile(rawResumeUrl, "resume.pdf")}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
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
                <div className="shrink-0 border-t bg-background px-4 py-1.5 text-[11px] text-muted-foreground">
                  Preview not showing?{" "}
                  <a
                    href={openSrc ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Open in a new tab
                  </a>
                  .
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No resume uploaded</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    The candidate hasn&apos;t uploaded a resume yet.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right — Actions & info panel */}
          <div className="w-[280px] shrink-0 overflow-y-auto p-4 space-y-4">
            {/* Contact */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Rating
                </p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < (candidate.rating ?? 0)
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                  <span className="text-sm font-medium ml-1">{candidate.rating}/5</span>
                </div>
              </div>
            )}


            {/* Notes */}
            {candidate.notes && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" />
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
