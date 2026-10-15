"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function NotificationPreferencesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Couldn't load notification preferences" fallbackMessage="Something went wrong loading notification preferences. Try again." />;
}
