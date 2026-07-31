import { withAuth, ok, err } from "@/lib/api/helpers";
import { getInvoiceStats } from "@/server/queries/invoice";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getInvoiceStats(session.orgId);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load invoice stats",
        500
      );
    }
  });
}
