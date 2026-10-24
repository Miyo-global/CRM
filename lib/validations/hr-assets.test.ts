import { describe, expect, it } from "vitest";
import {
  assetFormSchema,
  assetCreateSchema,
  assetPatchSchema,
  deviceFormSchema,
} from "./hr-assets";
import { getTodayString } from "@/lib/date-utils";

// ─── Asset ────────────────────────────────────────────────────────────────────

const validAsset = {
  name: "MacBook Pro 16-inch",
  type: "Laptop",
  status: "AVAILABLE" as const,
  serialNumber: "C02XL1234ABC",
  brand: "Apple",
  model: "M3 Pro",
  assignedTo: "",
  purchaseDate: "2026-01-15",
  purchaseCost: 250000,
  notes: "Issued to design team",
};

describe("assetFormSchema", () => {
  it("accepts a fully valid asset", () => {
    expect(assetFormSchema.safeParse(validAsset).success).toBe(true);
  });

  it("rejects missing required inventory fields", () => {
    expect(
      assetFormSchema.safeParse({
        name: "Office Chair",
        type: "Furniture",
        status: "AVAILABLE",
        serialNumber: "",
        brand: "",
        model: "",
        assignedTo: "",
        purchaseDate: "",
        purchaseCost: "",
        notes: "",
      }).success,
    ).toBe(false);
  });

  it("uppercases a valid serial number", () => {
    const parsed = assetFormSchema.safeParse({ ...validAsset, serialNumber: "c02xl1234abc" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.serialNumber).toBe("C02XL1234ABC");
  });

  it("rejects a name that is too short", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, name: "A" }).success).toBe(false);
  });

  it("rejects a numeric-only name", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, name: "12345" }).success).toBe(false);
  });

  it("rejects a special-character-only name", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, name: "@#$%^" }).success).toBe(false);
  });

  it('rejects a junk serial like "daf" (too short, no digit)', () => {
    expect(assetFormSchema.safeParse({ ...validAsset, serialNumber: "daf" }).success).toBe(false);
  });

  it("rejects a serial with no digit", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, serialNumber: "ABCDEF" }).success).toBe(false);
  });

  it("rejects a serial that is too short", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, serialNumber: "AB1" }).success).toBe(false);
  });

  it("rejects an invalid purchase date format", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, purchaseDate: "15-01-2026" }).success).toBe(false);
  });

  it("rejects a purchase date before Oct 2025", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, purchaseDate: "2025-09-30" }).success).toBe(false);
  });

  it("accepts a purchase date on or after 1 Oct 2025", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, purchaseDate: "2025-10-01" }).success).toBe(true);
  });

  it("rejects a negative purchase cost", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, purchaseCost: -1 }).success).toBe(false);
  });

  it("rejects empty purchase cost with a clear message", () => {
    const parsed = assetFormSchema.safeParse({ ...validAsset, purchaseCost: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.message === "Purchase cost is required")).toBe(true);
    }
  });

  it("rejects invalid purchase cost string with a clear message", () => {
    const parsed = assetFormSchema.safeParse({ ...validAsset, purchaseCost: "abc" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.message === "Purchase cost must be a number, e.g. 1500")).toBe(true);
    }
  });

  it("accepts purchase cost as a valid numeric string", () => {
    const parsed = assetFormSchema.safeParse({ ...validAsset, purchaseCost: "125000.50" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.purchaseCost).toBe(125000.5);
  });

  it("accepts purchase cost at exactly ₹1 crore", () => {
    const parsed = assetFormSchema.safeParse({ ...validAsset, purchaseCost: 10_000_000 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.purchaseCost).toBe(10_000_000);
  });

  it("rejects purchase cost above ₹1 crore", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, purchaseCost: 10_000_001 }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...validAsset, purchaseCost: "10000001" }).success).toBe(false);
  });

  it("rejects a type that is only punctuation", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, type: "@#$%" }).success).toBe(false);
  });

  it("rejects Assigned status without an employee", () => {
    expect(
      assetFormSchema.safeParse({
        ...validAsset,
        status: "ASSIGNED",
        assignedTo: "",
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, status: "LOST" }).success).toBe(false);
  });

  it("rejects notes over the max length", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, notes: "x".repeat(501) }).success).toBe(false);
  });

  it("requires brand, model, serial, purchase date, and cost for all types", () => {
    const nonDevice = {
      name: "Office Chair",
      type: "Furniture",
      status: "AVAILABLE" as const,
      serialNumber: "CHAIR-1234",
      brand: "Herman",
      model: "Aeron",
      assignedTo: "",
      purchaseDate: "2025-10-15",
      purchaseCost: 45000,
      notes: "",
    };
    expect(assetFormSchema.safeParse(nonDevice).success).toBe(true);
    expect(assetFormSchema.safeParse({ ...nonDevice, brand: "" }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...nonDevice, model: "" }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...nonDevice, serialNumber: "" }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...nonDevice, purchaseDate: "" }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...nonDevice, purchaseCost: "" }).success).toBe(false);
  });

  it("accepts empty notes", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, notes: "" }).success).toBe(true);
  });
});

