"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function NotificationPreferencesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Notification Preferences Error" fallbackMessage="Failed to load notification preferences. Please try again." />;
}
