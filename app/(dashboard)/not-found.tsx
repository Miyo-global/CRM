import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-16 lg:px-6">
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That page does not exist or has moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:text-brand-text"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
