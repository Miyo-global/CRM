"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useAddKbSpaceMember,
  useKbSpaceMembers,
  useRemoveKbSpaceMember,
  useUpdateKbSpaceMember,
} from "@/lib/api/hooks/knowledge";
import { useOrgMembers } from "@/lib/api/hooks/organization";

const SPACE_ROLES = [
  { value: "viewer", label: "Can view" },
  { value: "contributor", label: "Can edit" },
  { value: "publisher", label: "Can publish" },
  { value: "admin", label: "Can manage" },
];

/**
 * KB-0084: who is on a space.
 *
 * The last admin cannot be removed or demoted — the server answers 409 — so a
 * space can never end up with nobody able to manage it.
 */
export function SpaceMembersSheet({
  spaceId,
  open,
  onOpenChange,
}: {
  spaceId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [userId, setUserId] = useState("");
  const [spaceRole, setSpaceRole] = useState("contributor");

  const members = useKbSpaceMembers(open ? spaceId : undefined);
  const orgMembers = useOrgMembers(1, 100, undefined, { enabled: open });
  const addMember = useAddKbSpaceMember(spaceId);
  const updateMember = useUpdateKbSpaceMember(spaceId);
  const removeMember = useRemoveKbSpaceMember(spaceId);

  const seated = new Set((members.data?.items ?? []).map((m) => m.userId));
  const candidates = (orgMembers.data?.data ?? [])
    .filter((member) => !seated.has(member.userId))
    .map((member) => ({
      value: member.userId,
      label: member.name ?? member.email,
      keywords: member.email,
    }));

  function add() {
    if (!userId) return;
    addMember.mutate(
      { userId, spaceRole },
      {
        onSuccess: () => {
          setUserId("");
          toast.success("Added to the space");
        },
        onError: () => toast.error("Couldn't add them."),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Space members</SheetTitle>
          <SheetDescription>
            A seat here widens what someone can do inside this space.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Add someone</Label>
            <SearchableSelect
              value={userId}
              onValueChange={setUserId}
              options={candidates}
              placeholder="Pick a person"
            />
            <div className="flex gap-2">
              <Select value={spaceRole} onValueChange={setSpaceRole}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={add} disabled={!userId || addMember.isPending}>
                Add
              </Button>
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-border">
            {(members.data?.items ?? []).map((member) => (
              <li key={member.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {member.name ?? member.role ?? member.userId}
                  {member.email ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {member.email}
                    </span>
                  ) : null}
                </span>
                <Select
                  value={member.spaceRole}
                  onValueChange={(value) =>
                    updateMember.mutate(
                      { memberId: member.id, spaceRole: value },
                      {
                        onError: () =>
                          toast.error(
                            "Couldn't change that. A space needs at least one manager.",
                          ),
                      },
                    )
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPACE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remove from space"
                  onClick={() =>
                    removeMember.mutate(member.id, {
                      onError: () =>
                        toast.error("Couldn't remove them. A space needs at least one manager."),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {members.data && members.data.items.length === 0 ? (
              <li className="py-2 text-sm text-muted-foreground">Nobody has a seat yet.</li>
            ) : null}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
