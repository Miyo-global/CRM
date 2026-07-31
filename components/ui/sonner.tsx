"use client";

import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";
import { Toaster as Sonner, useSonner, type ToasterProps } from "sonner";

function playNotificationSound(type: "success" | "error" | "other") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "error") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }

    osc.onended = () => ctx.close();
  } catch {
    // Audio not available (SSR, autoplay policy, etc.)
  }
}

function ToastSoundListener() {
  const { toasts } = useSonner();
  const prevCountRef = useRef(0);
  const knownIdsRef = useRef<Set<string | number>>(new Set());

  useEffect(() => {
    const currentIds = new Set(toasts.map((t) => t.id));
    const isNewToast = toasts.some((t) => !knownIdsRef.current.has(t.id));

    if (isNewToast && toasts.length > prevCountRef.current) {
      const newest = toasts.find((t) => !knownIdsRef.current.has(t.id));
      if (newest) {
        const type =
          newest.type === "success"
            ? "success"
            : newest.type === "error"
              ? "error"
              : "other";
        playNotificationSound(type);
      }
    }

    prevCountRef.current = toasts.length;
    knownIdsRef.current = currentIds;
  }, [toasts]);

  return null;
}

const toastClassNames = {
  toast:
    "group toast vc-toast !flex !items-start !gap-3 !w-[min(22rem,calc(100vw-2rem))] !rounded-xl !border !border-border/70 !shadow-medium !p-4 !pr-11 !font-sans !transition-all",
  title: "!text-sm !font-semibold !text-foreground !leading-snug !tracking-tight",
  description:
    "!text-xs !text-muted-foreground !leading-relaxed !mt-1 !opacity-90",
  content: "!gap-0.5",
  icon: "!mt-0.5 !mr-0 !size-5 !shrink-0",
  closeButton: "vc-toast-close",
  actionButton:
    "!rounded-md !bg-primary !text-primary-foreground !text-xs !font-medium !px-3 !h-8 !shadow-xs hover:!opacity-90",
  cancelButton:
    "!rounded-md !bg-muted !text-muted-foreground !text-xs !font-medium !px-3 !h-8 hover:!bg-muted/80",
  success: "vc-toast-success",
  error: "vc-toast-error",
  warning: "vc-toast-warning",
  info: "vc-toast-info",
  loading: "vc-toast-loading",
} as const;

const Toaster = ({ toastOptions, className, ...props }: ToasterProps) => {
  return (
    <>
      <ToastSoundListener />
      <Sonner
        theme="light"
        position="top-right"
        expand={false}
        visibleToasts={4}
        gap={12}
        offset={20}
        closeButton
        icons={{
          success: <CheckCircle2 className="size-5 text-success" aria-hidden />,
          error: <XCircle className="size-5 text-destructive" aria-hidden />,
          warning: <AlertTriangle className="size-5 text-warning" aria-hidden />,
          info: <Info className="size-5 text-info" aria-hidden />,
          loading: <Loader2 className="size-5 text-primary animate-spin" aria-hidden />,
        }}
        className={["toaster group", className].filter(Boolean).join(" ")}
        toastOptions={{
          duration: 4500,
          ...toastOptions,
          classNames: {
            ...toastClassNames,
            ...toastOptions?.classNames,
          },
        }}
        {...props}
      />
    </>
  );
};

export { Toaster };
