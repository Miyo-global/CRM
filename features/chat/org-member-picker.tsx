"use client";

import { useMemo, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";
import type { OrgUser } from "@/types/chat";

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const Loader2Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
);

type GroupMode = "department" | "role";

function groupLabel(user: OrgUser, mode: GroupMode): string {
  if (mode === "department") {
    return user.departmentName?.trim() || "Unassigned";
  }
  return user.role?.trim() || "Other";
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function groupUsers(users: OrgUser[], mode: GroupMode): { label: string; users: OrgUser[] }[] {
  const map = new Map<string, OrgUser[]>();
  for (const user of users) {
    const label = groupLabel(user, mode);
    const list = map.get(label) ?? [];
    list.push(user);
    map.set(label, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === "Unassigned" || a === "Other") return 1;
      if (b === "Unassigned" || b === "Other") return -1;
      return a.localeCompare(b);
    })
    .map(([label, groupUsersList]) => ({
      label: mode === "role" ? formatRole(label) : label,
      users: groupUsersList.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    }));
}

function SelectionBox({
  checked,
  indeterminate,
}: {
  checked: boolean;
  indeterminate?: boolean;
}) {
  return (
    <div
      className={cn(
        "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
        checked || indeterminate
          ? "bg-gold border-gold text-white"
          : "border-border/60",
      )}
    >
      {checked && <CheckIcon className="h-3 w-3" />}
      {!checked && indeterminate && <div className="h-0.5 w-2.5 rounded-full bg-white" />}
    </div>
  );
}

interface SelectedUserBadgeProps {
  id: string;
  name?: string | null;
  onRemove: (id: string) => void;
}

function SelectedUserBadge({ id, name, onRemove }: SelectedUserBadgeProps) {
  const handleRemove = useCallback(() => onRemove(id), [id, onRemove]);
  return (
    <span className="inline-flex items-center gap-1 bg-gold/10 text-gold rounded-full px-2 py-0.5 text-[11px] font-medium">
      {name?.split(" ")[0]}
      <button type="button" onClick={handleRemove} className="hover:bg-gold/20 rounded-full p-0.5">
        <XIcon className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

export interface OrgMemberPickerProps {
  users: OrgUser[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  listHeightClassName?: string;
}

export function OrgMemberPicker({
  users,
  selectedIds,
  onSelectedIdsChange,
  isLoading = false,
  emptyMessage = "No people match your search.",
  listHeightClassName = "h-[240px]",
}: OrgMemberPickerProps) {
  const [search, setSearch] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("department");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [u.name, u.email, u.designation, u.departmentName, u.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search]);

  const grouped = useMemo(
    () => groupUsers(filteredUsers, groupMode),
    [filteredUsers, groupMode],
  );

  const toggleUser = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectedIdsChange(next);
    },
    [selectedIds, onSelectedIdsChange],
  );

  const toggleGroup = useCallback(
    (groupUserIds: string[]) => {
      const next = new Set(selectedIds);
      const allSelected = groupUserIds.every((id) => next.has(id));
      for (const id of groupUserIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      onSelectedIdsChange(next);
    },
    [selectedIds, onSelectedIdsChange],
  );

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Search people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-muted/30 border-border/30"
        />
      </div>

      <div className="flex gap-1 rounded-lg border border-border/40 p-1 bg-muted/20">
        {(["department", "role"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setGroupMode(mode)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
              groupMode === mode
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode === "department" ? "By department" : "By role"}
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(selectedIds).map((id) => {
            const user = userById.get(id);
            return (
              <SelectedUserBadge
                key={id}
                id={id}
                name={user?.name}
                onRemove={toggleUser}
              />
            );
          })}
        </div>
      )}

      <ScrollArea className={cn(listHeightClassName, "border-t border-border/30")}>
        <div className="p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-center text-[12px] text-muted-foreground py-10">{emptyMessage}</p>
          ) : (
            grouped.map((group) => {
              const groupIds = group.users.map((u) => u.id);
              const selectedCount = groupIds.filter((id) => selectedIds.has(id)).length;
              const allSelected = selectedCount === groupIds.length && groupIds.length > 0;
              const indeterminate = selectedCount > 0 && !allSelected;

              return (
                <div key={group.label} className="mb-2 last:mb-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupIds)}
                    className="sticky top-0 z-10 flex w-full items-center gap-2 rounded-lg bg-background/95 px-2 py-2 text-left hover:bg-muted/40 backdrop-blur-sm"
                  >
                    <SelectionBox checked={allSelected} indeterminate={indeterminate} />
                    <span className="text-[12px] font-semibold flex-1 truncate">{group.label}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {selectedCount}/{groupIds.length}
                    </span>
                  </button>
                  <div className="pl-1">
                    {group.users.map((user) => {
                      const selected = selectedIds.has(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleUser(user.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors text-left",
                            selected && "bg-gold/5",
                          )}
                        >
                          <SelectionBox checked={selected} />
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={resolveImageUrl(user.image)} />
                            <AvatarFallback className="text-[9px]">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate">
                              {user.name ?? user.email}
                              {user.designation ? (
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  {user.designation}
                                </span>
                              ) : null}
                            </p>
                            {groupMode === "role" && user.departmentName ? (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {user.departmentName}
                              </p>
                            ) : groupMode === "department" && user.role ? (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {formatRole(user.role)}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
