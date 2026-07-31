import { z } from "zod";
import { isOptionalPhoneValid } from "@/lib/phone";
import {
  collapseSpaces,
  hasMeaningfulContent,
  isAllowedName,
  NAME_ALLOWED_HINT,
} from "@/lib/validations/text-rules";

export const BRANCH_ADDRESS_MAX = 200;

const optionalTrimmed = z
  .string()
  .transform((v) => v.trim())
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

// City: letters, spaces, hyphens, apostrophes, dots — max 100
const CITY_REGEX = /^[\p{L}\s\-'.]+$/u;
export const branchCityField = z
  .string()
  .trim()
  .max(100, "City cannot exceed 100 characters")
  .refine((v) => !v || CITY_REGEX.test(v), "City can only contain letters, spaces, hyphens, apostrophes and dots")
  .refine((v) => !v || /[\p{L}]/u.test(v), "City must contain at least one letter")
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

// State: letters, numbers, spaces, hyphens, apostrophes, parentheses, ampersand — max 100
const STATE_REGEX = /^[\p{L}0-9\s\-'.()&]+$/u;
export const branchStateField = z
  .string()
  .trim()
  .max(100, "State cannot exceed 100 characters")
  .refine((v) => !v || STATE_REGEX.test(v), "State can only contain letters, numbers, spaces and common punctuation")
  .refine((v) => !v || /[\p{L}]/u.test(v), "State must contain at least one letter")
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const branchNameField = z
  .string()
  .trim()
  .min(2, "Branch name must be at least 2 characters")
  .max(100, "Branch name cannot exceed 100 characters")
  .regex(/^[A-Za-z0-9\s\-'.&]+$/, "Branch name contains invalid characters")
  .refine((v) => /[A-Za-z0-9]/.test(v), "Branch name must contain at least one letter or number");

export const branchCodeField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{2,20}$/, "Use 2–20 characters: A–Z, numbers, or hyphen only")
  .refine((v) => /[A-Z0-9]/.test(v), "Code must contain at least one letter or number");
export const branchPincodeField = optionalTrimmed.refine(
  (v) => !v || /^[A-Za-z0-9 -]{3,12}$/.test(v),
  { message: "Invalid pincode" },
);
export const branchPhoneField = optionalTrimmed.refine((v) => isOptionalPhoneValid(v), {
  message: "Invalid phone number",
});
export const branchEmailField = optionalTrimmed.refine(
  (v) => !v || z.string().email().safeParse(v).success,
  { message: "Invalid email" },
);

export const branchAddressField = z
  .string()
  .transform((v) => collapseSpaces(v.trim()))
  .refine((v) => v === "" || v.length <= BRANCH_ADDRESS_MAX, {
    message: `Address cannot exceed ${BRANCH_ADDRESS_MAX} characters`,
  })
  .refine((v) => v === "" || hasMeaningfulContent(v), {
    message: "Address must contain letters or numbers",
  })
  .refine((v) => v === "" || isAllowedName(v), {
    message: `Address can only contain ${NAME_ALLOWED_HINT}`,
  })
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const createBranchSchema = z.object({
  name: branchNameField,
  code: branchCodeField,
  city: branchCityField,
  state: branchStateField,
  country: optionalTrimmed,
  pincode: branchPincodeField,
  address: branchAddressField,
  phone: branchPhoneField,
  email: branchEmailField,
  branchManagerId: z.string().optional(),
  branchHrId: z.string().optional(),
});

export const updateBranchSchema = z.object({
  name: branchNameField.optional(),
  code: branchCodeField.optional(),
  city: branchCityField,
  state: branchStateField,
  country: optionalTrimmed,
  pincode: branchPincodeField,
  address: branchAddressField,
  phone: branchPhoneField,
  email: branchEmailField,
  branchManagerId: z.string().optional(),
  branchHrId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
