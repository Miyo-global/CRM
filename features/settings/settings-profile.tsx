"use client";

import { useSession } from "next-auth/react";
import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropDialog } from "@/components/ui/avatar-crop-dialog";
import { Camera, Loader2, Trash2, Check, X } from "lucide-react";
import { useUpdateOwnPhoto, useUpdateProfile } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/lib/auth/role-change-rules";

export function SettingsProfile() {
  const { data: session, update: updateSession } = useSession();

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const updateProfile = useUpdateProfile();
  const updatePhoto = useUpdateOwnPhoto();

  const isBusy = uploading || updateProfile.isPending || updatePhoto.isPending;
  const displayImage = previewUrl || resolveImageUrl(session?.user?.image);
  const name = session?.user?.name || "";
  const email = session?.user?.email || "";
  const initials = name.charAt(0).toUpperCase() || "U";
  // R3-EMP-06: the name is HR record data (payslips, letters). Only a role that
  // may edit employee records (the same permission PATCH /api/hr/employees/:id
  // enforces) gets the editor; everyone else sees it read-only.
  const canEditName = roleHasPermission(session?.user?.role, "hr:employees:update");

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
        updatePhoto.mutate(
          imageValue,
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
  }, [session, updatePhoto, updateSession]);

  const handleRemovePhoto = useCallback(async () => {
    if (!session?.user?.id) return;
    setUploading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        updatePhoto.mutate(
          "",
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
  }, [session, updatePhoto, updateSession]);

  const handleSaveName = useCallback(() => {
    if (!session?.user?.id) return;
    if (!editName.trim()) {
      setNameError("Name is required");
      return;
    }
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
    setNameError(null);
  }, []);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") setIsEditingName(false);
  }, [handleSaveName]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setNameError(null);
  }, []);

  const handleStartEditName = useCallback(() => {
    setEditName(name);
    setNameError(null);
    setIsEditingName(true);
  }, [name]);

  const handleCropDialogChange = useCallback((open: boolean) => {
    setCropDialogOpen(open);
    if (!open) setCropImageSrc(null);
  }, []);

  return (
    <>

      <div className="flex flex-col gap-4 border-b border-border pb-5 mb-5 sm:flex-row sm:items-center">
        <div className="relative group shrink-0">
          <Avatar className="size-16 ring-2 ring-border">
            <AvatarImage src={displayImage} />
            <AvatarFallback className="text-xl font-bold bg-brand-soft text-brand-text">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleOpenFileInput}
            aria-label="Change profile photo"
            className="absolute inset-0 flex items-center justify-center bg-overlay rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:focus-ring transition-opacity cursor-pointer disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 text-ink-50 animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-ink-50" />
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
          <p className="font-display text-lg font-bold text-foreground truncate">{name || ""}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={handleOpenFileInput}
            >
              {isBusy ? (
                <><Loader2 className="animate-spin" aria-hidden />Uploading…</>
              ) : (
                <><Camera aria-hidden />Change photo</>
              )}
            </Button>
            {session?.user?.image && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={isBusy}
                onClick={handleRemovePhoto}
              >
                <Trash2 aria-hidden />Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-1.5">
          <Label htmlFor="display-name" className="text-sm font-medium">Display name</Label>
          {!canEditName ? (
            <>
              <Input id="display-name" value={name} disabled className="bg-muted/40" />
              <p className="text-xs text-muted-foreground">Contact HR to change your name.</p>
            </>
          ) : isEditingName ? (
            <>
            <div className="flex gap-1.5">
              <Input
                id="display-name"
                value={editName}
                onChange={handleEditNameChange}
                onKeyDown={handleNameKeyDown}
                placeholder="Your full name"
                autoFocus
                className="flex-1"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "display-name-error" : undefined}
              />
              <Button
                size="icon"
                className="shrink-0"
                onClick={handleSaveName}
                disabled={updateProfile.isPending}
                loading={updateProfile.isPending}
                aria-label="Save name"
              >
                <Check aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={handleCancelEditName}
                aria-label="Cancel"
              >
                <X aria-hidden />
              </Button>
            </div>
            {nameError && (
              <p id="display-name-error" role="alert" className="text-xs text-destructive">{nameError}</p>
            )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEditName}
              className={cn(
                "flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm",
                "text-left cursor-pointer hover:border-border-strong hover:bg-accent transition-colors focus-visible:focus-ring",
                !name && "text-muted-foreground"
              )}
              aria-label="Click to edit name"
            >
              {name || "Click to set name"}
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email-display" className="text-sm font-medium">Email address</Label>
          <Input
            id="email-display"
            type="email"
            value={email}
            disabled
            className="bg-muted/40"
          />
          <p className="text-xs text-muted-foreground">
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
