import { toneBar } from "@/lib/design/tones";
import { PASSWORD_RULES, passwordChecks } from "@/lib/utils/password-validation";

export function getPasswordStrength(password: string) {
  const checks = passwordChecks(password);
  const passed = Object.values(checks).filter(Boolean).length;
  let level: "weak" | "fair" | "good" | "strong" = "weak";
  let color: string = toneBar.danger;
  if (passed >= 5) { level = "strong"; color = toneBar.success; }
  else if (passed >= 4) { level = "good"; color = toneBar.info; }
  else if (passed >= 3) { level = "fair"; color = toneBar.warning; }
  return { checks, passed, level, color, percentage: (passed / 5) * 100 };
}

export type PasswordStrength = ReturnType<typeof getPasswordStrength>;

export { PASSWORD_REGEX } from "@/lib/utils/password-validation";

export const PASSWORD_REQUIREMENTS = [
  { key: "length" as const, label: `${PASSWORD_RULES.minLength}+ characters` },
  { key: "uppercase" as const, label: "Uppercase" },
  { key: "lowercase" as const, label: "Lowercase" },
  { key: "number" as const, label: "Number" },
  { key: "special" as const, label: "One symbol" },
] as const;
