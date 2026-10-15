import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-24">
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That page does not exist or has moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
