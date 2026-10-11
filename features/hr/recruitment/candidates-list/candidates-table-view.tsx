"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AIScoreCandidateButton } from "@/features/hr/recruitment/ai-score-candidate-button";
import type { Candidate, CandidateListItem, CandidateStatus } from "@/types/hr";
import { Briefcase, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  JOB_STATUS_LABELS,
  SOURCE_BADGE_CLASSES,
  SOURCE_LABELS,
  JOB_STATUS_TONE,
  STATUSES,
  candidateStatusLabel,
  candidateStatusTone,
} from "./candidates-list-shared";

interface CandidatesTableViewProps {
  candidates: CandidateListItem[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, checked: boolean) => void;
  onStatusChange: (id: number, status: CandidateStatus) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
}

export function CandidatesTableView({
  candidates,
  selectedIds,
  onToggleSelect,
  onStatusChange,
  onEdit,
  onDelete,
}: CandidatesTableViewProps) {
  return (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied for</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="whitespace-nowrap">Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => {
            const primary = candidate.applications[0];
            return (
              <TableRow
                key={candidate.id}
                data-state={selectedIds.has(candidate.id) ? "selected" : undefined}
                className="group"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(candidate.id)}
                    onCheckedChange={(checked) => onToggleSelect(candidate.id, checked === true)}
                    aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex min-w-48 items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarFallback>
                        {candidate.firstName.charAt(0)}
                        {candidate.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link
                        href={`/hr/recruitment/candidates/${candidate.id}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-brand-text hover:underline"
                      >
                        {candidate.firstName} {candidate.lastName}
                      </Link>
                      {candidate.currentRole && (
                        <p
                          className="max-w-48 truncate text-xs text-muted-foreground"
                          title={`${candidate.currentRole}${candidate.currentCompany ? ` · ${candidate.currentCompany}` : ""}`}
                        >
                          {candidate.currentRole}
                          {candidate.currentCompany ? ` · ${candidate.currentCompany}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusPill tone={candidateStatusTone(candidate.status)} dot>
                    {candidateStatusLabel(candidate.status)}
                  </StatusPill>
                </TableCell>
                <TableCell>
                  {candidate.primaryJobTitle ? (
                    <div className="min-w-36">
                      <div className="flex items-center gap-1 text-sm">
                        <Briefcase className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="max-w-40 truncate" title={candidate.primaryJobTitle}>
                          {candidate.primaryJobTitle}
                        </span>
                      </div>
                      {primary?.jobStatus && (
                        <StatusPill
                          tone={JOB_STATUS_TONE[primary.jobStatus] ?? "neutral"}
                          className="mt-1"
                        >
                          {JOB_STATUS_LABELS[primary.jobStatus]}
                        </StatusPill>
                      )}
                      {candidate.primaryAppliedAt && (
                        <p className="mt-0.5 text-2xs text-muted-foreground tabular-nums">
                          {format(new Date(candidate.primaryAppliedAt), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No job linked</span>
                  )}
                </TableCell>
                <TableCell className="max-w-52 truncate text-sm text-muted-foreground" title={candidate.email}>
                  {candidate.email}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                  {candidate.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {candidate.source ? (
                    <Badge
                      variant="outline"
                      className={SOURCE_BADGE_CLASSES[candidate.source] ?? "text-muted-foreground"}
                    >
                      {SOURCE_LABELS[candidate.source] ?? candidate.source}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell
                  className="whitespace-nowrap text-xs text-muted-foreground tabular-nums"
                  title={
                    candidate.updatedAt || candidate.createdAt
                      ? format(new Date(candidate.updatedAt ?? candidate.createdAt!), "dd MMM yyyy, HH:mm")
                      : undefined
                  }
                >
                  {candidate.updatedAt || candidate.createdAt
                    ? formatDistanceToNow(new Date(candidate.updatedAt ?? candidate.createdAt!), {
                        addSuffix: true,
                      })
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5">
                    <AIScoreCandidateButton candidateId={candidate.id} compact />
                    <Select
                      value={candidate.status ?? "NEW"}
                      onValueChange={(v) => onStatusChange(candidate.id, v as CandidateStatus)}
                    >
                      <SelectTrigger size="sm" className="h-7 w-28 text-xs">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${candidate.firstName} ${candidate.lastName}`}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onEdit(candidate)}>
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(candidate)}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
    </Table>
  );
}
