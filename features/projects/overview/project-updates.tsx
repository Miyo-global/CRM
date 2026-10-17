"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatIST } from "@/lib/date-utils";
import type { Tone } from "@/lib/design/tones";

type UpdateStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

interface ProjectUpdate {
  id: number;
  status: UpdateStatus;
  body: string;
  createdAt: string;
  author?: { firstName?: string | null; lastName?: string | null } | null;
}

const STATUS_LABEL: Record<UpdateStatus, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  OFF_TRACK: "Off track",
};

const STATUS_TONE: Record<UpdateStatus, Tone> = {
  ON_TRACK: "success",
  AT_RISK: "warning",
  OFF_TRACK: "danger",
};

/**
 * MIYO-0116: the project's own status posts. The computed health signal says
 * how the tickets are going; this says what the manager makes of it.
 */
export function ProjectUpdates({
  projectId,
  canPost,
}: {
  projectId: number;
  canPost: boolean;
}) {
  const queryClient = useQueryClient();
  const key = [...queryKeys.projects.detail(projectId), "updates"] as const;

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => apiClient.get<ProjectUpdate[]>(`/projects/${projectId}/updates`),
    enabled: !!projectId,
  });

  const [status, setStatus] = useState<UpdateStatus>("ON_TRACK");
  const [body, setBody] = useState("");

  const post = useMutation({
    mutationFn: () =>
      apiClient.post<ProjectUpdate>(`/projects/${projectId}/updates`, { status, body: body.trim() }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updates = data ?? [];
  const latest = updates[0];

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Status updates</h2>
        {latest && <StatusPill tone={STATUS_TONE[latest.status]} dot>{STATUS_LABEL[latest.status]}</StatusPill>}
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : updates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No updates posted yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {updates.map((update) => (
            <li key={update.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={STATUS_TONE[update.status]} dot>
                  {STATUS_LABEL[update.status]}
                </StatusPill>
                <span className="text-xs text-muted-foreground">
                  {[update.author?.firstName, update.author?.lastName].filter(Boolean).join(" ") ||
                    "Unknown"}
                </span>
                <span
                  className="text-2xs tabular-nums text-muted-foreground"
                  title={formatIST(update.createdAt)}
                >
                  {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{update.body}</p>
            </li>
          ))}
        </ul>
      )}

      {canPost && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as UpdateStatus)}>
              <SelectTrigger className="h-9 w-40" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as UpdateStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => post.mutate()}
              disabled={!body.trim() || post.isPending}
            >
              Post update
            </Button>
          </div>
          <Textarea
            value={body}
            maxLength={4000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What changed, what is blocked, what happens next"
            aria-label="Update"
            rows={3}
          />
        </div>
      )}
    </section>
  );
}
