"use client";

import { useState, useEffect, useCallback } from "react";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateQRCode, getQRCodes, deleteQRCode, getQRCodeImageUrl } from "./actions";
import {
  Loader2,
  QrCode as QrCodeIcon,
  ExternalLink,
  FileImage,
  FileType,
  Trash2,
  RefreshCw,
  ScanLine,
  Link2,
  CalendarDays,
  MoreVertical,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

type QRCodeData = {
  id: number;
  slug: string;
  targetUrl: string;
  imageUrl: string;
  scanCount: number;
  createdAt: Date | null;
};

function QRCodeImage({ imageUrl, size = 96 }: { imageUrl: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setSrc(null);
    if (!imageUrl?.trim()) { setSrc("/placeholder.png"); return; }
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith("http") || trimmed.startsWith("/")) {
      setSrc(trimmed);
    } else {
      getQRCodeImageUrl(trimmed).then(setSrc).catch(() => setError(true));
    }
  }, [imageUrl]);

  const handleError = useCallback(() => setError(true), []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full text-xs text-muted-foreground">
        <QrCodeIcon className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }
  if (!src) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt="QR Code"
      width={size}
      height={size}
      className="object-contain w-full h-full"
      unoptimized={src.startsWith("http")}
      onError={handleError}
    />
  );
}

