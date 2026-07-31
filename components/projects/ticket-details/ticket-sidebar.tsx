"use client";

import { useMemo, useState } from "react";
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
    sprintId?: number | null;
    epicId?: number | null;
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
  statuses?: Array<{ name: string; id: number }>;
  onAutoSave: (field: Record<string, unknown>) => void;
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-2 min-h-[36px]">
      <span className="text-xs text-muted-foreground font-medium truncate">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function TicketSidebar({
  ticket,
  ticketId,
  projectId,
  members,
  sprints,
  epics = [],
  statuses,
  onAutoSave,
}: TicketSidebarProps) {
  const [assigneeOpen, setAssigneeOpen] = useState(false);
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
    <div className="px-4 py-3 space-y-1 bg-muted/10">

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Status
          </span>
          <Select
            value={ticket.status || "TODO"}
            onValueChange={(v) => onAutoSave({ status: v })}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
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
                      <Timer className="h-3 w-3 text-blue-500" /> In Progress
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_REVIEW">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-purple-500" /> In Review
                    </span>
                  </SelectItem>
                  <SelectItem value="DONE">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" /> Done
                    </span>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Priority
          </span>
          <Select
            value={ticket.priority || "MEDIUM"}
            onValueChange={(v) => onAutoSave({ priority: v })}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Type
          </span>
          <Select
            value={ticket.type || "TASK"}
            onValueChange={(v) => onAutoSave({ type: v })}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
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
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Points
          </span>
          <Input
            type="number"
            min={0}
            value={ticket.points ?? ""}
            onChange={(e) => {
              const val = e.target.value === "" ? undefined : parseInt(e.target.value);
              onAutoSave({ points: val });
            }}
            className="h-8 text-xs bg-background w-full"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Target className="h-3 w-3 inline mr-0.5" />
            Sprint
          </span>
          <Select
            value={ticket.sprintId?.toString() || "none"}
            onValueChange={(v) =>
              onAutoSave({ sprintId: v === "none" ? undefined : parseInt(v) })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
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
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Zap className="h-3 w-3 inline mr-0.5" />
            Epic
          </span>
          <Select
            value={ticket.epicId?.toString() || "none"}
            onValueChange={(v) =>
              onAutoSave({ epicId: v === "none" ? undefined : parseInt(v) })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
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
        </div>
      </div>

      <div className="pt-1">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
          Assignees
        </span>
        {displayedAssignees.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
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
                    <AvatarFallback className="text-[7px]">
                      {person.firstName?.[0]}
                      {person.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px]">
                    {person.firstName}
                  </span>
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
                </div>
              )
            )}
          </div>
        )}
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
              className="h-8 text-xs bg-background w-full justify-between font-normal px-2 border-dashed hover:border-solid hover:bg-muted/30"
            >
              <span className="truncate text-muted-foreground">+ Add assignee</span>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg" align="start">
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
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium leading-tight truncate">
                            {member.firstName} {member.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate leading-tight">
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
      </div>

      <div className="pt-1">
        <LabelPicker
          ticketId={ticketId}
          projectId={projectId}
          currentLabels={
            (ticket.labels || []).filter((l) => !!l.label) as Array<{
              label: { id: number; name: string; color: string | null };
            }>
          }
        />
      </div>

      {(timeSpent > 0 || originalEstimate > 0) && (
        <div className="pt-1">
          <PropertyRow label="Time">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{timeSpent}h logged</span>
              {originalEstimate > 0 && (
                <span className="text-muted-foreground">/ {originalEstimate}h est</span>
              )}
            </div>
            {originalEstimate > 0 && <Progress value={timeProgress} className="h-1 mt-1" />}
          </PropertyRow>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : ""}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          {ticket.updatedAt ? format(new Date(ticket.updatedAt), "MMM d, yyyy") : ""}
        </div>
      </div>

      {ticket.reporter && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide shrink-0">
            <User className="h-3 w-3 inline mr-0.5" />Reporter
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="h-5 w-5">
              <AvatarImage src={resolveImageUrl(ticket.reporter.image)} />
              <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                {ticket.reporter.firstName?.[0]}{ticket.reporter.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs truncate">
              {ticket.reporter.firstName} {ticket.reporter.lastName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
