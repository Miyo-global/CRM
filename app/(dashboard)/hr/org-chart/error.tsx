"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <RouteErrorBoundary error={error} reset={reset} />;
}
