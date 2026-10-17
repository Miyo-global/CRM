import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function AccessDeniedView() {
  return (
    <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center text-center">
        <h1 className="mb-2 font-display text-xl font-bold text-foreground">
          This project doesn&apos;t exist, or you don&apos;t have access
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Check the link, or ask the project manager to add you as a member.
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/projects">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to projects
          </Link>
        </Button>
      </div>
    </div>
  );
}
