"server-only";
import * as webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions, chatChannelMembers } from "@/lib/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { CRM_BASE_URL } from "@/lib/constants/company";

function getVapidSubject(): string {
  // VAPID_SUBJECT is the documented override and takes precedence; the
  // app URL and sender address are derivations for when it is unset.
  const explicit = process.env.VAPID_SUBJECT?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl?.startsWith("https://")) return appUrl;

  const from = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (from) {
    if (from.startsWith("mailto:")) return from;
    if (from.includes("@")) return `mailto:${from}`;
  }

  return CRM_BASE_URL;
}

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    getVapidSubject(),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return;

  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;

        if (status === 404 || status === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, expiredEndpoints));
  }
}

export async function sendPushToChannelMembers(
  channelId: number,
  senderUserId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const members = await db
    .select({ userId: chatChannelMembers.userId })
    .from(chatChannelMembers)
    .where(
      and(
        eq(chatChannelMembers.channelId, channelId),
        ne(chatChannelMembers.userId, senderUserId)
      )
    );

  if (members.length === 0) return;

  await Promise.allSettled(
    members.map((m) => sendPushToUser(m.userId, payload))
  );
}
