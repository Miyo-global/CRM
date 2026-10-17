"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export function NotActivatedPage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background px-6">
      <div className="flex max-w-md flex-col items-center text-center">

        <h1 className="mb-3 font-display text-2xl font-bold tracking-tight text-foreground">
          Portal Access Restricted
        </h1>

        <p className="mb-2 text-base leading-relaxed text-muted-foreground">
          Your access to this portal has been disabled by your administrator.
          You cannot access any part of the application until access is
          re-enabled. Please contact your HR department or administrator.
        </p>

        <p className="mb-8 text-xs text-subtle-foreground">
          Your account remains active — only portal access has been restricted.
        </p>

        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/signin" })}>
          <LogOut aria-hidden="true" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
