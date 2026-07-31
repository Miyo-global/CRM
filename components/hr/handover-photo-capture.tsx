"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const HANDOVER_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const HANDOVER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type HandoverPhotoCaptureProps = {
  photos: string[];
  onPhotosChange: (urls: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function HandoverPhotoCapture({
  photos,
  onPhotosChange,
  disabled = false,
  className,
}: HandoverPhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || disabled) return;

    setUploading(true);
    const next = [...photos];
    let added = 0;

    try {
      for (const file of Array.from(fileList)) {
        if (!HANDOVER_MIME_TYPES.includes(file.type as (typeof HANDOVER_MIME_TYPES)[number])) {
          toast.error(`${file.name}: use JPEG, PNG, or WebP`);
          continue;
        }
        if (file.size > HANDOVER_PHOTO_MAX_BYTES) {
          toast.error(`${file.name}: max 8 MB`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "asset-handover");

        const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(err.error ?? `Failed to upload ${file.name}`);
          continue;
        }

        const result = (await res.json()) as { url: string };
        next.push(result.url);
        added += 1;
      }

      if (added > 0) {
        onPhotosChange(next);
        toast.success(added === 1 ? "Photo added" : `${added} photos added`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Handover photos</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="mr-1.5 h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading…" : "Take / upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          multiple
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Capture the asset condition during handover from the employee (at least one photo).
      </p>
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <Image
                src={url}
                alt={`Handover photo ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-1 top-1 h-6 w-6 rounded-full shadow"
                disabled={disabled}
                onClick={() => removePhoto(index)}
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
          No photos yet
        </div>
      )}
    </div>
  );
}
