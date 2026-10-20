"use client";

import Image from "next/image";
import Link from "next/link";

const footerCols = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Solutions", href: "#solutions" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-sidebar-border bg-ink-950">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <Image src="/logo.svg" alt="Miyo Global" width={28} height={28} className="size-7 shrink-0" />
              <span className="font-display text-base font-bold text-sidebar-accent-foreground">
                Miyo Global
              </span>
            </div>
            <p className="max-w-52 text-sm leading-relaxed text-sidebar-muted">
              The enterprise operating system for modern teams.
            </p>
          </div>

          {footerCols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-2xs font-semibold uppercase tracking-widest text-sidebar-muted">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="rounded-sm text-sm text-sidebar-foreground outline-none transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-sidebar-border py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-sidebar-muted">
            &copy; {new Date().getFullYear()} Miyo Global. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://twitter.com/miyoglobal"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm text-sidebar-muted outline-none transition-colors hover:text-gold-400 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Twitter"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://linkedin.com/company/miyo-global"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm text-sidebar-muted outline-none transition-colors hover:text-gold-400 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="LinkedIn"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
