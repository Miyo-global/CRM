import { type NextRequest, NextResponse } from "next/server";
import { withAuth, err } from "@/lib/api/helpers";
import { getContact } from "@/server/queries/crm-contacts";

type Ctx = { params: Promise<{ contactId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { contactId: rawId } = await ctx.params;
  const contactId = Number(rawId);
  if (!Number.isFinite(contactId)) return err("Invalid contact id", 400);

  return withAuth(async (session) => {
    const contact = await getContact(session.orgId, contactId);
    if (!contact) return err("Contact not found", 404);

    const nameParts = contact.name.trim().split(/\s+/);
    const firstName = nameParts.slice(0, -1).join(" ") || contact.name;
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    const lines: string[] = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${contact.name}`,
      `N:${lastName};${firstName};;;`,
    ];

    if (contact.phone) lines.push(`TEL;TYPE=CELL:${contact.phone}`);
    if (contact.email) lines.push(`EMAIL:${contact.email}`);
    if (contact.company) lines.push(`ORG:${contact.company}`);
    if (contact.title) lines.push(`TITLE:${contact.title}`);
    if (contact.websiteUrl) lines.push(`URL:${contact.websiteUrl}`);
    if (contact.linkedinUrl) lines.push(`X-SOCIALPROFILE;type=linkedin:${contact.linkedinUrl}`);
    if (contact.twitterUrl) lines.push(`X-SOCIALPROFILE;type=twitter:${contact.twitterUrl}`);

    lines.push("END:VCARD");

    const vcardContent = lines.join("\r\n") + "\r\n";
    const safeName = contact.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    return new NextResponse(vcardContent, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.vcf"`,
      },
    });
  });
}
