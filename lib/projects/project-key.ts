import { z } from "zod";

export const projectKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9]{1,9}$/, "Key must be 2 to 10 letters or digits and start with a letter");

export function suggestProjectKey(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "");
  const base = initials.replace(/^[0-9]+/, "").slice(0, 5);
  return base.length >= 2 ? base : "PRJ";
}

export function keyWithSuffix(base: string, n: number): string {
  const suffix = String(n);
  return `${base.slice(0, 10 - suffix.length)}${suffix}`;
}
