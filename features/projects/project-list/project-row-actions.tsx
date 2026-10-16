"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInlineUpdateProject } from "@/lib/api/hooks/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ProjectListItem } from "@/types/projects";

export function ProjectRowActions({ project }: { project: Pick<ProjectListItem, "id" | "name" | "status"> }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const update = useInlineUpdateProject();
  const archived = project.status === "ARCHIVED";

  const run = () => {
    const status = archived ? "ACTIVE" : "ARCHIVED";
    update.mutate(
      { projectId: project.id, status },
      {
        onSuccess: () => toast.success(archived ? `Restored ${project.name}` : `Archived ${project.name}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
    setConfirmOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-10" aria-label={`Actions for ${project.name}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setConfirmOpen(true)}>
            {archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
            {archived ? "Restore" : "Archive"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={archived ? `Restore ${project.name}?` : `Archive ${project.name}?`}
        description={
          archived
            ? "The project becomes active again and shows in the default list."
            : "The project moves to the archived list. Nothing is deleted and you can restore it later."
        }
        confirmLabel={archived ? "Restore" : "Archive"}
        onConfirm={run}
      />
    </>
  );
}
