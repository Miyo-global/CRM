import { withRoles, ok, err } from "@/lib/api/helpers";
import { INVOICE_ROLES } from "@/lib/constants/roles";
import { getInvoiceStats } from "@/server/queries/invoice";

export async function GET() {
  return withRoles(INVOICE_ROLES)(async (session) => {
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
