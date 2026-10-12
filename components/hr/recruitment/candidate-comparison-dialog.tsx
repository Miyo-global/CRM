"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import type { Candidate } from "@/types/hr";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLUMNS } from "@/features/hr/recruitment/kanban/types";

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

const STATUS_TONE = Object.fromEntries(COLUMNS.map((c) => [c.id, c.tone]));

function num(v: unknown): number | null {
  const n = Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? null : n;
}

interface Row {
  label: string;
  /** Numeric value per candidate; the highest is highlighted. */
  values?: (number | null)[];
  render: (c: Candidate, i: number) => React.ReactNode;
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium tabular-nums">{value}/10</span>
      <Progress value={value * 10} className="h-1" />
    </div>
  );
}

export function CandidateComparisonDialog({ candidates, onClose }: Props) {
  const breakdownKeys = Array.from(
    new Set(candidates.flatMap((c) => Object.keys(c.aiScoreBreakdown ?? {}))),
  );

  const rows: Row[] = [
    {
      label: "Status",
      render: (c) => (
        <StatusPill tone={STATUS_TONE[c.status ?? "NEW"] ?? "neutral"} dot>{c.status ?? "NEW"}</StatusPill>
      ),
    },
    {
      label: "AI Score",
      values: candidates.map((c) => num(c.aiScore)),
      render: (c) =>
        c.aiScore != null ? (
          <span className="font-display text-xl font-bold tabular-nums">
            {c.aiScore}
            <span className="text-xs font-normal text-muted-foreground">/100</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No AI score yet</span>
        ),
    },
    ...breakdownKeys.map<Row>((key) => ({
      label: BREAKDOWN_LABELS[key] ?? key,
      values: candidates.map((c) => num(c.aiScoreBreakdown?.[key])),
      render: (c) => {
        const v = num(c.aiScoreBreakdown?.[key]);
        return v != null ? <ScoreBar value={v} /> : null;
      },
    })),
    {
      label: "Experience",
      values: candidates.map((c) => num(c.experienceYears)),
      render: (c) => (c.experienceYears ? <span className="tabular-nums">{c.experienceYears} yrs exp</span> : null),
    },
    {
      label: "Rating",
      values: candidates.map((c) => num(c.rating)),
      render: (c) =>
        c.rating != null ? (
          <div className="flex items-center gap-0.5" role="img" aria-label={`Rating ${c.rating} of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                aria-hidden="true"
                className={cn("size-3.5", i < (c.rating ?? 0) ? "fill-current text-warning-500" : "text-border-strong")}
              />
            ))}
          </div>
        ) : null,
    },
    { label: "Company", render: (c) => c.currentCompany },
    { label: "Email", render: (c) => <span className="break-all">{c.email}</span> },
    { label: "Phone", render: (c) => (c.phone ? <span className="tabular-nums">{c.phone}</span> : null) },
    {
      label: "Links",
      render: (c) =>
        c.linkedinUrl || c.portfolioUrl ? (
          <span className="flex flex-wrap gap-2">
            {c.linkedinUrl && (
              <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="rounded-sm text-brand-text outline-none hover:underline focus-visible:focus-ring">
                LinkedIn
              </a>
            )}
            {c.portfolioUrl && (
              <a href={c.portfolioUrl} target="_blank" rel="noopener noreferrer" className="rounded-sm text-brand-text outline-none hover:underline focus-visible:focus-ring">
                Portfolio
              </a>
            )}
          </span>
        ) : null,
    },
    {
      label: "Skills",
      render: (c) =>
        c.skills && c.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {c.skills.slice(0, 8).map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
            ))}
          </div>
        ) : null,
    },
    { label: "Source", render: (c) => (c.source ? <Badge variant="secondary">{c.source}</Badge> : null) },
  ];

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent size="xl" className="gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 pt-5 pb-3">
          <DialogTitle>Compare Candidates</DialogTitle>
          <DialogDescription>
            Side-by-side comparison of {candidates.length} finalist{candidates.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 left-0 z-sidebar w-36 border-b border-border bg-surface-sunken px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="sr-only">Attribute</span>
                </th>
                {candidates.map((c) => (
                  <th key={c.id} scope="col" className="sticky top-0 z-sticky min-w-48 border-b border-border bg-surface-sunken px-4 py-3 text-left align-top font-normal">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                        {c.firstName?.[0] ?? ""}{c.lastName?.[0] ?? ""}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{c.firstName} {c.lastName}</span>
                        {c.currentRole && <span className="block truncate text-xs text-muted-foreground">{c.currentRole}</span>}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const nums = (row.values ?? []).filter((v): v is number => v != null);
                const best = nums.length > 1 ? Math.max(...nums) : null;
                return (
                  <tr key={row.label}>
                    <th scope="row" className="sticky left-0 z-base border-b border-border bg-card px-4 py-3 text-left align-top text-xs font-medium text-muted-foreground">
                      {row.label}
                    </th>
                    {candidates.map((c, i) => {
                      const isBest = best != null && row.values?.[i] === best;
                      const content = row.render(c, i);
                      return (
                        <td
                          key={c.id}
                          className={cn("border-b border-border px-4 py-3 align-top", isBest && "bg-brand-soft")}
                        >
                          {content ?? <span className="text-subtle-foreground">—</span>}
                          {isBest && <span className="sr-only"> (best)</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
