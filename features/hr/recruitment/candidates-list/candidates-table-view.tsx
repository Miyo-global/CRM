"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
import { Briefcase, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  JOB_STATUS_LABELS,
  SOURCE_BADGE_CLASSES,
  SOURCE_LABELS,
  STATUSES,
  jobStatusClass,
  statusBadgeVariant,
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
    <div className="rounded-lg border overflow-x-auto">
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
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => {
            const primary = candidate.applications[0];
            return (
              <TableRow
                key={candidate.id}
                className={selectedIds.has(candidate.id) ? "bg-primary/5" : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(candidate.id)}
                    onCheckedChange={(checked) => onToggleSelect(candidate.id, checked === true)}
                    aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/hr/recruitment/candidates/${candidate.id}`}
                    className="font-medium text-sm hover:text-primary hover:underline"
                  >
                    {candidate.firstName} {candidate.lastName}
                  </Link>
                  {candidate.currentRole && (
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {candidate.currentRole}
                      {candidate.currentCompany ? ` · ${candidate.currentCompany}` : ""}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(candidate.status)} className="text-[10px]">
                    {candidate.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {candidate.primaryJobTitle ? (
                    <div className="min-w-[140px]">
                      <div className="flex items-center gap-1 text-sm">
                        <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate max-w-[160px]">{candidate.primaryJobTitle}</span>
                      </div>
                      {primary?.jobStatus && (
                        <Badge
                          variant="outline"
                          className={`mt-1 text-[10px] ${jobStatusClass(primary.jobStatus)}`}
                        >
                          {JOB_STATUS_LABELS[primary.jobStatus]}
                        </Badge>
                      )}
                      {candidate.primaryAppliedAt && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(candidate.primaryAppliedAt), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No job linked</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {candidate.email}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {candidate.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {candidate.source ? (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${SOURCE_BADGE_CLASSES[candidate.source] ?? "text-muted-foreground"}`}
                    >
                      {SOURCE_LABELS[candidate.source] ?? candidate.source}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
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
                      <SelectTrigger className="h-7 w-[110px] text-xs">
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
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onEdit(candidate)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(candidate)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
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
    </div>
  );
}
