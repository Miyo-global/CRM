"use client";

import { memo, useCallback } from "react";
import Link from "next/link";
import { Mail, Phone, Building2, Star, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import type { Candidate, CandidateStatus } from "@/types/hr";
import { AIScoreCandidateButton } from "@/features/hr/recruitment/ai-score-candidate-button";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUSES: { value: CandidateStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "SCREENING", label: "Screening" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
];

const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  REFERRAL: "Referral",
  LINKEDIN: "LinkedIn",
  JOB_PORTAL: "Job Portal",
  CAMPUS: "Campus",
  CAREERS_PAGE: "Careers Page",
  NAUKRI: "Naukri",
};

const SOURCE_BADGE_CLASSES: Record<string, string> = {
  LINKEDIN: "border-blue-300 text-blue-700 dark:text-blue-400",
  NAUKRI: "border-orange-300 text-orange-700 dark:text-orange-400",
  REFERRAL: "border-green-300 text-green-700 dark:text-green-400",
  CAMPUS: "border-purple-300 text-purple-700 dark:text-purple-400",
  JOB_PORTAL: "border-cyan-300 text-cyan-700 dark:text-cyan-400",
  CAREERS_PAGE: "border-primary/40 text-primary",
  DIRECT: "text-muted-foreground",
};

function statusBadgeVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "HIRED": return "default";
    case "INTERVIEW": case "OFFER": return "secondary";
    case "REJECTED": return "destructive";
    default: return "outline";
  }
}

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onToggleSelect: (id: number, checked: boolean) => void;
  onStatusChange: (id: number, status: CandidateStatus) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
}

export const CandidateCard = memo(function CandidateCard({
  candidate,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onEdit,
  onDelete,
}: CandidateCardProps) {
  const handleCheckChange = useCallback(
    (checked: boolean | "indeterminate") => onToggleSelect(candidate.id, checked === true),
    [candidate.id, onToggleSelect]
  );

  const handleStatusChange = useCallback(
    (v: string) => onStatusChange(candidate.id, v as CandidateStatus),
    [candidate.id, onStatusChange]
  );

  const handleEdit = useCallback(() => onEdit(candidate), [candidate, onEdit]);
  const handleDelete = useCallback(() => onDelete(candidate), [candidate, onDelete]);

  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <Card
      className={cn(
        "hover:border-primary/30 transition-colors relative",
        isSelected && "ring-2 ring-primary/40 border-primary/40"
      )}
    >
      {/* Checkbox + Actions overlay */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1" onClick={stopPropagation}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckChange}
          aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
        />
      </div>

      <Link href={`/hr/recruitment/candidates/${candidate.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2 pr-14">
            <div>
              <h3 className="text-sm font-semibold">
                {candidate.firstName} {candidate.lastName}
              </h3>
              {candidate.currentRole && (
                <p className="text-sm text-muted-foreground">
                  {candidate.currentRole}
                  {candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}
                </p>
              )}
            </div>
            <Badge variant={statusBadgeVariant(candidate.status)}>{candidate.status}</Badge>
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              {candidate.email}
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                {candidate.phone}
              </div>
            )}
            {candidate.source && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <Badge
                  variant="outline"
                  className={SOURCE_BADGE_CLASSES[candidate.source] ?? "text-muted-foreground"}
                >
                  {SOURCE_LABELS[candidate.source] ?? candidate.source}
                </Badge>
              </div>
            )}
            {candidate.rating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < candidate.rating!
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {candidate.createdAt
                ? formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true })
                : ""}
            </span>
            <div className="flex items-center gap-1.5" onClick={stopPropagation}>
              <AIScoreCandidateButton candidateId={candidate.id} compact />
              <Select value={candidate.status ?? "NEW"} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
});
