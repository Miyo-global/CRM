"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Clock, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAISuggestHelpdeskReply, useOrgFeatureFlags } from "@/lib/api/hooks/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AISuggestReplyButtonProps {
  ticketId: number;
  compact?: boolean;
}

export function AISuggestReplyButton({ ticketId, compact }: AISuggestReplyButtonProps) {
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const suggestMutation = useAISuggestHelpdeskReply();
  const result = suggestMutation.data;
  // Hidden when no AI provider is set up: the route would answer 403 (R3-HR-09).
  const { data: flags } = useOrgFeatureFlags();

  const handleSuggest = () => {
    setErrorMsg(null);
    suggestMutation.mutate(ticketId, {
      onError: (e) => {
        const raw = getErrorMessage(e);
        const msg =
          raw.includes("not enabled") || raw.includes("not configured")
            ? "AI Reply is not available for your organization"
            : "Unable to generate a reply. Please try again.";
        setErrorMsg(msg);
        toast.error(msg);
      },
    });
  };

  const copyReply = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.suggestedReply);
    toast.success("Reply copied to clipboard");
  };

  if (!flags?.aiConfigured) return null;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setErrorMsg(null); suggestMutation.reset(); } }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "xs" : "sm"}
          onClick={(e) => {
            e.stopPropagation();
            if (!result && !errorMsg) handleSuggest();
          }}
          disabled={suggestMutation.isPending}
        >
          {suggestMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-3.5 text-brand-text" aria-hidden="true" />
          )}
          AI Reply
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-3" align="end" onClick={(e) => e.stopPropagation()}>
        {errorMsg ? (
          <div className="flex items-start gap-2.5 text-sm text-danger-strong">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="space-y-2">
              <p className="font-medium">AI Reply unavailable</p>
              <p className="text-xs text-muted-foreground">{errorMsg}</p>
              <Button size="xs" variant="outline" onClick={handleSuggest} disabled={suggestMutation.isPending} loading={suggestMutation.isPending}>
                Try again
              </Button>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Sparkles className="size-3.5 text-brand-text" aria-hidden="true" />Suggested Reply</p>
              <Button size="xs" variant="ghost" onClick={copyReply}>
                <Copy aria-hidden="true" />
                Copy
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-surface-sunken/60 p-3">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{result.suggestedReply}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                <Tag aria-hidden="true" />
                {result.category}
              </Badge>
              <Badge variant="outline" className="tabular-nums">
                <Clock aria-hidden="true" />
                {result.estimatedResolutionTime}
              </Badge>
            </div>
            {result.followUpActions.length > 0 && (
              <div>
                <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Follow-up Actions</p>
                <ul className="space-y-0.5">
                  {result.followUpActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                      <span className="text-brand-text" aria-hidden="true">→</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
