"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveBackHref } from "@/lib/navigation/resolve-back-href";
import { cn } from "@/lib/utils";

interface PageBackButtonProps {
  fallback: string;
  label?: string;
  allowedPrefix?: string;
  /** Kept for compatibility; the ArrowLeft icon now always shows (§6.1). */
  showIcon?: boolean;
  className?: string;
}

export function PageBackButton({
  fallback,
  label = "Back",
  allowedPrefix,
  className,
}: PageBackButtonProps) {
  const searchParams = useSearchParams();
  const href = resolveBackHref(searchParams.get("returnTo"), fallback, allowedPrefix);

  return (
    <Button variant="ghost" size="sm" asChild className={cn("text-muted-foreground hover:text-foreground", className)}>
      <Link href={href}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
