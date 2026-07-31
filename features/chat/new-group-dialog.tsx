"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const CameraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);
const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const HashIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
);
const Loader2Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
);
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useChatOrgUsers, useCreateGroupChannel } from "@/lib/hooks/trpc-hooks";
import { resolveFileUrl } from "./chat-helpers";
import { OrgMemberPicker } from "./org-member-picker";

export function NewGroupDialog({
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
  const createGroup = useCreateGroupChannel();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"info" | "members">("info");

  const handleOpenAvatarInput = useCallback(() => { avatarInputRef.current?.click(); }, []);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  }, []);
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value), []);
  const handleGoToMembers = useCallback(() => setStep("members"), []);
  const handleGoToInfo = useCallback(() => setStep("info"), []);
  const handleSelectedIdsChange = useCallback((ids: Set<string>) => setSelectedIds(ids), []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (data.url) setAvatarUrl(data.url);
      else toast.error("Upload failed");
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setUploadingAvatar(false); if (avatarInputRef.current) avatarInputRef.current.value = ""; }
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedIds.size === 0) return;
    try {
      const channel = await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        memberIds: Array.from(selectedIds),
      });
      onCreated(channel.id);
      onOpenChange(false);
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSelectedIds(new Set());
      setStep("info");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep("info");
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSelectedIds(new Set());
    }
    onOpenChange(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={resetAndClose}>
      {!hideTrigger && (
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="New Channel" aria-label="New Channel">
            <UsersIcon className="h-3.5 w-3.5" />
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle className="text-[16px]">
            {step === "info" ? "Create Channel" : "Add Members"}
          </SheetTitle>
        </SheetHeader>

        {step === "info" ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="flex justify-center">
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                type="button"
                onClick={handleOpenAvatarInput}
                disabled={uploadingAvatar}
                className="relative group"
              >
                {avatarUrl ? (
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden border-2 border-border/40">
                    <Image src={resolveFileUrl(avatarUrl)} alt="Channel avatar" fill unoptimized className="object-cover" />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-muted/40 border-2 border-dashed border-border/60 flex items-center justify-center">
                    {uploadingAvatar ? (
                      <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <CameraIcon className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <CameraIcon className="h-4 w-4 text-white" />
                </div>
              </button>
            </div>
            <div>
              <Label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                Channel name
              </Label>
              <div className="relative">
                <HashIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. design-team"
                  className="pl-9 h-9 bg-muted/30 border-border/30"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">
                Description <span className="text-muted-foreground/50">(optional)</span>
              </Label>
              <Input
                value={description}
                onChange={handleDescriptionChange}
                placeholder="What's this channel about?"
                className="h-9 bg-muted/30 border-border/30"
              />
            </div>
            <Button
              onClick={handleGoToMembers}
              disabled={!name.trim()}
              className="w-full bg-gold hover:bg-gold/90 text-white h-9"
            >
              Next: Add Members
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <OrgMemberPicker
                users={orgUsers ?? []}
                selectedIds={selectedIds}
                onSelectedIdsChange={handleSelectedIdsChange}
                isLoading={isLoading}
                listHeightClassName="h-[min(420px,50vh)]"
              />
            </div>
            <div className="shrink-0 border-t px-4 py-3 flex gap-2">
              <Button variant="outline" onClick={handleGoToInfo} className="flex-1 h-9">
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={selectedIds.size === 0 || createGroup.isPending}
                className="flex-1 bg-gold hover:bg-gold/90 text-white h-9"
              >
                {createGroup.isPending ? (
                  <>
                    <Loader2Icon className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  `Create with ${selectedIds.size} member${selectedIds.size !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
