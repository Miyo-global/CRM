"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropDialog } from "@/components/ui/avatar-crop-dialog";
import { Camera, Loader2, Trash2, Check, X } from "lucide-react";
import { useUpdateProfile } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SettingsProfile() {
  const { data: session, update: updateSession } = useSession();

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const updateProfile = useUpdateProfile();

  const isBusy = uploading || updateProfile.isPending;
  const displayImage = previewUrl || resolveImageUrl(session?.user?.image);
  const name = session?.user?.name || "";
  const email = session?.user?.email || "";
  const initials = name.charAt(0).toUpperCase() || "U";

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      toast.error("Please select an image file (JPEG, PNG, GIF, or WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropImageSrc(ev.target?.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    if (!session?.user?.id) return;
    setUploading(true);
    try {
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
      setPreviewUrl(URL.createObjectURL(croppedBlob));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }
      const { url, key } = await res.json();
      const imageValue = url || key;

      await new Promise<void>((resolve, reject) => {
        updateProfile.mutate(
          { userId: session.user.id, image: imageValue },
          {
            onSuccess: async () => {
              await updateSession({});
              toast.success("Profile photo updated");
              setTimeout(() => setPreviewUrl(null), 1000);
              resolve();
            },
            onError: (err) => {
              toast.error(err instanceof Error ? err.message : "Failed to update photo");
              reject(err);
            },
          }
        );
      });

      setCropDialogOpen(false);
      setCropImageSrc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, [session, updateProfile, updateSession]);

  const handleRemovePhoto = useCallback(async () => {
    if (!session?.user?.id) return;
    setUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        updateProfile.mutate(
          { userId: session.user.id, image: "" },
          {
            onSuccess: async () => { await updateSession({}); setPreviewUrl(null); resolve(); },
            onError: (err) => reject(err),
          }
        );
      });
      toast.success("Profile photo removed");
    } catch {
      toast.error("Failed to remove photo");
    } finally {
      setUploading(false);
    }
  }, [session, updateProfile, updateSession]);

  const handleSaveName = useCallback(() => {
    if (!session?.user?.id || !editName.trim()) return;
    updateProfile.mutate(
      { userId: session.user.id, name: editName.trim() },
      {
        onSuccess: async () => {
          await updateSession({});
          toast.success("Name updated");
          setIsEditingName(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to update name");
        },
      }
    );
  }, [session, editName, updateProfile, updateSession]);

  const handleOpenFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value);
  }, []);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") setIsEditingName(false);
  }, [handleSaveName]);

  const handleCancelEditName = useCallback(() => setIsEditingName(false), []);

  const handleStartEditName = useCallback(() => {
    setEditName(name);
    setIsEditingName(true);
  }, [name]);

  const handleCropDialogChange = useCallback((open: boolean) => {
    setCropDialogOpen(open);
    if (!open) setCropImageSrc(null);
  }, []);

  return (
    <>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative group shrink-0">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={displayImage} />
            <AvatarFallback className="text-xl font-bold bg-gold/10 text-gold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleOpenFileInput}
            aria-label="Change profile photo"
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            aria-label="Upload profile photo"
            onChange={handleFileSelect}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground truncate">{name || ""}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={isBusy}
              onClick={handleOpenFileInput}
            >
              {isBusy ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Uploading…</>
              ) : (
                <><Camera className="h-3 w-3 mr-1" />Change photo</>
              )}
            </Button>
            {session?.user?.image && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                disabled={isBusy}
                onClick={handleRemovePhoto}
              >
                <Trash2 className="h-3 w-3 mr-1" />Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-1.5">
          <Label htmlFor="display-name" className="text-[13px] font-medium">Display name</Label>
          {isEditingName ? (
            <div className="flex gap-1.5">
              <Input
                id="display-name"
                value={editName}
                onChange={handleEditNameChange}
                onKeyDown={handleNameKeyDown}
                placeholder="Your full name"
                autoFocus
                className="h-9 text-sm flex-1"
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleSaveName}
                disabled={updateProfile.isPending || !editName.trim()}
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                onClick={handleCancelEditName}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEditName}
              className={cn(
                "flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm",
                "text-left cursor-pointer hover:border-border/80 hover:bg-muted/40 transition-colors",
                !name && "text-muted-foreground"
              )}
              aria-label="Click to edit name"
            >
              {name || "Click to set name"}
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email-display" className="text-[13px] font-medium">Email address</Label>
          <Input
            id="email-display"
            type="email"
            value={email}
            disabled
            className="h-9 text-sm bg-muted/40"
          />
          <p className="text-[11px] text-muted-foreground">
            Contact your admin to change email.
          </p>
        </div>
      </div>

      {cropImageSrc && (
        <AvatarCropDialog
          open={cropDialogOpen}
          onOpenChange={handleCropDialogChange}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          loading={uploading}
        />
      )}
    </>
  );
}
