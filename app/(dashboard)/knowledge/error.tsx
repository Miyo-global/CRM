"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function KnowledgeError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="The knowledge base didn't load"
      fallbackMessage="Try again. If it keeps happening, your pages are safe — nothing was lost."
    />
  );
}
