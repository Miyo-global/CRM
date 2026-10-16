import { AccessDenied } from "@/components/shared/access-denied";

/**
 * The one denied-page view.
 *
 * Route denials used to be inconsistent: some pages bounced silently to
 * /dashboard while others rendered Access Restricted, so a user could not tell
 * a missing page from a forbidden one (QA-0034). The middleware now sends every
 * route denial here.
 */
export default async function AccessRestrictedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const safeFrom = from && from.startsWith("/") && !from.startsWith("//") ? from : undefined;

  return (
    <AccessDenied
      message={
        safeFrom
          ? `Your role does not have access to ${safeFrom}.`
          : "You don't have permission to view this page."
      }
    />
  );
}
