export function getPasswordStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  let level: "weak" | "fair" | "good" | "strong" = "weak";
  let color = "bg-red-500";
  if (passed >= 5) { level = "strong"; color = "bg-green-500"; }
  else if (passed >= 4) { level = "good"; color = "bg-blue-500"; }
  else if (passed >= 3) { level = "fair"; color = "bg-yellow-500"; }
  return { checks, passed, level, color, percentage: (passed / 5) * 100 };
}

export type PasswordStrength = ReturnType<typeof getPasswordStrength>;

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const PASSWORD_REQUIREMENTS = [
  { key: "length" as const, label: "8+ characters" },
  { key: "uppercase" as const, label: "Uppercase" },
  { key: "lowercase" as const, label: "Lowercase" },
  { key: "number" as const, label: "Number" },
  { key: "special" as const, label: "Special char" },
] as const;
