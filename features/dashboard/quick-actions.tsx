"use client";

import { memo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useHrAttendanceStatus } from "@/lib/api/hooks/hr";

interface QuickAction {
  label: string;
  href: string;
}

/** Up to three text actions per role (B7). */
export function getQuickActionsForRole(role: string | undefined): QuickAction[] {
  switch (role) {
    case "CEO":
      return [
        { label: "Add employee", href: "/hr/onboarding?tab=wizard" },
        { label: "Reports", href: "/reports" },
        { label: "Team schedule", href: "/hr/attendance" },
      ];
    case "HR":
    case "ADMIN":
      return [
        { label: "Add employee", href: "/hr/onboarding?tab=wizard" },
        { label: "Reports", href: "/reports" },
        { label: "Org chart", href: "/hr/org-chart" },
      ];
    case "CUSTOMER_SUPPORT":
      return [
        { label: "My tickets", href: "/support" },
        { label: "Check in", href: "/hr/attendance" },
      ];
    case "EMPLOYEE":
    case "ENGINEERING":
    case "DESIGN":
    case "VIDEO_EDITOR":
      return [
        { label: "My projects", href: "/projects" },
        { label: "Request leave", href: "/hr/leaves" },
        { label: "Check in", href: "/hr/attendance" },
      ];
    default:
      return [
        { label: "Request leave", href: "/hr/leaves" },
        { label: "Check in", href: "/hr/attendance" },
      ];
  }
}

export const QuickActions = memo(function QuickActions() {
  const { data: session } = useSession();
  const { data: attendance } = useHrAttendanceStatus({ staleTime: 30_000 });
  // Already clocked in: Check in is not an action any more (A39).
  const clockedIn = attendance?.status === "PRESENT" || attendance?.status === "ON_BREAK";

  const actions = getQuickActionsForRole(session?.user?.role).filter(
    (action) => !(clockedIn && action.label === "Check in"),
  );

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.slice(0, 3).map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:focus-ring"
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
});
