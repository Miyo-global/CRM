"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, isWeekend } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Link2, ExternalLink, Ticket, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

const AUTOSAVE_DELAY_MS = 1500;

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

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const doSave = useCallback((text: string, link: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
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

  const scheduleAutoSave = useCallback((text: string, link: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSaveState("dirty");
    debounceTimer.current = setTimeout(() => doSave(text, link), AUTOSAVE_DELAY_MS);
  }, [doSave]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const val = e.target.value;
    setContent(val);
    scheduleAutoSave(val, workLink);
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWorkLink(val);
    scheduleAutoSave(content, val);
  };

  const handleBlur = () => {
    if (readOnly) return;
    const hasChanges = content !== initialContent || workLink !== initialWorkLink;
    if (hasChanges && saveState !== "saving") {
      doSave(content, workLink);
    }
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
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
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
        isWeekendDay ? "bg-gold/[0.03] dark:bg-gold/[0.05]" : "bg-card",
        saveState === "dirty"
          ? "border-l-4 border-l-amber-500"
          : content
            ? "border-l-4 border-l-green-500"
            : "border-l-4 border-l-slate-200 dark:border-l-slate-700",
      )}
    >
      {/* Date column */}
      <div className="sm:w-32 md:w-36 flex-shrink-0 flex sm:flex-col items-center sm:items-start gap-1.5">
        <span className="font-bold text-lg sm:text-xl text-foreground leading-none">{format(date, "dd")}</span>
        <span className="text-muted-foreground text-xs font-medium">{format(date, "MMM, EEEE")}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isWeekendDay && (
            <span className="text-[10px] bg-gold/10 dark:bg-gold/20 px-1.5 py-0.5 rounded font-medium text-gold">
              Weekend
            </span>
          )}
          {/* Auto-save status badge — only for own rows */}
          {!readOnly && saveState === "dirty" && (
            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-medium text-amber-700 dark:text-amber-400">
              Unsaved…
            </span>
          )}
          {!readOnly && saveState === "saving" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded font-medium text-blue-700 dark:text-blue-400">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Saving
            </span>
          )}
          {!readOnly && saveState === "saved" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-medium text-green-700 dark:text-green-400">
              <Check className="h-2.5 w-2.5" />
              Saved
            </span>
          )}
          {!readOnly && saveState === "idle" && content && (
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-medium text-green-700 dark:text-green-400">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0 space-y-2">
        {ticket && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
              <Ticket className="h-3 w-3" />
              #{ticket.ticketNumber}
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
          onBlur={handleBlur}
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
              onBlur={handleBlur}
            />
          </div>
        )}

        {readOnly && initialWorkLink && (
          <a
            href={initialWorkLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
