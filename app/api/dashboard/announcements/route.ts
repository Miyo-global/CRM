import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err, parseBody, parseQuery, toNumber } from "@/lib/api/helpers";
import {
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/server/queries/dashboard";
import { invalidateCache } from "@/lib/cache";
import { CACHE_KEYS } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { hasHtmlTag, NO_HTML_MESSAGE } from "@/lib/validations/text-rules";

const createSchema = z.object({
  content: z.string().min(1).max(2000).refine((v) => !hasHtmlTag(v), NO_HTML_MESSAGE),
  isPinned: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});

const updateSchema = createSchema.pick({ content: true, isPinned: true });

function isAnnouncementAdmin(role: string | undefined) {
  return role === "CEO" || role === "HR" || role === "ADMIN";
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const expired = req.nextUrl.searchParams.get("expired") === "true";
      const data = await getActiveAnnouncements(session.orgId, { expired });
      return ok(data);
    } catch (error) {
      logger.error("Failed to load announcements", error);
      return err("Failed to load announcements", 500);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }
    const body = await parseBody(req, createSchema);
    try {
      const row = await createAnnouncement({
        orgId: session.orgId,
        authorId: session.user.id,
        content: body.content,
        isPinned: body.isPinned,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      });
      await invalidateCache(CACHE_KEYS.announcementsList(session.orgId));
      return ok(row, 201);
    } catch (error) {
      logger.error("Failed to create announcement", error);
      return err("Failed to create announcement", 500);
    }
  });
}

/** The author or an admin can edit an announcement (BUG-16). */
export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const numId = toNumber(parseQuery(req, deleteSchema).id);
    if (numId === undefined) return err("Invalid id", 400);
    const body = await parseBody(req, updateSchema);
    const authorId = isAnnouncementAdmin(session.user.role) ? undefined : session.user.id;
    const row = await updateAnnouncement(numId, session.orgId, body, authorId);
    if (!row) return err("Announcement not found", 404);
    await invalidateCache(CACHE_KEYS.announcementsList(session.orgId));
    return ok(row);
  });
}

export async function DELETE(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }
    try {
      const { id } = parseQuery(req, deleteSchema);
      const numId = toNumber(id);
      if (numId === undefined) return err("Invalid id", 400);
      await deleteAnnouncement(numId, session.orgId);
      await invalidateCache(CACHE_KEYS.announcementsList(session.orgId));
      return ok({ success: true });
    } catch (error) {
      logger.error("Failed to delete announcement", error);
      return err("Failed to delete announcement", 500);
    }
  });
}
