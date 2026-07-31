import { NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseBody, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  projects,
  projectMembers,
  projectStatuses,
  users,
  tickets,
} from "@/lib/db/schema";
import { eq, and, desc, inArray, or, sql, count } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { sendProjectAssignmentEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  key: z.string().optional(),
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  modules: z
    .object({
      sprints: z.boolean(),
      epics: z.boolean(),
      timeTracking: z.boolean(),
      wiki: z.boolean(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") ?? undefined;
    const statusParam = searchParams.get("status") ?? "ALL";
    const page = toNumber(searchParams.get("page")) ?? 1;
    const limit = toNumber(searchParams.get("limit")) ?? 9;
    const offset = (page - 1) * limit;

    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(projects.orgId, session.orgId!)];

    if (!isOwnerOrAdmin) {
      const memberOf = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, session.user.id));
      const projectIds = memberOf.map((m) => m.projectId);

      conditions.push(
        or(
          eq(projects.managerId, session.user.id),
          projectIds.length > 0
            ? inArray(projects.id, projectIds)
            : sql`false`
        )!
      );
    }

    if (search?.trim()) {
      conditions.push(
        or(
          sql`${projects.name} ILIKE ${"%" + search + "%"}`,
          sql`${projects.key} ILIKE ${"%" + search + "%"}`
        )!
      );
    }

    if (statusParam !== "ALL") {
      conditions.push(
        eq(
          projects.status,
          statusParam as "ACTIVE" | "COMPLETED" | "ARCHIVED"
        )
      );
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(projects)
      .where(whereClause);

    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        key: projects.key,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        managerId: projects.managerId,
        managerFirstName: users.firstName,
        managerLastName: users.lastName,
        managerImage: users.image,
      })
      .from(projects)
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(whereClause)
      .orderBy(desc(projects.id))
      .limit(limit)
      .offset(offset);

    if (projectRows.length === 0) {
      return ok({
        data: [],
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit),
      });
    }

    const projectIds = projectRows.map((p) => p.id);

    const [progressRows, memberRows] = await Promise.all([
      db
        .select({
          projectId: tickets.projectId,
          total: count(),
          done: sql<number>`count(*) filter (where ${tickets.status} = 'DONE')`.as("done"),
        })
        .from(tickets)
        .where(inArray(tickets.projectId, projectIds))
        .groupBy(tickets.projectId),
      db
        .select({
          projectId: projectMembers.projectId,
          userId: projectMembers.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          image: users.image,
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(inArray(projectMembers.projectId, projectIds)),
    ]);

    const progressMap = new Map(
      progressRows.map((r) => [r.projectId, { total: r.total, done: r.done }])
    );
    const membersMap = new Map<
      number,
      { id: string; firstName: string | null; lastName: string | null; image: string | null }[]
    >();
    for (const m of memberRows) {
      if (!membersMap.has(m.projectId)) membersMap.set(m.projectId, []);
      const arr = membersMap.get(m.projectId)!;
      if (arr.length < 5) {
        arr.push({ id: m.userId, firstName: m.firstName, lastName: m.lastName, image: m.image });
      }
    }

    const data = projectRows.map((p) => {
      const progress = progressMap.get(p.id) ?? { total: 0, done: 0 };
      const pct =
        progress.total > 0
          ? Math.round((Number(progress.done) / Number(progress.total)) * 100)
          : 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        key: p.key,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        manager: p.managerId
          ? { id: p.managerId, firstName: p.managerFirstName, lastName: p.managerLastName, image: p.managerImage }
          : null,
        progress: { total: Number(progress.total), done: Number(progress.done), percentage: pct },
        members: membersMap.get(p.id) ?? [],
      };
    });

    return ok({
      data,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createProjectSchema);

    let projectKey = body.key;
    if (!projectKey) {
      const namePart = body.name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      projectKey = (namePart.length >= 2 ? namePart : "PRJ") + "-" + randomPart;
    }

    const [project] = await db
      .insert(projects)
      .values({
        orgId: session.orgId!,
        key: projectKey,
        name: body.name,
        description: body.description,
        managerId: body.managerId,
        clientId: body.clientId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: "ACTIVE",
        settings: {
          modules: body.modules ?? {
            sprints: true,
            epics: true,
            timeTracking: true,
            wiki: true,
          },
        },
      })
      .returning();

    const defaultStatuses = [
      { name: "TODO", order: 0, color: "#e2e8f0" },
      { name: "IN_PROGRESS", order: 1, color: "#3b82f6" },
      { name: "IN_REVIEW", order: 2, color: "#eab308" },
      { name: "DONE", order: 3, color: "#22c55e" },
    ];

    await db.insert(projectStatuses).values(
      defaultStatuses.map((s) => ({
        orgId: session.orgId!,
        projectId: project.id,
        name: s.name,
        order: s.order,
        color: s.color,
      }))
    );

    if (body.memberIds && body.memberIds.length > 0) {
      await db.insert(projectMembers).values(
        body.memberIds.map((userId) => ({
          projectId: project.id,
          userId,
          role: "CONTRIBUTOR",
        }))
      );

      const [currentUser, addedMembers] = await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
        db.query.users.findMany({ where: inArray(users.id, body.memberIds) }),
      ]);

      for (const member of addedMembers) {
        if (member.email) {
          try {
            await sendProjectAssignmentEmail(
              member.email,
              member.name || member.firstName || "Team Member",
              body.name,
              projectKey,
              project.id,
              currentUser?.name || currentUser?.firstName || undefined
            );
          } catch (emailError) {
            logger.error("Failed to send project assignment email", { error: emailError });
          }
        }
      }
    }

    void createAuditLog({
      action: "project.created",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(project.id),
      targetType: "project",
      metadata: { name: body.name, key: projectKey, managerId: body.managerId },
    }).catch(() => {});

    return ok(project, 201);
  });
}
