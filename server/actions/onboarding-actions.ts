"use server";

import { db } from "@/lib/db";
import { users, documents, onboardingSteps, organizationMembers, leaveTypes, leaveBalances } from "@/lib/db/schema";

import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { formatDateOnly } from "@/lib/date-utils";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";
import { isOptionalPhoneValid } from "@/lib/phone";

const bankDetailsSchema = z.object({
  accountHolder: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(8).max(18),
  ifsc: z.string().length(11),
  branch: z.string().optional(),
  taxId: z.string().optional(),
});

const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
const VALID_DOC_TYPES = ["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"] as const;

export async function updatePersonalDetails(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const phone = formData.get("phone") as string;
  const skills = (formData.get("skills") as string)?.split(",").map(s => s.trim()).filter(Boolean);
  const experienceYears = formData.get("experienceYears") as string;
  const genderRaw = formData.get("gender") as string | null;
  const dateOfBirth = formData.get("dateOfBirth") as string | null;

  const gender = genderRaw === "MALE" || genderRaw === "FEMALE" || genderRaw === "OTHER"
    ? genderRaw
    : undefined;

  if (!phone?.trim() || !isOptionalPhoneValid(phone)) {
    return { error: "Invalid phone number" };
  }

  if (experienceYears) {
    const years = Number(experienceYears);
    if (!Number.isFinite(years) || years < 0 || years > 60) {
      return { error: "Experience must be between 0 and 60 years" };
    }
  }

  try {
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    await db.update(users).set({
      phone,
      skills,
      experienceYears: experienceYears ? experienceYears.toString() : undefined,
      ...(gender ? { gender } : {}),
      ...(dateOfBirth ? { dateOfBirth: formatDateOnly(new Date(dateOfBirth)) } : {}),
    }).where(eq(users.id, userId));

    await updateOnboardingStep(userId, "Personal Details", "COMPLETED");

    if (dateOfBirth && member?.orgId) {
      await invalidateHrDashboardCache(member.orgId);
    }

    return { success: true };
  } catch {
    return { error: "Failed to update profile" };
  }
}

export async function updateBankDetails(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const parsed = bankDetailsSchema.safeParse({
    accountNumber: formData.get("accountNumber"),
    bankName: formData.get("bankName"),
    branch: formData.get("branch") ?? undefined,
    ifsc: formData.get("ifsc"),
    accountHolder: formData.get("accountHolder"),
    taxId: formData.get("taxId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid bank details" };
  }

  const bankDetails = {
    accountNumber: parsed.data.accountNumber,
    bankName: parsed.data.bankName,
    branch: parsed.data.branch ?? "",
    ifsc: parsed.data.ifsc,
    accountHolder: parsed.data.accountHolder,
  };
  const taxId = parsed.data.taxId;

  try {
    await db.update(users).set({
      bankDetails: bankDetails,
      taxId: taxId,
    }).where(eq(users.id, userId));

    await updateOnboardingStep(userId, "Bank Details", "COMPLETED");
    return { success: true };
  } catch {
    return { error: "Failed to update bank details" };
  }
}

export async function uploadOnboardingDocument(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const file = formData.get("file") as File;
  const docType = formData.get("type") as "CONTRACT" | "CERTIFICATE" | "ID_PROOF" | "PAYSLIP" | "POLICY" | "OFFER_LETTER" | "RESUME" | "OTHER";

  if (!file) return { error: "No file provided" };
  if (!(VALID_DOC_TYPES as readonly string[]).includes(docType)) {
    return { error: "Invalid document type" };
  }
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { error: "File type not allowed. Use PDF, JPEG, PNG, or WebP." };
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return { error: "File size must be under 5MB" };
  }

  try {
    if (!isStorageConfigured()) {
      return { error: "Cloud storage (R2) is not configured. Contact your administrator." };
    }

    let fileUrl = "";
    const result = await uploadFile(file, "onboarding");
    fileUrl = result.url;
    const userOrg = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id),
    });

    if (!userOrg) return { error: "No organization found" };

    await db.insert(documents).values({
      orgId: userOrg.orgId,
      userId: session.user.id,
      name: file.name,
      type: docType,
      fileUrl: fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: session.user.id,
    });
    await updateOnboardingStep(session.user.id, `Upload ${docType}`, "COMPLETED", userOrg.orgId);

    revalidatePath("/onboarding");
    return { success: true, url: fileUrl };
  } catch {
    return { error: "Failed to upload document" };
  }
}
export async function submitOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const userOrg = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });

    if (!userOrg) return { error: "No organization found" };

    const steps = await db.query.onboardingSteps.findMany({
      where: eq(onboardingSteps.userId, session.user.id),
      columns: { stepName: true, status: true },
    });
    const statusByName = new Map(steps.map((s) => [s.stepName, s.status]));
    const requiredSteps = ["Personal Details", "Bank Details"];
    const incomplete = requiredSteps.filter((name) => statusByName.get(name) !== "COMPLETED");
    if (incomplete.length > 0) {
      return { error: `Please complete all required steps before submitting: ${incomplete.join(", ")}` };
    }

    await updateOnboardingStep(session.user.id, "Final Review", "COMPLETED", userOrg.orgId);
    await allocateDefaultLeaves(session.user.id, userOrg.orgId);

    await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, session.user.id));

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: "Failed to submit onboarding" };
  }
}

async function updateOnboardingStep(userId: string, stepName: string, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED", orgId?: string) {
    let targetOrgId = orgId;
    if (!targetOrgId) {
         const userOrg = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, userId),
        });
        targetOrgId = userOrg?.orgId;
    }

    if (!targetOrgId) return;
    const existing = await db.query.onboardingSteps.findFirst({
        where: and(
            eq(onboardingSteps.userId, userId),
            eq(onboardingSteps.stepName, stepName)
        )
    });

    if (existing) {
        await db.update(onboardingSteps)
            .set({ status, completedAt: status === 'COMPLETED' ? new Date() : null })
            .where(eq(onboardingSteps.id, existing.id));
    } else {
        await db.insert(onboardingSteps).values({
            userId,
            orgId: targetOrgId,
            stepName,
            status,
            completedAt: status === 'COMPLETED' ? new Date() : null
        });
    }
}

async function allocateDefaultLeaves(userId: string, orgId: string) {
  const currentYear = new Date().getFullYear();

  const existingBalances = await db.query.leaveBalances.findFirst({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.year, currentYear)
    ),
  });

  if (existingBalances) return;

  const orgLeaveTypes = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });

  if (orgLeaveTypes.length === 0) return;

  await db.insert(leaveBalances).values(
    orgLeaveTypes.map((lt) => ({
      orgId,
      userId,
      leaveTypeId: lt.id,
      balance: String(lt.daysPerYear),
      year: currentYear,
    }))
  );
}
