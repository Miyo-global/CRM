"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  User,
  Package,
  CalendarClock,
  ClipboardList,
  Pencil,
  Trash2,
  Camera,
} from "lucide-react";

export type AssetReturnDetailRecord = {
  id: number;
  userId: string;
  employeeName: string | null;
  assetName: string;
  assetType: string | null;
  serialNumber: string | null;
  condition: string | null;
  status: string | null;
  notes: string | null;
  handoverPhotoUrls?: string[] | null;
  returnedAt: string | null;
  createdAt: string | null;
};

function statusBadgeVariant(
  s: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  if (s === "RETURNED") return "default";
  if (s === "PENDING") return "outline";
  if (s === "MISSING" || s === "LOST") return "destructive";
  return "secondary";
}

function formatDetailDateTime(value: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!value) return { date: "", time: "" };
  try {
    const d = new Date(value);
    return {
      date: format(d, "MMM d, yyyy"),
      time: format(d, "h:mm a"),
    };
  } catch {
    return { date: "", time: "" };
  }
}

function DetailBlock({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm leading-snug text-foreground">{children}</div>
    </div>
  );
}

export function AssetReturnDetailSheet(props: {
  record: AssetReturnDetailRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onEdit: (record: AssetReturnDetailRecord) => void;
  onDelete: (record: AssetReturnDetailRecord) => void;
}) {
  const { record, open, onOpenChange, isAdmin, onEdit, onDelete } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 border-l p-0 sm:max-w-md"
      >
        {record && (
          <>
            <SheetHeader className="shrink-0 space-y-3 border-b bg-muted/20 px-6 py-5 text-left">
              <div className="flex items-start justify-between gap-3 pr-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Asset return
                  </p>
                  <SheetTitle className="text-left text-lg font-semibold leading-snug tracking-tight">
                    {record.assetName}
                  </SheetTitle>
                  <SheetDescription className="text-left text-xs text-muted-foreground">
                    Record #{record.id}
                  </SheetDescription>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge
                    variant={statusBadgeVariant(record.status)}
                    className="text-[10px] font-medium tabular-nums"
                  >
                    {record.status ?? "PENDING"}
                  </Badge>
                  {record.assetType ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {record.assetType}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-6 px-6 py-5">
                <section className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <User className="h-3.5 w-3.5" aria-hidden />
                    Assigned to
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold leading-tight">
                      {record.employeeName ?? record.userId}
                    </p>
                    {record.employeeName ? (
                      <p className="break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {record.userId}
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Package className="h-3.5 w-3.5" aria-hidden />
                    Asset
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailBlock label="Name">{record.assetName}</DetailBlock>
                    <DetailBlock label="Condition">
                      <span className="font-medium">{record.condition ?? ""}</span>
                    </DetailBlock>
                    {record.serialNumber ? (
                      <DetailBlock label="Serial number" className="sm:col-span-2">
                        <span className="font-mono text-[13px]">{record.serialNumber}</span>
                      </DetailBlock>
                    ) : null}
                  </div>
                </section>

                {record.handoverPhotoUrls && record.handoverPhotoUrls.length > 0 ? (
                  <section className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Camera className="h-3.5 w-3.5" aria-hidden />
                      Handover photos
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {record.handoverPhotoUrls.map((url, index) => (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square overflow-hidden rounded-md border bg-muted"
                        >
                          <Image
                            src={url}
                            alt={`Handover photo ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </a>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                    Remarks
                  </div>
                  <div className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                    {record.notes?.trim() ? (
                      <p className="whitespace-pre-wrap text-foreground">{record.notes}</p>
                    ) : (
                      <p className="italic">No remarks</p>
                    )}
                  </div>
                </section>

                <Separator />

                <section>
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    Timeline
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["returnedAt", "createdAt"] as const).map((key) => {
                      const raw = key === "returnedAt" ? record.returnedAt : record.createdAt;
                      const label = key === "returnedAt" ? "Returned" : "Logged";
                      const { date, time } = formatDetailDateTime(raw);
                      return (
                        <div key={key} className="rounded-lg border bg-muted/20 px-3 py-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums">{date}</p>
                          {time ? (
                            <p className="text-xs text-muted-foreground tabular-nums">{time}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </ScrollArea>

            <SheetFooter className="shrink-0 flex-col gap-2 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {isAdmin ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => onEdit(record)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto"
                    onClick={() => onDelete(record)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              ) : null}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
