import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviews, users, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const syncSchema = z.object({
  interviewId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = syncSchema.parse(await req.json());

    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, body.interviewId), eq(interviews.orgId, session.orgId)),
      with: { candidate: true },
    });
    if (!interview) return err("Interview not found.", 404);

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { googleRefreshToken: true, googleEmail: true },
    });

    if (!user?.googleRefreshToken) {
      return err("Google Calendar not connected. Connect via Settings → Integrations.", 400);
    }

    const candidateName = interview.candidate
      ? `${interview.candidate.firstName} ${interview.candidate.lastName}`
      : "Candidate";

    const startTime = new Date(interview.scheduledAt);
    const endTime = new Date(startTime.getTime() + (interview.duration ?? 60) * 60000);

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          refresh_token: user.googleRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) return err("Failed to refresh Google token. Please reconnect.", 400);
      const { access_token } = await tokenResponse.json() as { access_token: string };

      const calendarResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: `Interview: ${candidateName} - ${interview.type}`,
            description: `${interview.type} interview with ${candidateName}\n${interview.notes ?? ""}`,
            start: { dateTime: startTime.toISOString() },
            end: { dateTime: endTime.toISOString() },
            ...(interview.meetingLink && {
              conferenceData: { entryPoints: [{ entryPointType: "video", uri: interview.meetingLink }] },
            }),
          }),
        }
      );

      if (!calendarResponse.ok) {
        const errorData = await calendarResponse.text();
        return err(`Google Calendar error: ${errorData.slice(0, 200)}`, 502);
      }

      const event = await calendarResponse.json() as { id: string; htmlLink: string };
      return ok({ eventId: event.id, link: event.htmlLink });
    } catch (e) {
      return err("Failed to sync with Google Calendar.", 502);
    }
  });
}
