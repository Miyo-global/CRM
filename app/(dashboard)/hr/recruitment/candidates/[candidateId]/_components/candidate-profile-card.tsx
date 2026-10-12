"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, ExternalLink, GraduationCap } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { PropertyList } from "@/components/shared/property-list";
import { COLUMNS } from "@/features/hr/recruitment/kanban/types";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";
import type { CandidateStatus } from "@/types/hr";
import { formatPhoneForDisplay } from "@/lib/phone";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const STATUSES: CandidateStatus[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

const LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
  FREELANCE: "Freelance",
  ONSITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  EMPLOYED: "Employed",
  UNEMPLOYED: "Unemployed",
  SERVING_NOTICE: "Serving notice",
  STUDENT: "Student",
  FREELANCING: "Freelancing",
  CITIZEN: "Citizen",
  PERMANENT_RESIDENT: "Permanent resident",
  WORK_VISA: "Work visa",
  REQUIRES_SPONSORSHIP: "Requires sponsorship",
  NOT_AUTHORIZED: "Not authorized",
};

function label(value?: string | null): string {
  if (!value) return "";
  return LABELS[value] ?? value;
}

export interface EducationEntry {
  qualification: string;
  institution?: string;
  year?: string;
}

const STATUS_TONE: Record<string, Tone> = Object.fromEntries(COLUMNS.map((c) => [c.id, c.tone]));

function formatCtc(amount?: string | number | null, currency?: string | null): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const num = Number(amount);
  if (!Number.isFinite(num)) return null;
  const formatted = num.toLocaleString(DEFAULT_LOCALE);
  return `${currency ? `${currency} ` : ""}${formatted}`;
}

interface CandidateProfileCardProps {
  status: CandidateStatus | null;
  rating?: number | null;
  email: string;
  phone?: string | null;
  alternatePhone?: string | null;
  source?: string | null;
  experienceYears?: number | string | null;
  relevantExperienceMonths?: number | null;
  location?: string | null;
  preferredLocation?: string | null;
  employmentType?: string | null;
  currentEmploymentStatus?: string | null;
  preferredWorkMode?: string | null;
  workAuthorization?: string | null;
  willingToRelocate?: boolean | null;
  noticePeriodDays?: number | null;
  availableFrom?: string | null;
  currentCtc?: string | number | null;
  expectedCtc?: string | number | null;
  salaryCurrency?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  education?: EducationEntry[] | null;
  skills?: string[] | null;
  onStatusChange: (status: CandidateStatus) => void;
  isUpdating: boolean;
}

