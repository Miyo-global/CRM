"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const SKIN = "#ffb8b8";
const HAIR = "#2f2e41";

function AccessDeniedIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >

      <circle cx="100" cy="100" r="80" fill="var(--blue)" opacity="0.04" />

      <rect x="72" y="90" width="56" height="45" rx="8" fill="var(--gold)" opacity="0.9" />

      <path d="M82 90 V78 C82 65 92 58 100 58 C108 58 118 65 118 78 V90" stroke="var(--gold)" strokeWidth="6" fill="none" strokeLinecap="round" />

      <circle cx="100" cy="108" r="7" fill="white" />
      <rect x="97" y="112" width="6" height="10" rx="2" fill="white" />

      <circle cx="48" cy="105" r="10" fill={SKIN} />
      <ellipse cx="48" cy="97" rx="8" ry="7" fill={HAIR} />
      <rect x="40" y="113" width="16" height="20" rx="4" fill="var(--blue)" />

      <line x1="56" y1="120" x2="70" y2="110" stroke={SKIN} strokeWidth="3" strokeLinecap="round" />

      <text x="145" y="80" fontSize="18" fill="var(--gold)" opacity="0.5" fontWeight="bold">?</text>
      <text x="155" y="100" fontSize="12" fill="var(--gold)" opacity="0.3" fontWeight="bold">?</text>

      <line x1="30" y1="145" x2="170" y2="145" stroke="var(--blue)" strokeWidth="1" opacity="0.1" />

      <circle cx="160" cy="70" r="3" fill="var(--gold)" opacity="0.2" />
      <circle cx="40" cy="150" r="4" fill="var(--blue)" opacity="0.1" />
    </svg>
  );
}

export function AccessDeniedView({ projectName }: { projectName: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full p-8">
      <div className="text-center max-w-md">
        <AccessDeniedIllustration className="w-48 h-48 mx-auto mb-6" />
        <h2 className="text-xl font-bold text-foreground mb-2">
          You&apos;re not invited to this project
        </h2>
        <p className="text-sm text-muted-foreground mb-1">
          <span className="font-medium text-foreground">{projectName}</span> is a private project.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Ask the project manager or admin to add you as a member to get access.
        </p>
        <Link href="/projects">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    </div>
  );
}
