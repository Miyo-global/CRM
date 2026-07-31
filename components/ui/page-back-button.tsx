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
  showIcon?: boolean;
  className?: string;
}

export function PageBackButton({
  fallback,
  label = "Back",
  allowedPrefix,
  showIcon = false,
  className,
}: PageBackButtonProps) {
  const searchParams = useSearchParams();
  const href = resolveBackHref(searchParams.get("returnTo"), fallback, allowedPrefix);

  return (
    <Button variant="ghost" size="sm" asChild className={cn(className)}>
      <Link href={href}>
        {showIcon && <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </Link>
    </Button>
  );
}
