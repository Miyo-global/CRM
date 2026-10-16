"use client";

import { useState, useEffect, useCallback } from "react";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Building2,
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
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { DashboardGate } from "@/components/shared/dashboard-gate";

// QR codes must stay ink-on-white in every theme for scannability (spec §5.4).
// These are the only hex literals allowed in-app.
const QR_FG = "#201E1F";
const QR_BG = "#FFFFFF";

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
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        <QrCodeIcon className="size-8 text-subtle-foreground" aria-hidden="true" />
      </div>
    );
  }
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-subtle-foreground" aria-hidden="true" />
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
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md">
      <div className="relative flex h-44 items-center justify-center bg-surface-sunken p-6">
        <StatusPill tone="success" className="absolute top-3 left-3 tabular-nums">
          <ScanLine className="size-3" aria-hidden="true" />
          {qr.scanCount} <span className="font-normal">scans</span>
        </StatusPill>

        <div
          className="relative size-28 rounded-md p-2 shadow-sm ring-1 ring-border"
          style={{ backgroundColor: QR_BG, color: QR_FG }}
        >
          <QRCodeImage imageUrl={qr.imageUrl} size={120} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-border p-4">
        <div className="min-w-0">
          <Link
            href={qr.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex w-fit max-w-full items-center gap-1.5 rounded-sm outline-none focus-visible:focus-ring"
          >
            <span className="truncate text-sm font-semibold leading-tight transition-colors group-hover/link:text-brand-text">
              {domain}
            </span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/link:text-brand-text" aria-hidden="true" />
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={qr.targetUrl}>{qr.targetUrl}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone="neutral" className="font-mono">
            <Link2 className="size-3 shrink-0" aria-hidden="true" />
            <span className="max-w-24 truncate">/qr/{qr.slug}</span>
          </StatusPill>
          <StatusPill tone="neutral" className="tabular-nums">
            <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
            {qr.createdAt
              ? new Date(qr.createdAt).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" })
              : ""}
          </StatusPill>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-base transition-opacity duration-150 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full bg-background/90 backdrop-blur-sm"
              aria-label="QR code options"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="truncate font-mono text-2xs font-normal normal-case text-muted-foreground">/qr/{qr.slug}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Download</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleDownloadPng}>
              <FileImage /> PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadJpeg}>
              <FileImage /> JPEG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadSvg}>
              <FileType /> SVG
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeleteClick} variant="destructive">
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function QRCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="space-y-3 border-t border-border p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function CEOQRCodePage() {
  // CEO, HR and Admin all manage QR codes (the server actions allow them too).
  // The page used to require role === "CEO" and silently bounce everyone else
  // to /dashboard, which made the feature unreachable (QA-0007).
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <QRCodeManager />
    </DashboardGate>
  );
}

function QRCodeManager() {
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

  if (isOrgLoading) {
    return (
      <PageWrapper title="QR code manager">
        <Skeleton className="mb-6 h-32 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => <QRCardSkeleton key={i} />)}
        </div>
      </PageWrapper>
    );
  }

  if (!organizations?.length) {
    return (
      <PageWrapper title="QR code manager">
        <EmptyState
          icon={Building2}
          title="No organization found"
          description="You need an organization to create QR codes."
        />
      </PageWrapper>
    );
  }

  const typedCodes = qrCodes as QRCodeData[];

  return (
    <PageWrapper
      title="QR code manager"
      badge={typedCodes.length > 0 ? String(typedCodes.length) : undefined}
      actions={
        <Button variant="ghost" size="icon-sm" onClick={handleRefetch} disabled={isLoadingData} aria-label="Refresh">
          <RefreshCw className={cn(isLoadingData && "motion-safe:animate-spin")} />
        </Button>
      }
    >
      <div className="space-y-6">

        <div className={cn("grid gap-4", typedCodes[0] && "lg:grid-cols-[1fr_320px]")}>
          <Card className="gap-4 p-5">
            <div className="flex items-center gap-3">
              <IconChip icon={QrCodeIcon} />
              <div>
                <h2 className="font-sans text-sm font-semibold tracking-normal">Generate New QR Code</h2>
                <p className="text-xs text-muted-foreground">Enter the destination URL to create a tracked QR code</p>
              </div>
            </div>
            <form onSubmit={handleGenerate} className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 space-y-1">
                <Label htmlFor="target-url" className="sr-only">Target URL</Label>
                <Input
                  id="target-url"
                  placeholder="https://example.com/campaign-landing-page"
                  value={targetUrl}
                  onChange={handleUrlChange}
                  required
                  type="url"
                />
              </div>
              <Button type="submit" disabled={!targetUrl} loading={generateMutation.isPending} className="shrink-0">
                {!generateMutation.isPending && <QrCodeIcon aria-hidden="true" />}
                Generate
              </Button>
            </form>
          </Card>

          {typedCodes[0] && (
            <Card className="flex-row items-center gap-4 p-5">
              <div
                className="size-24 shrink-0 rounded-md p-2 ring-1 ring-border"
                style={{ backgroundColor: QR_BG, color: QR_FG }}
              >
                <QRCodeImage imageUrl={typedCodes[0].imageUrl} size={96} />
              </div>
              <div className="min-w-0">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Latest</p>
                <p className="truncate text-sm font-medium" title={typedCodes[0].targetUrl}>{typedCodes[0].targetUrl}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">/qr/{typedCodes[0].slug}</p>
              </div>
            </Card>
          )}
        </div>

        <div>
          {isLoadingData ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <QRCardSkeleton key={i} />)}
            </div>
          ) : typedCodes.length === 0 ? (
            <EmptyState
              icon={QrCodeIcon}
              title="No QR codes yet"
              description="Generate your first QR code above."
            />
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
        title="Delete QR code"
        description="This action cannot be undone. The QR code and its tracking data will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
