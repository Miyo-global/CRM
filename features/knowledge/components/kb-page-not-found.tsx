"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KNOWLEDGE_BASE } from "@/lib/knowledge/routes";

/**
 * KB-0089: one state for both "no such page" and "not yours to read".
 *
 * The wording is deliberately the same either way. Telling someone a page
 * exists but is closed to them is itself a leak — it confirms the title, the
 * id and that someone wrote it.
 */
export function KbPageNotFound({ backHref = KNOWLEDGE_BASE }: { backHref?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-sunken">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-xl font-semibold">This page doesn&apos;t exist</h2>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        This page doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Button asChild>
        <Link href={backHref}>Back to wiki</Link>
      </Button>
    </div>
  );
}
