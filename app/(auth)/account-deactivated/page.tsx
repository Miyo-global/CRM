import Link from "next/link";

function ShieldOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18" />
      <path d="M4.73 4.73 4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export default function AccountDeactivatedPage() {
  return (
    <div className="w-full max-w-md animate-fade-up text-center">
      <div className="mx-auto mb-5 h-14 w-14 flex items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldOffIcon className="h-7 w-7 text-destructive" />
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
        Account Deactivated
      </h1>

      <p className="mt-3 text-sm text-muted-foreground">
        Your account has been deactivated. Please contact your administrator
        to restore access.
      </p>

      <Link
        href="/signin"
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
      >
        Back to Sign In
      </Link>
    </div>
  );
}
