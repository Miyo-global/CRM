import { withAuth, ok, err } from "@/lib/api/helpers";
import { getLatestSocialMediaStats } from "@/server/queries/social-media";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getLatestSocialMediaStats(session.orgId);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load social media stats",
        500
      );
    }
  });
}
