import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getAssets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { assetCreateBodySchema, DUPLICATE_SERIAL_MESSAGE } from "@/lib/validations/hr-assets";

const postAssetSchema = assetCreateBodySchema;

export async function GET() {
  return withAuth(async (session) => {
    const data = await getAssets(session.orgId);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create assets.", 403);
    }

    const body = await parseBody(req, postAssetSchema);

    const duplicate = await db.query.assets.findFirst({
      where: and(
        eq(assets.orgId, session.orgId),
        eq(assets.serialNumber, body.serialNumber),
      ),
      columns: { id: true },
    });
    if (duplicate) {
      return err(DUPLICATE_SERIAL_MESSAGE, 409);
    }

    const [asset] = await db
      .insert(assets)
      .values({
        orgId: session.orgId,
        name: body.name,
        type: body.type,
        serialNumber: body.serialNumber,
        brand: body.brand,
        model: body.model,
        assignedTo: null,
        purchaseDate: formatDateOnly(new Date(body.purchaseDate)),
        purchaseCost: body.purchaseCost.toString(),
        location: body.location || null,
        notes: body.notes || null,
        status: "AVAILABLE",
      })
      .returning();

    return ok(asset);
  });
}
