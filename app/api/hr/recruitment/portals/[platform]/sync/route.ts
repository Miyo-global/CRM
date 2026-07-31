

import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateSources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

const SUPPORTED_PLATFORMS = ["LINKEDIN", "NAUKRI", "INDEED"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { platform: rawPlatform } = await params;
    const platform = rawPlatform.toUpperCase() as Platform;

    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return err(`Unsupported platform: ${rawPlatform}. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`, 400);
    }

    const source = await db.query.candidateSources.findFirst({
      where: and(
        eq(candidateSources.orgId, session.orgId),
        eq(candidateSources.platform, platform)
      ),
    });

    if (!source) {
      return err(`No ${platform} integration configured for this organization.`, 404);
    }

    if (!source.isActive) {
      return err(`${platform} integration is disabled. Enable it in integration settings first.`, 400);
    }

    if (!source.oauthToken) {
      return err(`No API token configured for ${platform}. Please authenticate via the integration settings.`, 400);
    }

    return err(
      `Automated sync for ${platform} is not yet available. Import candidates manually using the bulk-import feature.`,
      501,
    );
  });
}
