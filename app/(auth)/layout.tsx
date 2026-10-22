import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-skip-link focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md text-sm font-medium"
      >
        Skip to content
      </a>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex h-16 shrink-0 items-center px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:focus-ring"
          >
            <Image src="/logo.svg" alt="Miyo Global" width={32} height={32} className="size-8" />
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              Miyo Global
            </span>
          </Link>
        </header>

        <main
          id="main-content"
          aria-label="Authentication"
          className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8"
        >
          {children}
        </main>

        <footer className="shrink-0 px-8 py-4">
          <p className="text-xs text-subtle-foreground">
            &copy; {new Date().getFullYear()} Miyo Global. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
