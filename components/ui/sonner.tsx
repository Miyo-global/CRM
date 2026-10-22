"use client";

import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, useSonner, type ToasterProps } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";

function playNotificationSound(type: "success" | "error" | "other") {
  // Browsers refuse audio before the first user gesture and log a warning
  // on every attempt.
  if (!navigator.userActivation?.hasBeenActive) return;
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
    "group toast mg-toast !flex !items-center !gap-3 !w-[min(22rem,calc(100vw-2rem))] !p-3 !pl-4 !pr-11 !font-sans",
  title: "!text-sm !font-semibold !text-foreground !leading-snug",
  description: "!text-xs !text-muted-foreground !leading-relaxed !mt-0.5",
  content: "!gap-0.5 !min-w-0",
  icon: "!m-0 !shrink-0",
  closeButton: "mg-toast-close",
  actionButton:
    "!h-7 !rounded-md !bg-primary !px-2.5 !text-xs !font-semibold !text-primary-foreground !shadow-xs hover:!bg-primary-hover",
  cancelButton:
    "!h-7 !rounded-md !bg-transparent !px-2.5 !text-xs !font-medium !text-muted-foreground hover:!bg-accent hover:!text-foreground",
  success: "mg-toast-success",
  error: "mg-toast-error",
  warning: "mg-toast-warning",
  info: "mg-toast-info",
  loading: "mg-toast-loading",
} as const;

const Toaster = ({ toastOptions, className, ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile(640);

  return (
    <>
      <ToastSoundListener />
      <Sonner
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        position={isMobile ? "top-center" : "bottom-right"}
        expand={false}
        visibleToasts={4}
        gap={12}
        offset={20}
        mobileOffset={16}
        closeButton
        icons={{
          success: <CheckCircle2 className="size-4" aria-hidden />,
          error: <XCircle className="size-4" aria-hidden />,
          warning: <AlertTriangle className="size-4" aria-hidden />,
          info: <Info className="size-4" aria-hidden />,
          loading: <Loader2 className="size-4 animate-spin" aria-hidden />,
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
