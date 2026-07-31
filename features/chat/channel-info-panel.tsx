"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const CameraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);
const HashIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
);
const ImageIconSvg = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><polyline points="21 15 16 10 5 21"/></svg>
);
const Loader2Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
);
const PencilIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const PinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
);
const UserPlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
);
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";
import {
  useChatChannel,
  useChatOnlineUsers,
  useUpdateChannel,
  useRemoveChannelMember,
} from "@/lib/hooks/trpc-hooks";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials, resolveFileUrl } from "./chat-helpers";
import { AddMembersDialog } from "./add-members-dialog";

export function ChannelInfoPanel({
  channelId,
  currentUserId,
  onClose,
}: {
  channelId: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const { data: channel } = useChatChannel(channelId);
  const { data: onlineUsers } = useChatOnlineUsers();
  const updateChannel = useUpdateChannel();
  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const isAdmin = channel?.members?.some(
    (m) => m.user?.id === currentUserId && m.role === "ADMIN"
  );
  const isGroup = channel?.type === "GROUP";

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const editAvatarRef = useRef<HTMLInputElement>(null);

  const removeMember = useRemoveChannelMember();

  const existingMemberIds = useMemo(
    () =>
      new Set(
        (channel?.members ?? [])
          .map((m) => m.user?.id)
          .filter((id): id is string => Boolean(id))
      ),
    [channel?.members]
  );

  const adminCount = useMemo(
    () =>
      (channel?.members ?? []).filter((m) => m.role === "ADMIN").length,
    [channel?.members]
  );

  const handleOpenAddMembers = useCallback(() => setAddMembersOpen(true), []);

  const pinnedUntil = channel?.pinnedUntil
    ? new Date(channel.pinnedUntil as string | Date)
    : null;
  const isPinnedActive = Boolean(channel?.isPinned && pinnedUntil);

  const handlePinDays = useCallback(
    async (days: 1 | 7 | 14 | 30) => {
      try {
        await updateChannel.mutateAsync({ channelId, pinForDays: days });
        toast.success(`Channel pinned for ${days} day${days > 1 ? "s" : ""}`);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [updateChannel, channelId]
  );

  const handleUnpinChannel = useCallback(async () => {
    try {
      await updateChannel.mutateAsync({ channelId, unpin: true });
      toast.success("Channel unpinned");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [updateChannel, channelId]);

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      setRemovingUserId(userId);
      try {
        await removeMember.mutateAsync({ channelId, userId });
        toast.success("Member removed");
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setRemovingUserId(null);
      }
    },
    [removeMember, channelId]
  );

  const handleOpenAvatarInput = useCallback(() => { editAvatarRef.current?.click(); }, []);
  const handleCancelEdit = useCallback(() => setEditing(false), []);
  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value), []);
  const handleEditDescChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditDesc(e.target.value), []);

  const startEditing = () => {
    setEditName(channel?.name ?? "");
    setEditDesc(channel?.description ?? "");
    setEditAvatar(channel?.avatarUrl ?? "");
    setEditing(true);
  };

  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "chat-avatars");
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setEditAvatar(data.url);
      else toast.error("Upload failed");
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setUploadingAvatar(false); if (editAvatarRef.current) editAvatarRef.current.value = ""; }
  };

  const handleSaveEdit = async () => {
    try {
      await updateChannel.mutateAsync({
        channelId,
        name: editName.trim() || undefined,
        description: editDesc.trim(),
        avatarUrl: editAvatar,
      });
      setEditing(false);
      toast.success("Channel updated");
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const otherMember =
    channel?.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;
  const displayName =
    channel?.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel?.name ?? "Channel";

  return (
    <div className="flex flex-col h-full w-80">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <h3 className="text-[14px] font-bold">Details</h3>
        <div className="flex items-center gap-1">
          {isGroup && isAdmin && !editing && (
            <button onClick={startEditing} className="p-1.5 hover:bg-muted rounded-lg" title="Edit channel" aria-label="Edit channel">
              <PencilIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="Close">
            <XIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {editing ? (
            <div className="space-y-4 mb-6">
              <div className="flex justify-center">
                <input ref={editAvatarRef} type="file" accept="image/*" onChange={handleEditAvatarUpload} className="hidden" aria-label="Upload channel avatar" />
                <button type="button" onClick={handleOpenAvatarInput} disabled={uploadingAvatar} className="relative group">
                  {editAvatar ? (
                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-border/40">
                      <Image src={resolveFileUrl(editAvatar)} alt="Avatar" fill unoptimized className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border border-blue/10">
                      {uploadingAvatar ? <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImageIconSvg className="h-6 w-6 text-blue/40" />}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <CameraIcon className="h-5 w-5 text-white" />
                  </div>
                </button>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Name</Label>
                <Input value={editName} onChange={handleEditNameChange} className="h-8 text-[13px] bg-muted/30" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Description</Label>
                <Input value={editDesc} onChange={handleEditDescChange} placeholder="Add a description..." className="h-8 text-[13px] bg-muted/30" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit} className="flex-1 h-8 text-[12px]">Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={updateChannel.isPending || !editName.trim()} className="flex-1 h-8 text-[12px] bg-gold hover:bg-gold/90 text-white">
                  {updateChannel.isPending ? <Loader2Icon className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center mb-6">
              {channel?.type === "DIRECT" ? (
                <Avatar className="h-20 w-20 mb-3 border-2 border-border/30 shadow-md">
                  <AvatarImage src={resolveImageUrl(otherMember?.image)} />
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-gold/20 to-gold/5 text-gold">
                    {getInitials(otherMember?.name)}
                  </AvatarFallback>
                </Avatar>
              ) : channel?.avatarUrl ? (
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden mb-3 border-2 border-border/30 shadow-md">
                  <Image src={resolveFileUrl(channel.avatarUrl)} alt={channel.name} fill unoptimized className="object-cover" />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center mb-3 border border-blue/10">
                  <HashIcon className="h-8 w-8 text-blue" />
                </div>
              )}
              <h4 className="text-[17px] font-bold">{displayName}</h4>
              {channel?.type === "DIRECT" ? (
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {otherMember
                    ? onlineUserIds.has(otherMember.id)
                      ? "Online"
                      : "Offline"
                    : ""}
                </p>
              ) : (
                channel?.description && (
                  <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">
                    {channel.description}
                  </p>
                )
              )}
            </div>
          )}

          {isGroup && isAdmin && (
            <div className="mb-5 px-1 rounded-lg border border-border/40 bg-muted/15 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <PinIcon className="h-3.5 w-3.5 text-gold shrink-0" />
                <p className="text-[11px] font-semibold text-foreground">Pin channel</p>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Pinned channels appear at the top of the list until the pin expires.
              </p>
              {isPinnedActive && pinnedUntil && (
                <p className="text-[10px] text-muted-foreground">
                  Active until{" "}
                  <span className="font-medium text-foreground">
                    {pinnedUntil.toLocaleString()}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {([1, 7, 14, 30] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2"
                    disabled={updateChannel.isPending}
                    onClick={() => void handlePinDays(d)}
                  >
                    {d}d
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={updateChannel.isPending || !channel?.isPinned}
                  onClick={() => void handleUnpinChannel()}
                >
                  Unpin
                </Button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Members ({channel?.members?.length ?? 0})
              </h5>
              {isGroup && isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAddMembers}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gold hover:text-gold/80 transition-colors"
                  title="Add people"
                  aria-label="Add people to channel"
                >
                  <UserPlusIcon className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {channel?.members?.map((m) => {
                const memberId = m.user?.id;
                const isOnline = onlineUserIds.has(memberId ?? "");
                const isYou = memberId === currentUserId;
                const canRemove =
                  isGroup &&
                  isAdmin &&
                  !isYou &&
                  !!memberId &&
                  !(m.role === "ADMIN" && adminCount <= 1);
                const isRemoving = removingUserId === memberId;
                return (
                  <div
                    key={memberId}
                    className="group/member flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={resolveImageUrl(m.user?.image)} />
                        <AvatarFallback className="text-[10px] font-medium">
                          {getInitials(m.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {m.user?.name}
                        {isYou && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.user?.email}</p>
                    </div>
                    {m.role === "ADMIN" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-gold/30 text-gold">
                        Admin
                      </Badge>
                    )}
                    {canRemove && memberId && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(memberId)}
                        disabled={isRemoving}
                        className="opacity-0 group-hover/member:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
                        title="Remove from channel"
                        aria-label={`Remove ${m.user?.name ?? "member"} from channel`}
                      >
                        {isRemoving ? (
                          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {channel?.createdAt && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground/50 text-center">
                {channel.type === "GROUP"
                  ? `Created ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`
                  : `Started ${formatDistanceToNow(new Date(channel.createdAt), { addSuffix: true })}`}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {isGroup && isAdmin && (
        <AddMembersDialog
          open={addMembersOpen}
          onOpenChange={setAddMembersOpen}
          channelId={channelId}
          existingMemberIds={existingMemberIds}
        />
      )}
    </div>
  );
}
