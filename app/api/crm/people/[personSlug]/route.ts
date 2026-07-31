import { withAuth, ok, err } from "@/lib/api/helpers";
import { getPersonBySlug } from "@/server/queries/crm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ personSlug: string }> }
) {
  const { personSlug: slug } = await params;
  return withAuth(async (session) => {
    const data = await getPersonBySlug(session.orgId!, slug);
    if (!data) return err("Person not found", 404);
    return ok(data);
  });
}
