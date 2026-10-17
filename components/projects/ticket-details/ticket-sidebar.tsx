"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  User,
  Calendar,
  Circle,
  Timer,
  CheckCircle2,
  AlertCircle,
  Zap,
  Target,
  Flag,
  ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { LabelPicker } from "../label-picker";
import type { ProjectMember } from "./types";

interface TicketSidebarProps {
  ticket: {
    id: number;
    status?: string | null;
    priority?: string | null;
    type?: string | null;
    points?: number | null;
    dueDate?: string | null;
    sprintId?: number | null;
    epicId?: number | null;
    milestoneId?: number | null;
    timeSpent?: string | null;
    originalEstimate?: string | null;
    link?: string | null;
    labels?: Array<{
      label?: { id: number; name: string; color: string | null } | null;
    }>;
    assignees?: Array<{
      userId: string;
      user?: {
        firstName?: string | null;
        lastName?: string | null;
        image?: string | null;
      } | null;
    }>;
    assignee?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
    } | null;
    reporter?: {
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
      email?: string | null;
    } | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  };
  ticketId: number;
  projectId?: number;
  members: ProjectMember[];
  sprints: Array<{ id: number; name: string; status?: string | null }>;
  epics?: Array<{ id: number; title: string }>;
  /** Releases of this project, for the "ships in" row (MIYO-0114). */
  milestones?: Array<{ id: number; name: string }>;
  statuses?: Array<{ name: string; id: number }>;
  onAutoSave: (field: Record<string, unknown>) => void;
  readOnly?: boolean;
}

/** dt/dd pair styled like PropertyList (§6.3), sized for the 280px rail. */
function PropertyRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="flex min-h-8 items-center gap-1 truncate text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="flex min-h-8 min-w-0 flex-col justify-center text-sm text-foreground">{children}</dd>
    </>
  );
}

const fieldClass = "h-8 w-full border-transparent bg-transparent px-2 text-xs shadow-none hover:border-border hover:bg-background";

