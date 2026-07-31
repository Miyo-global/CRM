import { z } from "zod";

// ─── Reusable strict field validators ────────────────────────────────────────

// Names (asset name, device name, brand, model): must contain at least one
// letter; reject numeric-only and special-character-only input; allow letters,
// numbers, spaces and a small set of punctuation.
const NAME_ALLOWED = /^[\p{L}\p{N}][\p{L}\p{N} .,'/()&+#_-]*$/u;

export function strictName(label: string, min = 2, max = 120) {
  return z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .refine((v) => /\p{L}/u.test(v), `${label} must contain at least one letter`)
    .refine((v) => !/^\d+$/.test(v), `${label} cannot be only numbers`)
    .refine((v) => NAME_ALLOWED.test(v), `${label} contains invalid characters`);
}

/** Allowed characters while typing; must still satisfy {@link strictName} on submit. */
const NAME_LIKE_CHAR = /^[\p{L}\p{N} .,'/()&+#_-]$/u;

/** Strips symbols/emojis etc. from name-like fields (asset name, custom type). */
export function sanitizeNameLikeInput(value: string, maxLen: number): string {
  return [...value].filter((c) => NAME_LIKE_CHAR.test(c)).join("").slice(0, maxLen);
}

// Serial numbers: normalised to upper-case; 4–64 chars of letters/digits/hyphens
// and must include at least one digit (rejects junk like "daf").
function strictSerial() {
  return z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z0-9-]{4,64}$/.test(v), "Serial number must be 4–64 characters: letters, numbers, or hyphens")
    .refine((v) => /\d/.test(v), "Serial number must include at least one digit");
}

export const optionalSerial = z.union([z.literal(""), strictSerial()]).optional();
export const requiredSerial = z.string().trim().min(1, "Serial number is required").pipe(strictSerial());

/** Earliest purchase date for assets (org operations from Oct 2025). */
export const ASSET_MIN_PURCHASE_DATE_YMD = "2025-10-01";

const dateYmdRules = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((d) => d >= ASSET_MIN_PURCHASE_DATE_YMD, "Purchase date must be on or after 1 Oct 2025");

const optionalDateYmd = z.union([z.literal(""), dateYmdRules]).optional();

const requiredDateYmd = z
  .string()
  .trim()
  .min(1, "Purchase date is required")
  .pipe(dateYmdRules);

/** Max lengths (also enforced in the asset form UI). */
export const ASSET_NOTES_MAX_CHARS = 500;
export const ASSET_LOCATION_MAX_CHARS = 200;

/** Maximum purchase cost in INR (1 crore). */
export const ASSET_PURCHASE_COST_MAX_INR = 10_000_000;

function preprocessPurchaseCost(val: unknown, emptyValue: undefined | typeof NaN) {
  if (val === undefined || val === null || val === "") return emptyValue;
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return NaN;
    if (val < 0) return NaN;
    if (val > ASSET_PURCHASE_COST_MAX_INR) return NaN;
    return val;
  }
  const s = String(val).trim().replace(/,/g, "");
  if (!s) return emptyValue;
  if (!/^\d+(\.\d*)?$/.test(s)) return NaN;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  if (n > ASSET_PURCHASE_COST_MAX_INR) return NaN;
  return n;
}

const purchaseCostNumber = z
  .number()
  .min(0, "Cost cannot be negative")
  .max(ASSET_PURCHASE_COST_MAX_INR, "Amount cannot exceed ₹1 crore");

const optionalPurchaseCost = z.preprocess(
  (val) => preprocessPurchaseCost(val, undefined),
  purchaseCostNumber.optional(),
);

const requiredPurchaseCost = z
  .union([z.string(), z.number()])
  .superRefine((val, ctx) => {
    const processed = preprocessPurchaseCost(val, undefined);
    if (processed === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Purchase cost is required",
      });
      return;
    }
    if (Number.isNaN(processed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid purchase cost",
      });
      return;
    }
    const check = purchaseCostNumber.safeParse(processed);
    if (!check.success) {
      for (const issue of check.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
        });
      }
    }
  })
  .transform((val) => preprocessPurchaseCost(val, undefined) as number);

const optionalText = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`).optional().or(z.literal(""));

/** Preset asset types that require brand, model, and serial (IT devices). */
export const DEVICE_LIKE_ASSET_TYPES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Phone",
  "Tablet",
  "Headset",
  "Keyboard",
  "Mouse",
] as const;

export function isDeviceLikeAssetType(type: string): boolean {
  const t = type.trim();
  return (DEVICE_LIKE_ASSET_TYPES as readonly string[]).includes(t);
}

export const DUPLICATE_SERIAL_MESSAGE = "An asset with this serial number already exists.";

const assetFieldsSchema = z.object({
  name: strictName("Asset name"),
  type: strictName("Asset type", 2, 64),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]),
  serialNumber: requiredSerial,
  brand: strictName("Brand", 2, 64),
  model: strictName("Model", 1, 64),
  assignedTo: z.string().optional().or(z.literal("")),
  purchaseDate: requiredDateYmd,
  purchaseCost: requiredPurchaseCost,
  location: optionalText(ASSET_LOCATION_MAX_CHARS),
  notes: optionalText(ASSET_NOTES_MAX_CHARS),
});

// ─── Asset ────────────────────────────────────────────────────────────────────

/** Create flow: inventory fields only — server sets status AVAILABLE; assign via edit. */
export const assetCreateBodySchema = assetFieldsSchema.omit({ status: true, assignedTo: true });

/** @alias assetCreateBodySchema */
export const assetCreateSchema = assetCreateBodySchema;

export type AssetCreateValues = z.infer<typeof assetCreateBodySchema>;

export const assetFormSchema = assetFieldsSchema.superRefine((data, ctx) => {
  if (data.status === "ASSIGNED" && !data.assignedTo?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Employee is required when status is Assigned",
      path: ["assignedTo"],
    });
  }
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const assetPatchSchema = z.object({
  name: strictName("Asset name").optional(),
  type: strictName("Asset type", 2, 64).optional(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]).optional(),
  serialNumber: optionalSerial,
  brand: optionalText(64),
  model: optionalText(64),
  assignedTo: z.string().optional().or(z.literal("")),
  purchaseDate: optionalDateYmd,
  purchaseCost: optionalPurchaseCost,
  location: optionalText(ASSET_LOCATION_MAX_CHARS),
  notes: optionalText(ASSET_NOTES_MAX_CHARS),
  reassignmentReason: z.string().trim().max(500).optional(),
});

// ─── Device ─────────────────────────────────────────────────────────────────
// Brand, Model and Serial Number are mandatory and strictly validated so that
// every device is recorded with complete, de-duplicable details.

export const deviceFormSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  deviceType: z.string().trim().min(1, "Device type is required").max(64),
  deviceName: strictName("Device name"),
  serialNumber: requiredSerial,
  brand: strictName("Brand", 2, 64),
  model: strictName("Model", 1, 64),
  notes: optionalText(500),
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;
