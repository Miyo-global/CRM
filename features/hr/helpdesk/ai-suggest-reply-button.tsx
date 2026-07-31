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
import { useAISuggestHelpdeskReply } from "@/lib/api/hooks/ai";
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

  const handleSuggest = () => {
    setErrorMsg(null);
    suggestMutation.mutate(ticketId, {
      onError: (e) => {
        const raw = getErrorMessage(e);
        const msg =
          raw.includes("not configured") || raw.includes("OPENAI") || raw.includes("503")
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

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setErrorMsg(null); suggestMutation.reset(); } }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={compact ? "h-7 px-2 text-xs gap-1" : "gap-1.5"}
          onClick={(e) => {
            e.stopPropagation();
            if (!result && !errorMsg) handleSuggest();
          }}
          disabled={suggestMutation.isPending}
        >
          {suggestMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 text-amber-500" />
          )}
          AI Reply
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="end" onClick={(e) => e.stopPropagation()}>
        {errorMsg ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">AI Reply unavailable</p>
              <p className="text-xs text-muted-foreground">{errorMsg}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSuggest} disabled={suggestMutation.isPending}>
                Try again
              </Button>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Suggested Reply</p>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={copyReply}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-2.5">
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{result.suggestedReply}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Tag className="h-2.5 w-2.5" />
                {result.category}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Clock className="h-2.5 w-2.5" />
                {result.estimatedResolutionTime}
              </Badge>
            </div>
            {result.followUpActions.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Follow-up Actions</p>
                <ul className="space-y-0.5">
                  {result.followUpActions.map((a, i) => (
                    <li key={i} className="text-[11px] flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">→</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
