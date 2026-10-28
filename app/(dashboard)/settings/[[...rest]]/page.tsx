import { notFound } from "next/navigation";
import { SettingsAccount } from "./settings-account";

/**
 * Only /settings itself is account settings; any unknown child path is a 404
 * (A14). Checked on the server before anything streams, so the response is a
 * real 404 status, not a client-side soft 404. This segment deliberately has no
 * loading.tsx: its Suspense boundary would start the stream (status 200) first.
 */
export default async function SettingsPage({ params }: { params: Promise<{ rest?: string[] }> }) {
  const { rest } = await params;
  if (rest?.length) notFound();
  return <SettingsAccount />;
}
