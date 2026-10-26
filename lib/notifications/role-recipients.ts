/** Members holding one of `roles`, minus anyone in `exclude` (the actor, the subject). */
export function roleRecipients<T extends { userId: string; role: string }>(
  members: readonly T[],
  roles: readonly string[],
  exclude: string | readonly string[] | undefined,
): T[] {
  const skip = new Set(typeof exclude === "string" ? [exclude] : exclude ?? []);
  return members.filter((m) => roles.includes(m.role) && !skip.has(m.userId));
}
