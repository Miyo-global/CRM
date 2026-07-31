"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useChatOrgUsers, useChatOnlineUsers, useCreateDM } from "@/lib/hooks/trpc-hooks";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

type OrgUser = { id: string; name?: string | null; email?: string | null; image?: string | null; role?: string | null };

interface DMUserItemProps {
  user: OrgUser;
  isOnline: boolean;
  isPending: boolean;
  onSelect: (userId: string) => void;
}

function DMUserItem({ user, isOnline, isPending, onSelect }: DMUserItemProps) {
  const handleClick = useCallback(() => onSelect(user.id), [user.id, onSelect]);
  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={resolveImageUrl(user.image)} />
          <AvatarFallback className="text-[10px] font-medium">{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-[13px] font-medium truncate">{user.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0 border-border/40">
        {user.role}
      </Badge>
    </button>
  );
}

export function NewDMDialog({
  open,
  onOpenChange,
  onCreated,
  hideTrigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channelId: number) => void;
  hideTrigger?: boolean;
}) {
  const { data: orgUsers, isLoading } = useChatOrgUsers();
  const { data: onlineUsers } = useChatOnlineUsers();
  const createDM = useCreateDM();
  const [search, setSearch] = useState("");

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const handleSelectUser = useCallback(async (userId: string) => {
    try {
      const channel = await createDM.mutateAsync({ targetUserId: userId });
      onCreated(channel.id);
      onOpenChange(false);
      setSearch("");
    } catch {
      toast.error("Failed to create conversation");
    }
  }, [createDM, onCreated, onOpenChange]);

  const filteredUsers = useMemo(() => {
    if (!orgUsers) return [];
    if (!search) return orgUsers;
    const q = search.toLowerCase();
    return orgUsers.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [orgUsers, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="New Direct Message" aria-label="New Direct Message">
            <PlusIcon className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-[16px]">New Direct Message</DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 h-9 bg-muted/30 border-border/30"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[340px] border-t border-border/30">
          <div className="p-1">
            {filteredUsers.map((user) => (
              <DMUserItem
                key={user.id}
                user={user}
                isOnline={onlineUserIds.has(user.id)}
                isPending={createDM.isPending}
                onSelect={handleSelectUser}
              />
            ))}
            {filteredUsers.length === 0 && !isLoading && (
              <div className="text-center py-10">
                <UsersIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">No users found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
