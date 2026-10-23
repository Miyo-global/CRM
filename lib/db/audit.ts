import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { requestIp } from "@/lib/audit-log";

interface AuditParams {
  action: string;
  userId: string;
  orgId?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action: params.action,
      userId: params.userId,
      orgId: params.orgId ?? null,
      targetId: params.targetId ?? null,
      targetType: params.targetType ?? null,
      metadata: params.metadata ?? null,
      ipAddress: params.ipAddress ?? (await requestIp()),
    });
  } catch (error) {
    logger.error("Failed to write audit log", { action: params.action, error });
  }
}
