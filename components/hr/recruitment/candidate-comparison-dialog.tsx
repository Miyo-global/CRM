"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Candidate } from "@/types/hr";
import { Star, Briefcase, Mail, Phone, Globe, Building2 } from "lucide-react";

interface Props {
  candidates: Candidate[];
  onClose: () => void;
}

const BREAKDOWN_LABELS: Record<string, string> = {
  technicalSkills: "Technical Skills",
  experience: "Experience",
  communication: "Communication",
  cultureFit: "Culture Fit",
  leadership: "Leadership",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}/10</span>
      </div>
      <Progress value={value * 10} className="h-1.5" />
    </div>
  );
}

function CandidateColumn({ candidate }: { candidate: Candidate }) {
  const name = `${candidate.firstName} ${candidate.lastName}`;
  const breakdown = candidate.aiScoreBreakdown;

  return (
    <div className="flex-1 min-w-0 space-y-4 px-3">
      <div className="text-center space-y-1">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto text-sm font-semibold">
          {candidate.firstName?.[0] ?? ""}{candidate.lastName?.[0] ?? ""}
        </div>
        <p className="text-sm font-semibold truncate">{name}</p>
        {candidate.currentRole && (
          <p className="text-xs text-muted-foreground truncate">{candidate.currentRole}</p>
        )}
        <Badge
          variant={
            candidate.status === "HIRED" ? "default" :
            candidate.status === "REJECTED" ? "destructive" : "secondary"
          }
          className="text-[10px]"
        >
          {candidate.status ?? "NEW"}
        </Badge>
      </div>

      <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">AI Score</span>
          <span className="text-lg font-bold tabular-nums">
            {candidate.aiScore != null ? candidate.aiScore : ""}
            {candidate.aiScore != null && <span className="text-xs text-muted-foreground font-normal">/100</span>}
          </span>
        </div>
        {breakdown && Object.keys(breakdown).length > 0 ? (
          <div className="space-y-1.5">
            {Object.entries(breakdown).map(([key, val]) => (
              <ScoreBar
                key={key}
                label={BREAKDOWN_LABELS[key] ?? key}
                value={Number.isFinite(Number(val)) ? Number(val) : 0}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-1">No AI score yet</p>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {candidate.currentCompany && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{candidate.currentCompany}</span>
          </div>
        )}
        {candidate.experienceYears && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Briefcase className="h-3 w-3 shrink-0" />
            <span>{candidate.experienceYears} yrs exp</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{candidate.email}</span>
        </div>
        {candidate.phone && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{candidate.phone}</span>
          </div>
        )}
        {(candidate.linkedinUrl || candidate.portfolioUrl) && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            {candidate.linkedinUrl && (
              <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                LinkedIn
              </a>
            )}
            {candidate.linkedinUrl && candidate.portfolioUrl && <span>·</span>}
            {candidate.portfolioUrl && (
              <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                Portfolio
              </a>
            )}
          </div>
        )}
      </div>

      {candidate.rating != null && (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i < (candidate.rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
            />
          ))}
        </div>
      )}

      {candidate.skills && candidate.skills.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Skills</p>
          <div className="flex flex-wrap gap-1">
            {candidate.skills.slice(0, 8).map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {candidate.source && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">Source</p>
          <Badge variant="secondary" className="text-[10px]">{candidate.source}</Badge>
        </div>
      )}
    </div>
  );
}

export function CandidateComparisonDialog({ candidates, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl w-full p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">Compare Candidates</DialogTitle>
          <DialogDescription className="text-xs">
            Side-by-side comparison of {candidates.length} finalist{candidates.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="flex divide-x px-4 py-4">
            {candidates.map((c) => (
              <CandidateColumn key={c.id} candidate={c} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
