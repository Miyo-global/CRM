import Image from "next/image";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/design/tones";
import { cn } from "@/lib/utils";

/** Minimal centered layout for public token pages: logo lockup on top, one Card. */
export function TokenPageShell({
  title,
  subtitle,
  className,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 pt-10 pb-16 sm:pt-16">
      <div className={cn("w-full max-w-lg", className)}>
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Image src="/logo.svg" alt="Miyo Global" width={32} height={32} className="size-8 shrink-0" priority />
          <span className="font-display text-base font-bold tracking-tight text-foreground">Miyo Global</span>
        </div>
        <Card className="shadow-sm">
          <div className="border-b border-border px-6 py-6 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="px-6 py-6">{children}</div>
        </Card>
      </div>
    </main>
  );
}

/** Centered state block (expired / error / success) with a circular icon chip. */
export function TokenState({
  icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      {title && <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>}
      {children}
    </div>
  );
}