describe("assetCreateSchema", () => {
  it("accepts inventory fields without status or assignee", () => {
    expect(
      assetCreateSchema.safeParse({
        name: validAsset.name,
        type: validAsset.type,
        serialNumber: validAsset.serialNumber,
        brand: validAsset.brand,
        model: validAsset.model,
        purchaseDate: validAsset.purchaseDate,
        purchaseCost: validAsset.purchaseCost,
        notes: validAsset.notes,
      }).success,
    ).toBe(true);
  });

  it("strips status from create body — assignment is edit-only", () => {
    const result = assetCreateSchema.safeParse({
      name: validAsset.name,
      type: validAsset.type,
      serialNumber: validAsset.serialNumber,
      brand: validAsset.brand,
      model: validAsset.model,
      purchaseDate: validAsset.purchaseDate,
      purchaseCost: validAsset.purchaseCost,
      notes: validAsset.notes,
      status: "ASSIGNED",
      assignedTo: "user_1",
    } as Record<string, unknown>);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("status" in result.data).toBe(false);
      expect("assignedTo" in result.data).toBe(false);
    }
  });
});

describe("asset names are stored as typed (R2-CRUD-03)", () => {
  it.each(['QA-TEST <b>bold</b> & "quote" (1)/2', "Docking station (Gen 2)", "MacBook PRO"])(
    "keeps %s unchanged",
    (name) => {
      const parsed = assetFormSchema.safeParse({ ...validAsset, name });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.name).toBe(name);
    },
  );

  it("rejects control characters", () => {
    expect(assetFormSchema.safeParse({ ...validAsset, name: "Laptop\u0000" }).success).toBe(false);
  });
});

// ─── Device ─────────────────────────────────────────────────────────────────

const validDevice = {
  userId: "user_1",
  deviceType: "Laptop",
  deviceName: "MacBook Pro 14",
  serialNumber: "C02XL5678XYZ9",
  brand: "Apple",
  model: "M3 Pro",
  notes: "",
};

describe("deviceFormSchema", () => {
  it("accepts a fully valid device", () => {
    expect(deviceFormSchema.safeParse(validDevice).success).toBe(true);
  });

  it("requires an employee", () => {
    expect(deviceFormSchema.safeParse({ ...validDevice, userId: "" }).success).toBe(false);
  });

  it("requires brand, model, and serial number", () => {
    expect(deviceFormSchema.safeParse({ ...validDevice, brand: "" }).success).toBe(false);
    expect(deviceFormSchema.safeParse({ ...validDevice, model: "" }).success).toBe(false);
    expect(deviceFormSchema.safeParse({ ...validDevice, serialNumber: "" }).success).toBe(false);
    const { serialNumber: _omit, ...noSerial } = validDevice;
    expect(deviceFormSchema.safeParse(noSerial).success).toBe(false);
  });

  it("rejects a numeric-only device name", () => {
    expect(deviceFormSchema.safeParse({ ...validDevice, deviceName: "99999" }).success).toBe(false);
  });

  it("rejects a device name with control characters", () => {
    expect(deviceFormSchema.safeParse({ ...validDevice, deviceName: "lap\u0007top" }).success).toBe(false);
  });

  it('rejects a junk serial like "daf"', () => {
    expect(deviceFormSchema.safeParse({ ...validDevice, serialNumber: "daf" }).success).toBe(false);
  });

  it("rejects a numeric-only brand", () => {
    expect(deviceFormSchema.safeParse({ ...validDevice, brand: "12345" }).success).toBe(false);
  });

  it("uppercases the serial number on a valid device", () => {
    const parsed = deviceFormSchema.safeParse({ ...validDevice, serialNumber: "abc12345" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.serialNumber).toBe("ABC12345");
  });
});

describe("asset purchase date (R2-HR-10)", () => {
  it("rejects a purchase date after today, on create and on edit", () => {
    const [y, m, d] = getTodayString().split("-").map(Number);
    const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    const createBody = validAsset;
    expect(assetCreateSchema.safeParse({ ...createBody, purchaseDate: tomorrow }).success).toBe(false);
    expect(assetPatchSchema.safeParse({ purchaseDate: tomorrow }).success).toBe(false);
    expect(assetCreateSchema.safeParse({ ...createBody, purchaseDate: getTodayString() }).success).toBe(true);
  });
});
