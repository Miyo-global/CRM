import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-6">
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That page does not exist or has moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block w-fit text-sm text-primary underline-offset-4 hover:underline"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
