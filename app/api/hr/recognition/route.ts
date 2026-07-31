import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { recognitions, users, organizationMembers, notifications, departmentMembers, departments } from "@/lib/db/schema";
import { eq, desc, and, gte, ne, inArray } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { sendRecognitionRecipientEmail, sendRecognitionShoutoutEmail } from "@/lib/email";

const HR_INBOX = "hr@miyoglobal.com";

const CATEGORY_LABEL: Record<string, string> = {
  KUDOS: "🙌 Kudos",
  TEAMWORK: "🤝 Teamwork",
  INNOVATION: "💡 Innovation",
  LEADERSHIP: "🏆 Leadership",
  ABOVE_AND_BEYOND: "⭐ Above & Beyond",
};

const createSchema = z.object({
  toUserId: z.string().min(1, "Recipient is required"),
  message: z.string().min(1, "Message is required").max(500),
  category: z.enum(["KUDOS", "TEAMWORK", "INNOVATION", "LEADERSHIP", "ABOVE_AND_BEYOND"]).optional().default("KUDOS"),
});

export async function GET() {
  return withAuth(async (session) => {
    const rows = await db.query.recognitions.findMany({
      where: eq(recognitions.orgId, session.orgId),
      with: { fromUser: true, toUser: true },
      orderBy: [desc(recognitions.createdAt)],
      limit: 500,
    });

    // Collect all user IDs then batch-fetch department memberships
    const userIds = [...new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId]))];
    const deptRows = userIds.length
      ? await db
          .select({ userId: departmentMembers.userId, deptName: departments.name })
          .from(departmentMembers)
          .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
          .where(inArray(departmentMembers.userId, userIds))
      : [];

    const userDept = new Map<string, string>();
    for (const d of deptRows) {
      if (!userDept.has(d.userId)) userDept.set(d.userId, d.deptName);
    }

    const data = rows.map((r) => ({
      ...r,
      fromUser: r.fromUser
        ? { id: r.fromUser.id, name: (r.fromUser as { name?: string | null }).name ?? null, image: (r.fromUser as { image?: string | null }).image ?? null, email: (r.fromUser as { email?: string | null }).email ?? null }
        : null,
      toUser: r.toUser
        ? { id: r.toUser.id, name: (r.toUser as { name?: string | null }).name ?? null, image: (r.toUser as { image?: string | null }).image ?? null, email: (r.toUser as { email?: string | null }).email ?? null }
        : null,
      fromUserDept: userDept.get(r.fromUserId) ?? null,
      toUserDept: userDept.get(r.toUserId) ?? null,
    }));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());
    if (body.toUserId === session.user.id) return err("You cannot send kudos to yourself.", 400);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDuplicate = await db.query.recognitions.findFirst({
      where: and(
        eq(recognitions.orgId, session.orgId),
        eq(recognitions.fromUserId, session.user.id),
        eq(recognitions.toUserId, body.toUserId),
        eq(recognitions.category, body.category ?? "KUDOS"),
        gte(recognitions.createdAt, oneWeekAgo),
      ),
    });
    if (recentDuplicate) {
      return err("You have already given this recognition to this person this week. You can give it again after 7 days.", 409);
    }

    const [recognition] = await db.insert(recognitions).values({
      orgId: session.orgId,
      fromUserId: session.user.id,
      toUserId: body.toUserId,
      message: body.message,
      category: body.category,
    }).returning();

    void (async () => {
      const [sender, recipient] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { name: true, image: true } }),
        db.query.users.findFirst({ where: eq(users.id, body.toUserId), columns: { name: true, email: true, image: true } }),
      ]);

      const senderName = sender?.name ?? session.user.name ?? "A colleague";
      const recipientName = recipient?.name ?? "You";
      const category = body.category ?? "KUDOS";
      const categoryLabel = CATEGORY_LABEL[category] ?? category;

      // In-app notification for recipient
      await db.insert(notifications).values({
        orgId: session.orgId,
        userId: body.toUserId,
        type: "INFO",
        title: `${categoryLabel} from ${senderName}`,
        message: body.message,
        link: "/hr/recognition",
      }).catch(() => {});

      // Email to recipient
      if (recipient?.email) {
        await sendRecognitionRecipientEmail(
          recipient.email, recipientName, senderName, category, body.message, sender?.image ?? null,
        ).catch(() => {});
      }

      // All other org members — in-app notification + shoutout email
      const allMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(and(
          eq(organizationMembers.orgId, session.orgId),
          ne(organizationMembers.userId, session.user.id),
          ne(organizationMembers.userId, body.toUserId),
        ));

      const emailed = new Set<string>();
      for (const m of allMembers) {
        const member = await db.query.users.findFirst({
          where: eq(users.id, m.userId),
          columns: { email: true, name: true },
        });

        // In-app notification
        await db.insert(notifications).values({
          orgId: session.orgId,
          userId: m.userId,
          type: "INFO",
          title: `${recipientName} was recognised — Team Shoutout!`,
          message: `${senderName} gave ${recipientName} ${categoryLabel}: "${body.message}"`,
          link: "/hr/recognition",
        }).catch(() => {});

        if (!member?.email) continue;
        const key = member.email.trim().toLowerCase();
        if (emailed.has(key)) continue;
        emailed.add(key);
        await sendRecognitionShoutoutEmail(
          member.email, member.name ?? "Team Member", recipientName,
          recipient?.image ?? null, senderName, category, body.message,
        ).catch(() => {});
      }

      // Always CC the HR inbox
      if (!emailed.has(HR_INBOX)) {
        await sendRecognitionShoutoutEmail(
          HR_INBOX, "HR Team", recipientName,
          recipient?.image ?? null, senderName, category, body.message,
        ).catch(() => {});
      }
    })();

    return ok(recognition, 201);
  });
}
