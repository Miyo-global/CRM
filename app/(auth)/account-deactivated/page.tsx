import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";

export default function AccountDeactivatedPage() {
  return (
    <div className="flex w-full max-w-[400px] flex-col items-center text-center">
      <IconChip icon={ShieldOff} tone="danger" size="lg" className="mb-5" />

      <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">
        Account Deactivated
      </h1>

      <p className="mt-3 text-base text-muted-foreground">
        Your account has been deactivated. Please contact your administrator
        to restore access.
      </p>

      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/signin">Back to Sign In</Link>
      </Button>
    </div>
  );
}