function SkillBadge({ skill }: { skill: string }) {
  return (
    <Badge key={skill} variant="secondary" className="font-normal">
      {skill}
    </Badge>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`Rating ${rating} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn("size-3.5", i < rating ? "fill-current text-warning-500" : "text-border-strong")}
        />
      ))}
    </div>
  );
}

function StatusItem({ status }: { status: CandidateStatus }) {
  return <SelectItem value={status}>{status}</SelectItem>;
}

function joinParts(...parts: (string | null | undefined | false)[]): string | null {
  const out = parts.filter(Boolean).join(" · ");
  return out || null;
}

function ExternalLinkItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-brand-text outline-none hover:underline focus-visible:focus-ring"
    >
      <ExternalLink className="size-3" aria-hidden="true" />
      {children}
    </a>
  );
}

export const CandidateProfileCard = memo(function CandidateProfileCard({
  status,
  rating,
  email,
  phone,
  alternatePhone,
  source,
  experienceYears,
  relevantExperienceMonths,
  location,
  preferredLocation,
  employmentType,
  currentEmploymentStatus,
  preferredWorkMode,
  workAuthorization,
  willingToRelocate,
  noticePeriodDays,
  availableFrom,
  currentCtc,
  expectedCtc,
  salaryCurrency,
  linkedinUrl,
  githubUrl,
  portfolioUrl,
  education,
  skills,
  onStatusChange,
  isUpdating,
}: CandidateProfileCardProps) {
  const handleValueChange = useCallback(
    (v: string) => onStatusChange(v as CandidateStatus),
    [onStatusChange]
  );

  const currentCtcLabel = formatCtc(currentCtc, salaryCurrency);
  const expectedCtcLabel = formatCtc(expectedCtc, salaryCurrency);

  const experience =
    experienceYears != null
      ? `${experienceYears} years total${relevantExperienceMonths != null ? ` · ${relevantExperienceMonths} mo relevant` : ""}`
      : null;

  const properties = ([
    { label: "Email", value: <span className="break-all">{email}</span> },
    phone ? { label: "Phone", value: <span className="tabular-nums">{formatPhoneForDisplay(phone)}</span> } : null,
    alternatePhone
      ? { label: "Alt phone", value: <span className="tabular-nums">{formatPhoneForDisplay(alternatePhone)}</span> }
      : null,
    location ? { label: "Location", value: location } : null,
    preferredLocation ? { label: "Prefers", value: preferredLocation } : null,
    source ? { label: "Source", value: label(source) } : null,
    experience ? { label: "Experience", value: <span className="tabular-nums">{experience}</span> } : null,
    employmentType || currentEmploymentStatus
      ? { label: "Employment", value: joinParts(label(employmentType), label(currentEmploymentStatus)) }
      : null,
    preferredWorkMode || workAuthorization || willingToRelocate
      ? {
          label: "Work",
          value: joinParts(label(preferredWorkMode), label(workAuthorization), willingToRelocate && "Open to relocate"),
        }
      : null,
    noticePeriodDays != null ? { label: "Notice", value: <span className="tabular-nums">{`${noticePeriodDays}-day notice`}</span> } : null,
    availableFrom ? { label: "Available", value: <span className="tabular-nums">{availableFrom}</span> } : null,
    currentCtcLabel ? { label: "Current CTC", value: <span className="tabular-nums">{currentCtcLabel}</span> } : null,
    expectedCtcLabel ? { label: "Expected CTC", value: <span className="tabular-nums">{expectedCtcLabel}</span> } : null,
  ] as ({ label: string; value: React.ReactNode } | null)[]).filter(
    (p): p is { label: string; value: React.ReactNode } => p !== null,
  );

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          {status ? (
            <StatusPill tone={STATUS_TONE[status] ?? "neutral"} dot>{status}</StatusPill>
          ) : (
            <span />
          )}
          {rating != null && <StarRating rating={rating} />}
        </div>

        <PropertyList items={properties} />

        {education && education.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Education</h3>
            <ul className="space-y-1.5 text-sm">
              {education.map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0">
                    {e.qualification}
                    {e.institution ? `, ${e.institution}` : ""}
                    {e.year ? <span className="tabular-nums text-muted-foreground">{` (${e.year})`}</span> : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(linkedinUrl || githubUrl || portfolioUrl) && (
          <div className="flex flex-wrap gap-3 border-t border-border pt-3">
            {linkedinUrl && <ExternalLinkItem href={linkedinUrl}>LinkedIn</ExternalLinkItem>}
            {githubUrl && <ExternalLinkItem href={githubUrl}>GitHub</ExternalLinkItem>}
            {portfolioUrl && <ExternalLinkItem href={portfolioUrl}>Portfolio</ExternalLinkItem>}
          </div>
        )}

        {skills && skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
            {skills.map((skill) => (
              <SkillBadge key={skill} skill={skill} />
            ))}
          </div>
        )}

        <div className="border-t border-border pt-3">
          <label htmlFor="candidate-stage" className="mb-1.5 block text-xs font-medium">Move to stage</label>
          <Select
            value={status ?? "NEW"}
            onValueChange={handleValueChange}
            disabled={isUpdating}
          >
            <SelectTrigger id="candidate-stage" className="h-8 w-full text-sm" aria-busy={isUpdating || undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <StatusItem key={s} status={s} />
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
});
