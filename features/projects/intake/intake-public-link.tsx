"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";

export function IntakePublicLink({ projectId, token, canManage }: { projectId: number; token: string | null; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [confirmOff, setConfirmOff] = useState(false);
  const toggle = useMutation<{ intakeToken: string | null }, Error, boolean>({
    mutationFn: (enabled) => apiClient.post(`/projects/${projectId}/intake/token`, { enabled }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      toast.success(res.intakeToken ? "Opened the public form" : "Closed the public form");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/intake/${token}` : null;

  if (!url) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm">
        <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 text-muted-foreground">The public request form is closed.</span>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => toggle.mutate(true)} loading={toggle.isPending}>
            Open public form
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-sunken/40 px-4 py-2 text-sm">
      <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-mono text-xs" title={url}>{url}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-10"
        aria-label="Copy form link"
        onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Copied the form link"))}
      >
        <Copy className="size-4" aria-hidden="true" />
      </Button>
      {canManage && (
        <>
          <Button variant="outline" size="sm" onClick={() => toggle.mutate(true)} loading={toggle.isPending}>New link</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmOff(true)}>Close form</Button>
          <ConfirmDialog
            open={confirmOff}
            onOpenChange={setConfirmOff}
            title="Close the public form?"
            description="The current link stops working. You can open the form again with a new link."
            confirmLabel="Close form"
            onConfirm={() => {
              setConfirmOff(false);
              toggle.mutate(false);
            }}
          />
        </>
      )}
    </div>
  );
}
