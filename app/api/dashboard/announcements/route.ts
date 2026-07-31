import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err, parseBody, parseQuery, toNumber } from "@/lib/api/helpers";
import {
  getActiveAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from "@/server/queries/dashboard";
import { invalidateCache } from "@/lib/cache";
import { CACHE_KEYS } from "@/lib/cache";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  content: z.string().min(1).max(2000),
  isPinned: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});

const deleteSchema = z.object({
  id: z.string(),
});

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getActiveAnnouncements(session.orgId);
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
    try {
      const body = await parseBody(req, createSchema);
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
