"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface AccessDeniedProps {
  currentRole?: string;
  requiredRoles?: string[];
  message?: string;
}

export function AccessDenied({ currentRole, requiredRoles, message }: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5">
        <ShieldAlert className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-1">
        {message || "You don't have permission to view this page."}
      </p>
      {currentRole && requiredRoles && requiredRoles.length > 0 && (
        <p className="text-xs text-muted-foreground/60 mb-6">
          Your role: <span className="font-medium">{currentRole}</span> | Required: {requiredRoles.join(", ")}
        </p>
      )}
      {!currentRole && <div className="mb-6" />}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
        <Button onClick={() => router.push("/dashboard")}>
          Dashboard
        </Button>
      </div>
    </div>
  );
}