export function TicketSidebar({
  ticket,
  ticketId,
  projectId,
  members,
  sprints,
  epics = [],
  milestones = [],
  statuses,
  onAutoSave,
  readOnly = false,
}: TicketSidebarProps) {
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  // Points are edited locally and validated on blur (QA-0058).
  const [pointsDraft, setPointsDraft] = useState(
    ticket.points != null ? String(ticket.points) : "",
  );

  useEffect(() => {
    setPointsDraft(ticket.points != null ? String(ticket.points) : "");
  }, [ticket.points]);

  const [assigneeSearch, setAssigneeSearch] = useState("");

  const timeSpent = ticket.timeSpent ? parseFloat(ticket.timeSpent) : 0;
  const originalEstimate = ticket.originalEstimate
    ? parseFloat(ticket.originalEstimate)
    : 0;
  const timeProgress =
    originalEstimate > 0
      ? Math.min((timeSpent / originalEstimate) * 100, 100)
      : 0;

  const currentAssigneeIds = ticket.assignees
    ? ticket.assignees.map((a) => a.userId)
    : ticket.assignee
      ? [ticket.assignee.id]
      : [];

  const displayedAssignees =
    ticket.assignees && ticket.assignees.length > 0
      ? ticket.assignees
          .filter((a) => !!a.user)
          .map((a) => ({
            id: a.userId,
            firstName: a.user!.firstName,
            lastName: a.user!.lastName,
            image: a.user!.image,
          }))
      : ticket.assignee
        ? [ticket.assignee]
        : [];

  const filteredMembers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    const pool = members.filter((m) => !currentAssigneeIds.includes(m.id));
    if (!q) return pool;
    return pool.filter(
      (m) =>
        `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.name ?? ""} ${m.email ?? ""}`
          .toLowerCase()
          .includes(q)
    );
  }, [members, currentAssigneeIds, assigneeSearch]);

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1">
        <PropertyRow label="Status">
          <Select
            value={ticket.status || "TODO"}
            onValueChange={(v) => onAutoSave({ status: v })}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses?.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name.replace(/_/g, " ")}
                </SelectItem>
              )) || (
                <>
                  <SelectItem value="TODO">
                    <span className="flex items-center gap-1.5">
                      <Circle className="h-3 w-3" /> To Do
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    <span className="flex items-center gap-1.5">
                      <Timer className="h-3 w-3 text-info-strong" /> In Progress
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_REVIEW">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-plum-strong" /> In Review
                    </span>
                  </SelectItem>
                  <SelectItem value="DONE">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-success-strong" /> Done
                    </span>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Priority">
          <Select
            value={ticket.priority || "MEDIUM"}
            onValueChange={(v) => onAutoSave({ priority: v })}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Type">
          <Select
            value={ticket.type || "TASK"}
            onValueChange={(v) => onAutoSave({ type: v })}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TASK">Task</SelectItem>
              <SelectItem value="BUG">Bug</SelectItem>
              <SelectItem value="STORY">Story</SelectItem>
              <SelectItem value="EPIC">Epic</SelectItem>
              <SelectItem value="SUBTASK">Subtask</SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Points">
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={pointsDraft}
            onChange={(e) => setPointsDraft(e.target.value)}
            onBlur={() => {
              // A negative value used to be sent, rejected with the raw Zod
              // text, and the field cleared (QA-0058). Validate here, keep
              // what was typed, and say it plainly.
              const raw = pointsDraft.trim();
              if (raw === "") {
                if (ticket.points != null) onAutoSave({ points: undefined });
                return;
              }
              const val = Number(raw);
              if (!Number.isInteger(val) || val < 0 || val > 100) {
                toast.error("Points must be a whole number between 0 and 100.");
                setPointsDraft(ticket.points != null ? String(ticket.points) : "");
                return;
              }
              if (val !== ticket.points) onAutoSave({ points: val });
            }}
            className={`${fieldClass} tabular-nums`}
            placeholder="0"
            aria-label="Story points"
          />
        </PropertyRow>

        {/* Tickets had no due date in the UI even though the API stores one
            (QA-0056). */}
        <PropertyRow label="Due date" icon={<Calendar className="h-3 w-3 shrink-0" />}>
          <Input
            type="date"
            value={ticket.dueDate ? String(ticket.dueDate).slice(0, 10) : ""}
            onChange={(e) => onAutoSave({ dueDate: e.target.value || null })}
            className={fieldClass}
            aria-label="Due date"
          />
        </PropertyRow>

        <PropertyRow label="Sprint" icon={<Target className="h-3 w-3 shrink-0" />}>
          <Select
            value={ticket.sprintId?.toString() || "none"}
            onValueChange={(v) =>
              onAutoSave({ sprintId: v === "none" ? undefined : parseInt(v) })
            }
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {sprints?.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                  {s.status === "ACTIVE" ? " (Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Epic" icon={<Zap className="h-3 w-3 shrink-0" />}>
          <Select
            value={ticket.epicId?.toString() || "none"}
            onValueChange={(v) =>
              onAutoSave({ epicId: v === "none" ? undefined : parseInt(v) })
            }
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {epics.map((epic) => (
                <SelectItem key={epic.id} value={String(epic.id)}>
                  {epic.title || `Epic #${epic.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        {/* MIYO-0114: the release this ticket ships in. */}
        <PropertyRow label="Release" icon={<Flag className="h-3 w-3 shrink-0" />}>
          <Select
            value={ticket.milestoneId?.toString() || "none"}
            onValueChange={(v) =>
              onAutoSave({ milestoneId: v === "none" ? null : parseInt(v) })
            }
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {(milestones ?? []).map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Assignees">
        {displayedAssignees.length > 0 && (
          <div className="flex flex-wrap gap-1 py-1">
            {displayedAssignees.map(
              (person: {
                id: string;
                firstName?: string | null;
                lastName?: string | null;
                image?: string | null;
              }) => (
                <div
                  key={person.id}
                  className="flex items-center gap-1 bg-muted rounded-full pl-0.5 pr-1.5 py-0.5"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={resolveImageUrl(person.image)} />
                    <AvatarFallback className="text-3xs">
                      {person.firstName?.[0]}
                      {person.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-2xs">
                    {person.firstName}
                  </span>
                  {!readOnly && (
                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors leading-none"
                    onClick={() => {
                      const newIds = currentAssigneeIds.filter((id) => id !== person.id);
                      onAutoSave({ assigneeId: newIds[0] || "", assigneeIds: newIds });
                    }}
                    aria-label={`Remove ${person.firstName}`}
                  >
                    <span className="text-xs font-bold">&times;</span>
                  </button>
                  )}
                </div>
              )
            )}
          </div>
        )}
        {!readOnly && (
        <Popover
          open={assigneeOpen}
          onOpenChange={(o) => {
            setAssigneeOpen(o);
            if (!o) setAssigneeSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={assigneeOpen}
              className="h-8 w-full justify-between border-transparent bg-transparent px-2 text-xs font-normal shadow-none hover:border-border hover:bg-background"
            >
              <span className="truncate text-muted-foreground">+ Add assignee</span>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <Command shouldFilter={false}>
              <div className="border-b border-border">
                <CommandInput
                  placeholder="Search name or email…"
                  className="h-9 text-xs"
                  value={assigneeSearch}
                  onValueChange={setAssigneeSearch}
                />
              </div>
              <CommandList className="max-h-[200px] py-1">
                <CommandEmpty className="text-xs py-6 text-center text-muted-foreground">
                  No members found
                </CommandEmpty>
                <CommandGroup>
                  {filteredMembers.map((member) => (
                    <CommandItem
                      key={member.id}
                      value={member.id}
                      className="mx-1 rounded-md px-2 py-1.5 cursor-pointer aria-selected:bg-muted aria-selected:text-foreground"
                      onSelect={() => {
                        if (currentAssigneeIds.includes(member.id)) return;
                        const newIds = [...currentAssigneeIds, member.id];
                        onAutoSave({ assigneeId: newIds[0] || "", assigneeIds: newIds });
                        setAssigneeOpen(false);
                        setAssigneeSearch("");
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={resolveImageUrl(member.image)} />
                          <AvatarFallback className="text-3xs bg-brand-soft text-brand-text font-semibold">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium leading-tight truncate">
                            {member.firstName} {member.lastName}
                          </span>
                          <span className="text-2xs text-muted-foreground truncate leading-tight">
                            {member.email}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        )}
        </PropertyRow>

        {(timeSpent > 0 || originalEstimate > 0) && (
          <PropertyRow label="Time">
            <div className="flex items-center gap-1.5 text-xs tabular-nums">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{timeSpent}h logged</span>
              {originalEstimate > 0 && (
                <span className="text-muted-foreground">/ {originalEstimate}h est</span>
              )}
            </div>
            {originalEstimate > 0 && <Progress value={timeProgress} className="h-1 mt-1" />}
          </PropertyRow>
        )}

        {ticket.reporter && (
          <PropertyRow label="Reporter" icon={<User className="h-3 w-3 shrink-0" />}>
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="h-5 w-5">
                <AvatarImage src={resolveImageUrl(ticket.reporter.image)} />
                <AvatarFallback className="text-3xs bg-brand-soft text-brand-text">
                  {ticket.reporter.firstName?.[0]}{ticket.reporter.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs truncate">
                {ticket.reporter.firstName} {ticket.reporter.lastName}
              </span>
            </div>
          </PropertyRow>
        )}

        <PropertyRow label="Created" icon={<Calendar className="h-3 w-3 shrink-0" />}>
          <span className="text-xs tabular-nums">
            {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : ""}
          </span>
        </PropertyRow>
        <PropertyRow label="Updated" icon={<Clock className="h-3 w-3 shrink-0" />}>
          <span className="text-xs tabular-nums">
            {ticket.updatedAt ? format(new Date(ticket.updatedAt), "MMM d, yyyy") : ""}
          </span>
        </PropertyRow>
      </dl>

      <div>
        <LabelPicker
          ticketId={ticketId}
          projectId={projectId}
          currentLabels={
            (ticket.labels || []).filter((l) => !!l.label) as Array<{
              label: { id: number; name: string; color: string | null };
            }>
          }
          readOnly={readOnly}
        />
      </div>

    </div>
  );
}
