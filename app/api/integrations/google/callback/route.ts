import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/calendar?google=error", appUrl));
  }

  let userId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = parsed.userId;
  } catch {
    return NextResponse.redirect(new URL("/calendar?google=error", appUrl));
  }

  const session = await auth();
  if (!session?.user?.id || session.user.id !== userId) {
    return NextResponse.redirect(new URL("/calendar?google=error", appUrl));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/calendar?google=error", appUrl));
  }

  const redirectUri = `${appUrl}/api/integrations/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/calendar?google=error", appUrl));
  }

  const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL("/calendar?google=error", appUrl));
  }

  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userinfo = userinfoRes.ok ? ((await userinfoRes.json()) as { email?: string }) : null;

  await db
    .update(users)
    .set({
      googleRefreshToken: tokens.refresh_token,
      googleEmail: userinfo?.email ?? null,
    })
    .where(eq(users.id, userId));

  return NextResponse.redirect(new URL("/calendar?google=connected", appUrl));
}
