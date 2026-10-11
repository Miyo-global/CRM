"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { ArrowLeft, Lock } from "lucide-react";

export function AccessDeniedView({ projectName }: { projectName: string }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center text-center">
        <IconChip icon={Lock} tone="warning" size="lg" className="mb-5" />
        <h2 className="mb-2 font-display text-xl font-bold text-foreground">
          You&apos;re not invited to this project
        </h2>
        <p className="mb-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{projectName}</span> is a private project.
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          Ask the project manager or admin to add you as a member to get access.
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/projects">
            <ArrowLeft className="size-4" />
            Back to Projects
          </Link>
        </Button>
      </div>
    </div>
  );
}
