import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { projectKeySchema } from "@/lib/projects/project-key";
import { firstFreeProjectKey, isProjectKeyTaken, isProjectNameTaken } from "@/lib/projects/project-key-availability";

type KeyCheck = { suggestion?: string | null; nameTaken?: boolean; key?: string; valid?: boolean; available?: boolean; message?: string };

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const name = searchParams.get("name")?.trim();
    const rawKey = searchParams.get("key");

    if (rawKey === null) {
      if (!name) return err("Provide a key or a name", 400);
      // The wizard also asks here so a duplicate name stops at step 1, not at Create (R2-PRJ-01).
      const [suggestion, nameTaken] = await Promise.all([
        firstFreeProjectKey(name.slice(0, 200)),
        isProjectNameTaken(session.orgId, name),
      ]);
      return ok<KeyCheck>({ suggestion, nameTaken });
    }

    const parsed = projectKeySchema.safeParse(rawKey);
    if (!parsed.success) return ok<KeyCheck>({ key: rawKey, valid: false, available: false, message: parsed.error.issues[0]?.message });
    return ok<KeyCheck>({ key: parsed.data, valid: true, available: !(await isProjectKeyTaken(parsed.data)) });
  });
}
