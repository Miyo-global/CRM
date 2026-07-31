import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { NextResponse } from "next/server";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Avoid dumping a bare JSON error onto a blank page. Send the user back to
    // the calendar with a friendly, surfaceable error flag instead.
    const back = new URL("/calendar", req.url);
    back.searchParams.set("googleError", "not_configured");
    return NextResponse.redirect(back);
  }

  const redirectUri = `${appUrl}/api/integrations/google/callback`;
  const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
