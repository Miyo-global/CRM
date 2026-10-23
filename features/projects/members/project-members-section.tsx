"use client";

import { useMemo, useState } from "react";
import { UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRemoveProjectMember, useUpdateProjectMemberRole } from "@/lib/api/hooks/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import type { ProjectMember, ProjectRoleValue, ProjectWithDetails } from "@/types/projects";
import { AddMemberForm } from "./add-member-form";

export const ROLE_OPTIONS: { value: ProjectRoleValue; label: string; hint: string }[] = [
  { value: "OWNER", label: "Owner", hint: "Full control, including owners" },
  { value: "MANAGER", label: "Manager", hint: "Settings, members and all work" },
  { value: "CONTRIBUTOR", label: "Contributor", hint: "Create and edit work" },
  { value: "VIEWER", label: "Viewer", hint: "Read only" },
];

function roleOf(raw: string | null): ProjectRoleValue {
  const upper = (raw ?? "").toUpperCase();
  if (upper === "ADMIN") return "MANAGER";
  return ROLE_OPTIONS.some((o) => o.value === upper) ? (upper as ProjectRoleValue) : "CONTRIBUTOR";
}

export function ProjectMembersSection({ project }: { project: ProjectWithDetails }) {
  const canManage = project.viewerRole === "OWNER" || project.viewerRole === "MANAGER";
  const isOwner = project.viewerRole === "OWNER";
  const [removing, setRemoving] = useState<{ userId: string; name: string } | null>(null);
  const updateRole = useUpdateProjectMemberRole(project.id);
  const remove = useRemoveProjectMember();

  const manager = (project as ProjectWithDetails & { manager?: ProjectMember["user"] | null }).manager;
  const members = useMemo(() => {
    const toRow = (userId: string, user: ProjectMember["user"], role: ProjectRoleValue, isManager = false) => ({
      userId,
      role,
      isManager,
      name: user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Unnamed",
      email: user?.email ?? "",
      image: user?.image ?? null,
    });
    const rows = (project.members ?? [])
      .filter((m) => !!m.user)
      .map((m) => toRow(m.userId, m.user, roleOf(m.role)))
      .sort((a, b) => a.name.localeCompare(b.name));
    // The manager is set on the project, not as a member row; list them first (R2-PRJ-05).
    if (manager && !rows.some((r) => r.userId === manager.id)) rows.unshift(toRow(manager.id, manager, "MANAGER", true));
    return rows;
  }, [project.members, manager]);

  const confirmRemove = () => {
    if (!removing) return;
    remove.mutate(
      { projectId: project.id, userId: removing.userId },
      {
        onSuccess: () => toast.success(`Removed ${removing.name} from the project`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
    setRemoving(null);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Users className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-lg font-semibold leading-tight">Members</h2>
        <span className="text-sm tabular-nums text-muted-foreground">{members.length}</span>
      </div>

      {canManage && (
        <div className="border-b border-border px-5 py-4">
          <AddMemberForm projectId={project.id} existingIds={members.map((m) => m.userId)} allowOwner={isOwner} />
        </div>
      )}

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
          <UserPlus className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">No members yet</p>
          <p className="text-sm text-muted-foreground">
            {canManage ? "Add people from your organization above." : "The project manager has not added anyone yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar className="size-8">
                <AvatarImage src={resolveImageUrl(m.image)} alt="" />
                <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              {m.isManager ? (
                <span className="text-sm text-muted-foreground">Project manager</span>
              ) : canManage ? (
                <>
                  <Select
                    value={m.role}
                    onValueChange={(role) =>
                      updateRole.mutate(
                        { userId: m.userId, role: role as ProjectRoleValue },
                        {
                          onSuccess: () => toast.success(`Changed ${m.name}'s role`),
                          onError: (error) => toast.error(getErrorMessage(error)),
                        },
                      )
                    }
                  >
                    <SelectTrigger className="h-10 w-36" aria-label={`Role for ${m.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.filter((o) => isOwner || o.value !== "OWNER" || m.role === "OWNER").map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => setRemoving({ userId: m.userId, name: m.name })}
                  >
                    <UserMinus className="size-4" aria-hidden="true" />
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{ROLE_OPTIONS.find((o) => o.value === m.role)?.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? "this member"}?`}
        description="They lose access to the project, and their open tickets become unassigned."
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
      />
    </Card>
  );
}
