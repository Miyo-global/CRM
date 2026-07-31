import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthRightPanel } from "@/features/auth/auth-right-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (

    <div className="flex h-[100dvh] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="flex flex-1 flex-col overflow-y-auto bg-background">

        <header className="shrink-0 flex items-center justify-center px-4 sm:px-8 py-4 sm:py-5 border-b border-border/30">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-gold/10 ring-1 ring-gold/25 flex items-center justify-center overflow-hidden shrink-0">
              <Image src="/logo.svg" alt="Miyo Global" width={22} height={22} />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-foreground group-hover:text-gold transition-colors">
                Miyo Global
              </span>
              <span className="text-xs text-muted-foreground ml-1">CRM</span>
            </div>
          </Link>
        </header>

        <main
          id="main-content"
          aria-label="Authentication"
          className="flex flex-1 flex-col items-center *:text-center justify-center py-8 px-4 sm:px-8"
        >
          {children}
        </main>

        <footer className="shrink-0 px-4 sm:px-8 py-4 border-t border-border/20">
          <p className="text-[11px] text-muted-foreground/40">
            &copy; 2025 Miyo Global. All rights reserved.
          </p>
        </footer>
      </div>

      <div className="hidden lg:flex flex-1 shrink-0">
        <AuthRightPanel />
      </div>
    </div>
  );
}
