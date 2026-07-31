"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";


export interface PublishedStatusBannerProps {
  isPublished: boolean;
  publicUrl: string | null;
  isPending: boolean;
  onToggle: (checked: boolean) => void;
}

export function PublishedStatusBanner({
  isPublished,
  publicUrl,
  isPending,
  onToggle,
}: PublishedStatusBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-4 py-2.5 mb-4 bg-card">
      <div className="flex items-center gap-2 flex-1">
        {isPublished ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Published
            </span>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground ml-2 underline-offset-2 hover:underline"
              >
                {publicUrl}
              </a>
            )}
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Draft — not visible publicly</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {isPublished ? "Unpublish" : "Publish"}
        </span>
        <Switch checked={isPublished} onCheckedChange={onToggle} disabled={isPending} />
      </div>
    </div>
  );
}
