import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Google token");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function POST() {
  return withAuth(async (session) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return err("Google Meet integration not configured", 503);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { googleRefreshToken: true },
    });

    if (!user?.googleRefreshToken) {
      return err("Google account not connected. Please connect your Google account first.", 401);
    }

    try {
      const accessToken = await getAccessToken(user.googleRefreshToken);
      const now = new Date();
      const later = new Date(now.getTime() + 3600 * 1000);

      const calRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: "Meeting",
            start: { dateTime: now.toISOString() },
            end: { dateTime: later.toISOString() },
            conferenceData: {
              createRequest: {
                requestId: `meet-${Date.now()}`,
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
          }),
        }
      );

      if (!calRes.ok) throw new Error("Google Calendar API error");
      const calEvent = (await calRes.json()) as {
        conferenceData?: { entryPoints?: Array<{ uri: string; entryPointType: string }> };
      };

      const meetLink = calEvent.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri;

      if (!meetLink) throw new Error("No Meet link in response");
      return ok({ meetLink });
    } catch {
      return err("Failed to create Meet link", 500);
    }
  });
}

export async function GET() {
  return withAuth(async (session) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { googleRefreshToken: true, googleEmail: true },
    });
    const configured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
    const authUrl = `${appUrl}/api/integrations/google/auth`;
    return ok({
      configured,
      connected: !!user?.googleRefreshToken,
      googleEmail: user?.googleEmail ?? null,
      authUrl,
    });
  });
}
