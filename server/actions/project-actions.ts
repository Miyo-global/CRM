"use server";

import { db } from "@/lib/db";
import {
    projects,
    organizationMembers,
    projectMembers,
    projectStatuses,
} from "@/lib/db/schema";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getProjects() {
    const session = await auth();
    if (!session?.user?.id) return [];

    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
    });
    if (!member) return [];

    const isOwnerOrAdmin = member.role === "CEO" || member.role === "ADMIN";
    if (isOwnerOrAdmin) {
        return await db.query.projects.findMany({
            where: eq(projects.orgId, member.orgId),
            with: {
                manager: true
            },
            orderBy: [desc(projects.id)]
        });
    }
    const memberOf = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, session.user.id));

    const projectIds = memberOf.map((m) => m.projectId);

    return await db.query.projects.findMany({
        where: and(
            eq(projects.orgId, member.orgId),
            or(
                eq(projects.managerId, session.user.id),
                projectIds.length > 0 ? inArray(projects.id, projectIds) : undefined
            )
        ),
        with: {
            manager: true
        },
        orderBy: [desc(projects.id)]
    });
}

export async function createProject(data: {
    name: string;
    key: string;
    description?: string;
    managerId?: string;
    memberIds?: string[];
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
    });
    if (!member) return { error: "No organization found" };
    const baseKey = data.key.replace(/[^A-Za-z]/g, "").toUpperCase() || "PROJ";
    if (!/^[A-Z]+$/.test(baseKey)) {
        return { error: "Project Key must be uppercase letters only (e.g. PROJ)" };
    }
    let keyToUse = baseKey;
    for (let n = 2; n < 1000; n++) {
        const existing = await db.query.projects.findFirst({
            where: eq(projects.key, keyToUse),
            columns: { id: true },
        });
        if (!existing) break;
        keyToUse = `${baseKey}${n}`;
    }

    try {
        const [project] = await db.insert(projects).values({
            orgId: member.orgId,
            name: data.name,
            key: keyToUse,
            description: data.description,
            managerId: data.managerId || session.user.id,
            status: "ACTIVE"
        }).returning();

        const projectId = project.id;
        const defaultStatuses = [
            { name: "TODO", order: 0, color: "#e2e8f0" },
            { name: "IN_PROGRESS", order: 1, color: "#3b82f6" },
            { name: "IN_REVIEW", order: 2, color: "#eab308" },
            { name: "DONE", order: 3, color: "#22c55e" },
        ];

        await db.insert(projectStatuses).values(
            defaultStatuses.map(s => ({
                orgId: member.orgId,
                projectId: projectId,
                name: s.name,
                order: s.order,
                color: s.color,
            }))
        );
        if (data.memberIds && data.memberIds.length > 0) {
            await db.insert(projectMembers).values(
                data.memberIds.map(userId => ({
                    projectId: projectId,
                    userId: userId,
                    role: "CONTRIBUTOR",
                }))
            );
        }

        revalidatePath("/projects");
        return { success: true };
    } catch (e) {
        return { error: "Failed to create project" };
    }
}

export async function getProjectById(projectId: number) {
    const session = await auth();
    if (!session?.user?.id) return null;
    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
    });
    if (!member) return null;

    const project = await db.query.projects.findFirst({
        where: and(
            eq(projects.id, projectId),
            eq(projects.orgId, member.orgId)
        ),
        with: {
            manager: true
        }
    });

    if (!project) return null;
    const isOwnerOrAdmin = member.role === "CEO" || member.role === "ADMIN";
    if (isOwnerOrAdmin) return project;
    const isManager = project.managerId === session.user.id;
    if (isManager) return project;

    const isMember = await db.query.projectMembers.findFirst({
        where: and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, session.user.id)
        )
    });

    return isMember ? project : null;
}
