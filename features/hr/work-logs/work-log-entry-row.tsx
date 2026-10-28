"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, isWeekend } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Link2, ExternalLink, Ticket, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ticketKey } from "@/lib/projects/ticket-key";

interface WorkLogEntryRowProps {
  date: Date;
  initialContent: string;
  initialWorkLink?: string;
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    project?: { id: number; name: string; key: string } | null;
  } | null;
  onSave: (content: string, workLink: string) => Promise<unknown> | void;
  isSaving: boolean; // kept for API compatibility but not used for per-row state
  searchTerm: string;
  readOnly?: boolean;
  status?: string;
}

export function WorkLogEntryRow({
  date,
  initialContent,
  initialWorkLink = "",
  ticket,
  onSave,
  searchTerm,
  readOnly = false,
}: WorkLogEntryRowProps) {
  const [content, setContent] = useState(initialContent);
  const [workLink, setWorkLink] = useState(initialWorkLink);
  const [prevInitial, setPrevInitial] = useState(initialContent);
  const [prevInitialLink, setPrevInitialLink] = useState(initialWorkLink);
  // "idle" | "dirty" | "saving" | "saved"
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved">("idle");

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeq = useRef(0);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // Sync when fresh server data arrives (query invalidation after save)
  if (initialContent !== prevInitial) {
    setPrevInitial(initialContent);
    setContent(initialContent);
  }
  if (initialWorkLink !== prevInitialLink) {
    setPrevInitialLink(initialWorkLink);
    setWorkLink(initialWorkLink);
  }

  // Cleanup on unmount
  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const doSave = useCallback((text: string, link: string) => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    const seq = ++saveSeq.current;
    setSaveState("saving");
    // Reflect the actual save result: "saved" on success, back to "dirty" on
    // failure (the page-level onError surfaces a toast). Ignore stale resolutions
    // that a newer save has already superseded.
    Promise.resolve(onSaveRef.current(text, link))
      .then(() => {
        if (saveSeq.current !== seq) return;
        setSaveState("saved");
        savedTimer.current = setTimeout(() => {
          if (saveSeq.current === seq) setSaveState("idle");
        }, 2000);
      })
      .catch(() => {
        if (saveSeq.current !== seq) return;
        setSaveState("dirty");
      });
  }, []);

  // QA P3-work-log-blur-autosave: typing or leaving the field no longer
  // saves. An edit stays a draft until Save (or Ctrl/Cmd+Enter); Cancel or
  // Escape puts the saved text back.
  const markDirty = (text: string, link: string) =>
    setSaveState(text !== initialContent || link !== initialWorkLink ? "dirty" : "idle");

  const handleSave = () => {
    if (readOnly || saveState === "saving") return;
    doSave(content, workLink);
  };

  const handleCancel = () => {
    setContent(initialContent);
    setWorkLink(initialWorkLink);
    setSaveState("idle");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (saveState !== "dirty") return;
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const val = e.target.value;
    setContent(val);
    markDirty(val, workLink);
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWorkLink(val);
    markDirty(content, val);
  };

  const isWeekendDay = isWeekend(date);
  const dateLabel = format(date, "EEEE, MMMM d");

  const highlightMatch = (text: string) => {
    if (!searchTerm.trim() || !text) return null;
    const term = searchTerm.trim();
    const splitRegex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const testRegex = new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const parts = text.split(splitRegex);
    if (parts.length === 1) return null;
    return parts.map((part, i) =>
      testRegex.test(part) ? (
        <mark key={i} className="bg-warning-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const highlighted = highlightMatch(content);

  return (
    <div
      aria-label={`Work log for ${dateLabel}`}
      className={cn(
        "flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border shadow-sm hover:shadow-md transition-all",
        isWeekendDay ? "bg-brand-soft/40" : "bg-card",
        saveState === "dirty"
          ? "border-l-4 border-l-warning-500"
          : content
            ? "border-l-4 border-l-success-500"
            : "border-l-4 border-l-border",
      )}
    >
      {/* Date column */}
      <div className="sm:w-32 md:w-36 flex-shrink-0 flex sm:flex-col items-center sm:items-start gap-1.5">
        <span className="font-bold text-lg sm:text-xl text-foreground leading-none">{format(date, "dd")}</span>
        <span className="text-muted-foreground text-xs font-medium">{format(date, "MMM, EEEE")}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isWeekendDay && (
            <span className="text-2xs bg-brand-soft px-1.5 py-0.5 rounded font-medium text-brand-text">
              Weekend
            </span>
          )}
          {/* Auto-save status badge — only for own rows */}
          {!readOnly && saveState === "dirty" && (
            <span className="text-2xs bg-warning-soft px-1.5 py-0.5 rounded font-medium text-warning-strong">
              Unsaved…
            </span>
          )}
          {!readOnly && saveState === "saving" && (
            <span className="inline-flex items-center gap-0.5 text-2xs bg-info-soft px-1.5 py-0.5 rounded font-medium text-info-strong">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Saving
            </span>
          )}
          {!readOnly && saveState === "saved" && (
            <span className="inline-flex items-center gap-0.5 text-2xs bg-success-soft px-1.5 py-0.5 rounded font-medium text-success-strong">
              <Check className="h-2.5 w-2.5" />
              Saved
            </span>
          )}
          {!readOnly && saveState === "idle" && content && (
            <span className="text-2xs bg-success-soft px-1.5 py-0.5 rounded font-medium text-success-strong">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0 space-y-2">
        {ticket && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 border-info-strong/25 text-info-strong bg-info-soft">
              <Ticket className="h-3 w-3" />
              {ticketKey(ticket.project?.key, ticket.ticketNumber)}
            </Badge>
            <span className="text-sm font-medium text-foreground truncate">{ticket.title}</span>
            {ticket.project && (
              <span className="text-xs text-muted-foreground">— {ticket.project.name}</span>
            )}
          </div>
        )}

        <Textarea
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={
            isWeekendDay
              ? "Weekend…"
              : "No entry"
          }
          aria-label={`Work log entry for ${dateLabel}`}
          className={cn(
            "resize-none focus-visible:ring-1 focus-visible:ring-offset-0 text-sm",
            isWeekendDay && !content ? "min-h-[36px] opacity-50" : "min-h-[60px]",
            readOnly && "cursor-default opacity-75",
          )}
        />

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Link (optional) — paste URL to doc, PR, sheet, or file"
              className="h-7 text-xs"
              type="url"
              value={workLink}
              onChange={handleLinkChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}

        {!readOnly && (saveState === "dirty" || saveState === "saving") && (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={saveState === "saving"}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} loading={saveState === "saving"}>
              Save
            </Button>
          </div>
        )}

        {readOnly && initialWorkLink && (
          <a
            href={initialWorkLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-info-strong hover:text-info-strong"
          >
            <ExternalLink className="h-3 w-3" />
            {initialWorkLink}
          </a>
        )}

        {highlighted && saveState === "idle" && (
          <p className="text-xs text-muted-foreground px-1 truncate">
            {highlighted}
          </p>
        )}
      </div>
    </div>
  );
}
