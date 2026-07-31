"use client";

import { useSession } from "next-auth/react";
import { AccessDenied } from "./access-denied";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardGateProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function DashboardGate({ allowedRoles, children }: DashboardGateProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const userRole = session?.user?.role;

  if (!userRole || (!allowedRoles.includes(userRole) && userRole !== "CEO")) {
    return (
      <AccessDenied
        currentRole={userRole ?? undefined}
        requiredRoles={allowedRoles}
      />
    );
  }

  return <>{children}</>;
}
