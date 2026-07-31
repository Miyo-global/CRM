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
import {
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Star,
  ExternalLink,
  MapPin,
  Wallet,
  Clock,
  GraduationCap,
  Globe,
} from "lucide-react";
import type { CandidateStatus } from "@/types/hr";
import { formatPhoneForDisplay } from "@/lib/phone";

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

function statusColor(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "HIRED") return "default";
  if (s === "REJECTED") return "destructive";
  if (s === "OFFER" || s === "INTERVIEW") return "secondary";
  return "outline";
}

function formatCtc(amount?: string | number | null, currency?: string | null): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const num = Number(amount);
  if (!Number.isFinite(num)) return null;
  const formatted = num.toLocaleString("en-IN");
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
    <Badge key={skill} variant="outline" className="text-[10px]">
      {skill}
    </Badge>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

function StatusItem({ status }: { status: CandidateStatus }) {
  return <SelectItem value={status}>{status}</SelectItem>;
}

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
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

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={statusColor(status)}>{status}</Badge>
          {rating != null && <StarRating rating={rating} />}
        </div>

        {/* Contact */}
        <div className="space-y-2 text-sm">
          <InfoRow icon={<Mail className="h-3.5 w-3.5" />}>{email}</InfoRow>
          {phone && (
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />}>
              {formatPhoneForDisplay(phone)}
            </InfoRow>
          )}
          {alternatePhone && (
            <InfoRow icon={<Phone className="h-3.5 w-3.5" />}>
              {formatPhoneForDisplay(alternatePhone)} (alt)
            </InfoRow>
          )}
          {(location || preferredLocation) && (
            <InfoRow icon={<MapPin className="h-3.5 w-3.5" />}>
              {location}
              {preferredLocation && location ? " · " : ""}
              {preferredLocation ? `Prefers ${preferredLocation}` : ""}
            </InfoRow>
          )}
        </div>

        {/* Professional */}
        {(source ||
          experienceYears != null ||
          relevantExperienceMonths != null ||
          employmentType ||
          currentEmploymentStatus) && (
          <div className="space-y-2 text-sm border-t pt-2">
            {source && (
              <InfoRow icon={<Briefcase className="h-3.5 w-3.5" />}>
                Source: {label(source)}
              </InfoRow>
            )}
            {experienceYears != null && (
              <InfoRow icon={<Calendar className="h-3.5 w-3.5" />}>
                {experienceYears} years total
                {relevantExperienceMonths != null
                  ? ` · ${relevantExperienceMonths} mo relevant`
                  : ""}
              </InfoRow>
            )}
            {(employmentType || currentEmploymentStatus) && (
              <InfoRow icon={<Briefcase className="h-3.5 w-3.5" />}>
                {[label(employmentType), label(currentEmploymentStatus)]
                  .filter(Boolean)
                  .join(" · ")}
              </InfoRow>
            )}
            {(preferredWorkMode || workAuthorization || willingToRelocate) && (
              <InfoRow icon={<Globe className="h-3.5 w-3.5" />}>
                {[
                  label(preferredWorkMode),
                  label(workAuthorization),
                  willingToRelocate ? "Open to relocate" : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </InfoRow>
            )}
          </div>
        )}

        {/* Availability + Compensation */}
        {(noticePeriodDays != null ||
          availableFrom ||
          currentCtcLabel ||
          expectedCtcLabel) && (
          <div className="space-y-2 text-sm border-t pt-2">
            {(noticePeriodDays != null || availableFrom) && (
              <InfoRow icon={<Clock className="h-3.5 w-3.5" />}>
                {noticePeriodDays != null ? `${noticePeriodDays}-day notice` : ""}
                {noticePeriodDays != null && availableFrom ? " · " : ""}
                {availableFrom ? `Available ${availableFrom}` : ""}
              </InfoRow>
            )}
            {(currentCtcLabel || expectedCtcLabel) && (
              <InfoRow icon={<Wallet className="h-3.5 w-3.5" />}>
                {currentCtcLabel ? `Current ${currentCtcLabel}` : ""}
                {currentCtcLabel && expectedCtcLabel ? " · " : ""}
                {expectedCtcLabel ? `Expected ${expectedCtcLabel}` : ""}
              </InfoRow>
            )}
          </div>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <div className="space-y-1.5 text-sm border-t pt-2">
            {education.map((e, i) => (
              <InfoRow key={i} icon={<GraduationCap className="h-3.5 w-3.5" />}>
                {e.qualification}
                {e.institution ? `, ${e.institution}` : ""}
                {e.year ? ` (${e.year})` : ""}
              </InfoRow>
            ))}
          </div>
        )}

        {/* Links */}
        {(linkedinUrl || githubUrl || portfolioUrl) && (
          <div className="flex flex-wrap gap-3 border-t pt-2">
            {linkedinUrl && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                LinkedIn
              </a>
            )}
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                GitHub
              </a>
            )}
            {portfolioUrl && (
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Portfolio
              </a>
            )}
          </div>
        )}

        {skills && skills.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t pt-2">
            {skills.map((skill) => (
              <SkillBadge key={skill} skill={skill} />
            ))}
          </div>
        )}

        <div className="pt-2 border-t">
          <label className="text-xs font-medium mb-1 block">Move to stage</label>
          <Select
            value={status ?? "NEW"}
            onValueChange={handleValueChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-8 text-xs">
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
