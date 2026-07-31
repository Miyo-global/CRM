"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown, ArrowUp, ArrowDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Lead, TeamMember,
  STATUSES, PRIORITIES,
  STATUS_COLORS, PRIORITY_COLORS, SOURCE_COLORS,
  formatINR, timeAgo, formatDate, formatLeadId,
} from "./types";
import { AIScoreButton } from "../ai-score-button";

interface SortIconProps {
  column: string;
  sortColumn: string;
  sortDirection: "asc" | "desc";
}

export function SortIcon({ column, sortColumn, sortDirection }: SortIconProps) {
  if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
  return sortDirection === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 text-gold" />
    : <ArrowDown className="h-3 w-3 ml-1 text-gold" />;
}

export interface RenderCellOptions {
  lead: Lead;
  colKey: string;
  editingCell: { leadId: number; column: string } | null;
  setEditingCell: (cell: { leadId: number; column: string } | null) => void;
  teamMembers: TeamMember[];
  onStatusChange: (leadId: number, newStatus: string, leadName: string) => void;
  onPriorityChange: (leadId: number, newPriority: string) => void;
  onAssign: (leadId: number, userId: string) => void;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

export function useLeadCellRenderer({
  editingCell,
  setEditingCell,
  teamMembers,
  onStatusChange,
  onPriorityChange,
  onAssign,
}: Omit<RenderCellOptions, "lead" | "colKey">) {
  const router = useRouter();

  return function renderCell(lead: Lead, colKey: string): React.ReactNode {
    const isEditing = editingCell?.leadId === lead.id && editingCell?.column === colKey;

    switch (colKey) {
      case "leadId":
        return (
          <button
            onClick={() => copyToClipboard(formatLeadId(lead.id), "Lead ID")}
            className="font-mono text-[10px] text-muted-foreground hover:text-foreground tabular-nums whitespace-nowrap"
            title="Click to copy"
          >
            {formatLeadId(lead.id)}
          </button>
        );

      case "createdAt":
        return <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{formatDate(lead.createdAt)}</span>;

      case "name":
        return (
          <button
            className="font-medium text-[12px] hover:text-gold hover:underline text-left truncate max-w-[140px] block"
            onClick={() => router.push(`/crm/leads/${lead.id}`)}
          >
            {lead.name}
          </button>
        );

      case "email":
        return lead.email ? (
          <button
            onClick={() => copyToClipboard(lead.email!, "Email")}
            className="text-[11px] text-muted-foreground hover:text-foreground truncate max-w-[140px] block"
          >
            {lead.email}
          </button>
        ) : null;

      case "phone":
        return lead.phone ? (
          <button
            onClick={() => copyToClipboard(lead.phone!, "Phone")}
            className="text-[11px] text-muted-foreground hover:text-foreground font-mono whitespace-nowrap"
          >
            {lead.phone}
          </button>
        ) : null;

      case "whatsapp":
        return lead.whatsappNumber ? (
          <a
            href={`https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${lead.name}, this is from Miyo Global.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
          >
            <MessageCircle className="h-3 w-3" />
            <span className="font-mono">{lead.whatsappNumber}</span>
          </a>
        ) : null;

      case "company":
        return <span className="text-[11px] truncate max-w-[100px] block">{lead.company || ""}</span>;

      case "city":
        return <span className="text-[11px]">{lead.city || ""}</span>;

      case "source":
        return lead.source ? (
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 h-5 border-0 font-medium", SOURCE_COLORS[lead.source] || SOURCE_COLORS.other)}
          >
            {lead.source.replace("_", " ")}
          </Badge>
        ) : null;

      case "status":
        if (isEditing) {
          return (
            <Select
              defaultValue={lead.status}
              onValueChange={(v) => {
                onStatusChange(lead.id, v, lead.name);
                setEditingCell(null);
              }}
            >
              <SelectTrigger className="h-6 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 h-5 cursor-pointer border font-medium", STATUS_COLORS[lead.status])}
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "status" })}
          >
            {lead.status}
          </Badge>
        );

      case "priority":
        if (isEditing) {
          return (
            <Select
              defaultValue={lead.priority || "WARM"}
              onValueChange={(v) => {
                onPriorityChange(lead.id, v);
                setEditingCell(null);
              }}
            >
              <SelectTrigger className="h-6 text-[10px] w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="text-[11px]">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return lead.priority ? (
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 h-5 cursor-pointer border font-medium", PRIORITY_COLORS[lead.priority])}
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "priority" })}
          >
            {lead.priority}
          </Badge>
        ) : null;

      case "notes":
        return lead.notes ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-muted-foreground truncate max-w-[100px] block cursor-help">
                  {lead.notes}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs whitespace-pre-wrap">{lead.notes}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null;

      case "followUpDate": {
        if (!lead.followUpDate) return null;
        const fDate = new Date(lead.followUpDate);
        const isOverdue = fDate < new Date();
        return (
          <span className={cn(
            "text-[11px] tabular-nums whitespace-nowrap font-medium",
            isOverdue ? "text-red-400" : "text-emerald-400",
          )}>
            {formatDate(lead.followUpDate)}
          </span>
        );
      }

      case "investmentInterest":
        return <span className="text-[11px] font-mono tabular-nums text-gold">{formatINR(lead.investmentInterest)}</span>;

      case "potentialValue":
        return <span className="text-[11px] font-mono tabular-nums">{formatINR(lead.potentialValue)}</span>;

      case "assignedTo":
        if (isEditing) {
          return (
            <Select onValueChange={(v) => { onAssign(lead.id, v); setEditingCell(null); }}>
              <SelectTrigger className="h-6 text-[10px] w-[120px]">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-[11px]">
                    {m.name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return lead.assignedTo?.name ? (
          <div
            className="flex items-center gap-1 cursor-pointer"
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "assignedTo" })}
          >
            <Avatar className="h-4 w-4">
              <AvatarImage src={lead.assignedTo.image || ""} />
              <AvatarFallback className="text-[7px]">
                {lead.assignedTo.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] truncate max-w-[70px]">{lead.assignedTo.name}</span>
          </div>
        ) : (
          <span
            className="text-[11px] text-muted-foreground/50 cursor-pointer hover:text-foreground"
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "assignedTo" })}
          >
            —
          </span>
        );

      case "score":
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <AIScoreButton leadId={lead.id} currentScore={lead.score} compact />
          </div>
        );

      case "tags":
        return lead.tags?.length ? (
          <div className="flex gap-0.5 flex-wrap">
            {lead.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="text-[8px] px-1 py-0 h-4">{t}</Badge>
            ))}
            {lead.tags.length > 2 && (
              <span className="text-[8px] text-muted-foreground">+{lead.tags.length - 2}</span>
            )}
          </div>
        ) : null;

      case "sla": {
        if (!lead.slaDeadline) return null;
        const deadline = new Date(lead.slaDeadline);
        const overdue = deadline < new Date();
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1.5 py-0 h-5",
              overdue
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-green-500/10 text-green-400 border-green-500/20",
            )}
          >
            {overdue ? "Overdue" : timeAgo(lead.slaDeadline)}
          </Badge>
        );
      }

      default:
        return null;
    }
  };
}
