"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
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
      <p className="text-sm font-medium">Handover photos</p>
      <p className="text-xs text-muted-foreground">
        Capture the asset condition during handover from the employee (at least one photo).
      </p>
      {/* §6.2 capture frame: ink surface, 56px gold shutter (ink icon on gold). */}
      <div className="space-y-4 rounded-xl bg-ink-950 p-4">
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative aspect-square overflow-hidden rounded-md bg-ink-900"
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
                  size="icon-sm"
                  variant="secondary"
                  className="absolute right-1 top-1 size-7 rounded-full shadow-sm"
                  disabled={disabled}
                  onClick={() => removePhoto(index)}
                  aria-label="Remove photo"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-sidebar-muted">No photos yet</p>
        )}
        <div className="flex flex-col items-center gap-1.5">
          <Button
            type="button"
            className="size-14 rounded-full p-0 shadow-md"
            disabled={disabled}
            loading={uploading}
            onClick={() => inputRef.current?.click()}
            aria-label={uploading ? "Uploading…" : "Take / upload"}
          >
            {!uploading && <Camera className="size-6" aria-hidden="true" />}
          </Button>
          <span className="text-xs font-medium text-sidebar-foreground" aria-hidden="true">
            {uploading ? "Uploading…" : "Take / upload"}
          </span>
        </div>
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
    </div>
  );
}