function QRCard({
  qr,
  onDelete,
  onDownload,
}: {
  qr: QRCodeData;
  onDelete: (id: number) => void;
  onDownload: (slug: string, format: "png" | "jpeg" | "svg") => void;
}) {
  const domain = (() => {
    try { return new URL(qr.targetUrl).hostname; } catch { return qr.targetUrl; }
  })();

  const handleDeleteClick = useCallback(() => onDelete(qr.id), [qr.id, onDelete]);
  const handleDownloadPng = useCallback(() => onDownload(qr.slug, "png"), [qr.slug, onDownload]);
  const handleDownloadJpeg = useCallback(() => onDownload(qr.slug, "jpeg"), [qr.slug, onDownload]);
  const handleDownloadSvg = useCallback(() => onDownload(qr.slug, "svg"), [qr.slug, onDownload]);

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-border/40 bg-card flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_8px_40px_rgba(189,136,44,0.18)]">

      <div
        className="relative flex items-center justify-center p-6 h-48 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0c18 0%, #0f1420 50%, #0d0f1c 100%)" }}
      >

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(189,136,44,0.12) 0%, transparent 70%)" }}
        />

        <span className="absolute top-3 left-3 h-5 w-5 border-t-2 border-l-2 border-gold/50 rounded-tl-sm" />
        <span className="absolute top-3 right-3 h-5 w-5 border-t-2 border-r-2 border-gold/50 rounded-tr-sm" />
        <span className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-gold/50 rounded-bl-sm" />
        <span className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-gold/50 rounded-br-sm" />

        <span className="absolute left-3 right-3 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 group-hover:opacity-100 animate-[scan_2s_ease-in-out_infinite] pointer-events-none" />

        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 border border-emerald-500/30 backdrop-blur-sm rounded-full px-2.5 py-1">
          {qr.scanCount > 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          )}
          <ScanLine className="h-3 w-3 text-emerald-400 shrink-0" />
          <span className="text-[11px] font-bold text-emerald-400 tabular-nums">{qr.scanCount}</span>
          <span className="text-[9px] text-emerald-400/70">scans</span>
        </div>

        <div className="relative h-28 w-28 bg-white rounded-2xl p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.6)] group-hover:shadow-[0_0_0_1px_rgba(189,136,44,0.3),0_8px_40px_rgba(0,0,0,0.8)] transition-shadow duration-300">
          <QRCodeImage imageUrl={qr.imageUrl} size={120} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1 border-t border-border/30">

        <div>
          <Link
            href={qr.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-center gap-1.5 w-fit max-w-full"
          >
            <span className="text-sm font-semibold truncate leading-tight group-hover/link:text-gold transition-colors">
              {domain}
            </span>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover/link:text-gold transition-colors" />
          </Link>
          <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">{qr.targetUrl}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 bg-muted/60 border border-border/40 rounded-lg px-2 py-1 text-[10px] text-muted-foreground font-mono">
            <Link2 className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate max-w-[72px]">/qr/{qr.slug}</span>
          </span>
          <span className="flex items-center gap-1 bg-muted/60 border border-border/40 rounded-lg px-2 py-1 text-[10px] text-muted-foreground">
            <CalendarDays className="h-2.5 w-2.5 shrink-0" />
            {qr.createdAt
              ? new Date(qr.createdAt).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" })
              : ""}
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/80"
              aria-label="QR code options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal truncate">/qr/{qr.slug}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold px-2 py-1">Download</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleDownloadPng}>
              <FileImage className="mr-2 h-3.5 w-3.5 text-blue-400" /> PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadJpeg}>
              <FileImage className="mr-2 h-3.5 w-3.5 text-purple-400" /> JPEG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadSvg}>
              <FileType className="mr-2 h-3.5 w-3.5 text-emerald-400" /> SVG
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function QRCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border/40">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3 border-t border-border/30">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      <div className="px-4 pb-4">
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default function CEOQRCodePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: organizations, isLoading: isOrgLoading } = useGetOrganizations();
  const [targetUrl, setTargetUrl] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const orgId = organizations?.[0]?.id;

  const { data: qrCodes = [], isLoading: isLoadingData, refetch } = useQuery({
    queryKey: ["qr-codes", orgId],
    queryFn: () => getQRCodes(orgId!),
    enabled: !!orgId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization found");
      const formData = new FormData();
      formData.append("targetUrl", targetUrl);
      formData.append("orgId", orgId);
      return generateQRCode(formData);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success("QR Code generated successfully");
        setTargetUrl("");
        qc.invalidateQueries({ queryKey: ["qr-codes", orgId] });
      } else {
        toast.error(result.error ?? "Failed to generate QR code");
      }
    },
    onError: () => toast.error("An error occurred"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteQRCode(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("QR Code deleted");
        qc.invalidateQueries({ queryKey: ["qr-codes", orgId] });
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
      setDeleteId(null);
    },
    onError: () => { toast.error("An error occurred"); setDeleteId(null); },
  });

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId !== null) deleteMutation.mutate(deleteId);
  }, [deleteId, deleteMutation]);

  const handleRefetch = useCallback(() => { refetch(); }, [refetch]);
  const handleDeleteDialogChange = useCallback((open: boolean) => { if (!open) setDeleteId(null); }, []);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTargetUrl(e.target.value), []);

  const handleGenerate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;
    generateMutation.mutate();
  }, [targetUrl, generateMutation]);

  const handleDownload = useCallback(async (slug: string, format: "png" | "jpeg" | "svg") => {
    try {
      const res = await fetch(`/api/qr-code/download?slug=${encodeURIComponent(slug)}&format=${format}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-${slug}.${format === "jpeg" ? "jpg" : format}`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    } catch {
      toast.error("Failed to download QR code");
    }
  }, []);

  useEffect(() => {
    if (session && (!session.user || session.user.role !== "CEO")) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (!session?.user || session.user.role !== "CEO") {
    return null;
  }

  if (isOrgLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organizations?.length) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No Organization Found</h2>
        <p className="text-muted-foreground mt-1">You need an organization to create QR codes.</p>
      </div>
    );
  }

  const typedCodes = qrCodes as QRCodeData[];

  return (
    <PageWrapper
      title="QR Code Manager"
      subtitle="Generate trackable QR codes for your marketing campaigns."
      badge={typedCodes.length > 0 ? String(typedCodes.length) : undefined}
      actions={
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefetch} disabled={isLoadingData} aria-label="Refresh">
          <RefreshCw className={cn("h-3.5 w-3.5", isLoadingData && "animate-spin")} />
        </Button>
      }
    >
      <div className="space-y-6">

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gold/10 ring-1 ring-gold/20 flex items-center justify-center shrink-0">
              <QrCodeIcon className="h-4 w-4 text-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold">Generate New QR Code</p>
              <p className="text-xs text-muted-foreground">Enter the destination URL to create a tracked QR code</p>
            </div>
          </div>
          <form onSubmit={handleGenerate} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="target-url" className="sr-only">Target URL</Label>
              <Input
                id="target-url"
                placeholder="https://example.com/campaign-landing-page"
                value={targetUrl}
                onChange={handleUrlChange}
                required
                type="url"
                className="h-9"
              />
            </div>
            <Button type="submit" disabled={generateMutation.isPending || !targetUrl} size="sm" className="h-9 shrink-0">
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <QrCodeIcon className="mr-2 h-3.5 w-3.5" />
              )}
              Generate
            </Button>
          </form>
        </div>

        <div>
          {isLoadingData ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <QRCardSkeleton key={i} />)}
            </div>
          ) : typedCodes.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center py-14 gap-3">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                <QrCodeIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No QR codes yet</p>
              <p className="text-xs text-muted-foreground">Generate your first QR code above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {typedCodes.map((qr) => (
                <QRCard
                  key={qr.id}
                  qr={qr}
                  onDelete={setDeleteId}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete QR Code"
        description="This action cannot be undone. The QR code and its tracking data will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
