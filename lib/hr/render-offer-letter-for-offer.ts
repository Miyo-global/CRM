import { db } from "@/lib/db";
import {
  candidateOffers,
  candidates,
  offerLetterTemplates,
  offerLetterCustomVariables,
  organizations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  buildOfferLetterVars,
  buildCustomVariableVars,
  applyOfferTokens,
} from "@/lib/hr/offer-letter-tokens";
import { renderOfferLetterPdf } from "@/lib/hr/offer-letter-branded-pdf";

export async function renderOfferLetterPdfForOffer(params: {
  orgId: string;
  candidateId: number;
  offerId: number;
  templateId: number;
}): Promise<Buffer> {
  const { orgId, candidateId, offerId, templateId } = params;

  const candidate = await db.query.candidates.findFirst({
    where: and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)),
    columns: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!candidate) throw new Error("Candidate not found");

  const offer = await db.query.candidateOffers.findFirst({
    where: and(
      eq(candidateOffers.id, offerId),
      eq(candidateOffers.candidateId, candidateId),
      eq(candidateOffers.orgId, orgId),
    ),
    columns: {
      id: true,
      offeredSalary: true,
      offeredDesignation: true,
      joiningDate: true,
      validUntil: true,
    },
  });
  if (!offer) throw new Error("Offer not found");

  const template = await db.query.offerLetterTemplates.findFirst({
    where: and(
      eq(offerLetterTemplates.id, templateId),
      eq(offerLetterTemplates.orgId, orgId),
    ),
    columns: { id: true, body: true },
  });
  if (!template) throw new Error("Template not found");

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { name: true, address: true },
  });
  if (!org) throw new Error("Organisation not found");

  const customVars = await db.query.offerLetterCustomVariables.findMany({
    where: eq(offerLetterCustomVariables.orgId, orgId),
    columns: { variableKey: true, label: true },
  });

  const systemVars = buildOfferLetterVars(
    { firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email },
    {
      offeredSalary: offer.offeredSalary,
      offeredDesignation: offer.offeredDesignation,
      joiningDate: offer.joiningDate,
      validUntil: offer.validUntil,
    },
    { name: org.name, address: org.address },
    new Date(),
  );

  const vars = {
    ...buildCustomVariableVars(customVars, systemVars),
    ...systemVars,
  };

  const filledBody = applyOfferTokens(template.body, vars);

  return renderOfferLetterPdf({
    bodyText: filledBody,
    headerVm: { orgName: org.name, orgAddress: vars.orgAddress },
  });
}

export function offerLetterPreviewPdfHeaders(offerId: number): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="offer-preview-${offerId}.pdf"`,
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "frame-ancestors 'self'",
    "X-Content-Type-Options": "nosniff",
  };
}
