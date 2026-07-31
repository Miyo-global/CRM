"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
const Loader2Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
);
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAddChannelMembers,
  useChatOrgUsers,
} from "@/lib/hooks/trpc-hooks";
import { OrgMemberPicker } from "./org-member-picker";

export function AddMembersDialog({
  open,
  onOpenChange,
  channelId,
  existingMemberIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  existingMemberIds: Set<string>;
}) {
  const { data: orgUsers, isLoading } = useChatOrgUsers(open);
  const addMembers = useAddChannelMembers();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eligible = useMemo(
    () => (orgUsers ?? []).filter((u) => !existingMemberIds.has(u.id)),
    [orgUsers, existingMemberIds],
  );

  const reset = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleSubmit = useCallback(async () => {
    if (selected.size === 0) return;
    try {
      const result = await addMembers.mutateAsync({
        channelId,
        userIds: Array.from(selected),
      });
      if (result.added > 0) {
        toast.success(
          `Added ${result.added} member${result.added === 1 ? "" : "s"}`,
        );
      } else {
        toast.info("No new members added");
      }
      handleClose(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [addMembers, channelId, selected, handleClose]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>Add Members</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <OrgMemberPicker
            users={eligible}
            selectedIds={selected}
            onSelectedIdsChange={setSelected}
            isLoading={isLoading}
            emptyMessage={
              eligible.length === 0
                ? "Everyone is already in this channel."
                : "No people match your search."
            }
            listHeightClassName="h-[min(420px,50vh)]"
          />
        </div>

        <div className="shrink-0 border-t px-4 py-3 flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="flex-1 h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selected.size === 0 || addMembers.isPending}
            className="flex-1 h-9 bg-gold hover:bg-gold/90 text-white"
          >
            {addMembers.isPending ? (
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              `Add ${selected.size > 0 ? selected.size : ""}`.trim()
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
