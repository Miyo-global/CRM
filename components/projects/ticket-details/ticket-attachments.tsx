"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { getSignedFileUrl, viewFile } from "@/hooks/use-file-url";
import type { TicketAttachment } from "@/types/projects";

function AttachmentImage({
  fileUrl,
  fileName,
}: {
  fileUrl: string;
  fileName: string;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadImage = async () => {
      try {
        const signedUrl = await getSignedFileUrl(fileUrl);
        if (mounted) setImageSrc(signedUrl);
      } catch {
        if (mounted) setImageSrc(fileUrl);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadImage();
    return () => {
      mounted = false;
    };
  }, [fileUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={imageSrc || fileUrl}
      alt={fileName}
      fill
      unoptimized
      className="object-cover"
    />
  );
}

export function TicketAttachments({ attachments }: { attachments: TicketAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attachments</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {attachments.map((att) => (
          <button
            key={att.id}
            type="button"
            onClick={() => viewFile(att.fileUrl)}
            aria-label={`Open ${att.fileName}`}
            className="group relative aspect-video overflow-hidden rounded-md border border-border bg-muted text-left transition-colors hover:border-primary focus-visible:focus-ring"
          >
            {att.mimeType?.startsWith("image/") ? (
              <AttachmentImage fileUrl={att.fileUrl} fileName={att.fileName} />
            ) : (
              <div className="flex h-full items-center justify-center p-1 text-center text-2xs text-muted-foreground">
                {att.fileName}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-overlay opacity-0 transition-opacity group-hover:opacity-100">
              <ExternalLink className="h-4 w-4 text-ink-50" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
