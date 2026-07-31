
export function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function normalizeDeadlineDate(
  deadline: string | Date | null | undefined,
): string | null {
  if (deadline == null || deadline === "") return null;
  return String(deadline).slice(0, 10);
}

export function formatDeadlineDisplay(
  deadline: string | Date | null | undefined,
): string | null {
  const normalized = normalizeDeadlineDate(deadline);
  if (!normalized) return null;
  return new Date(`${normalized}T12:00:00+05:30`).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isApplicationDeadlinePassed(
  deadline: string | Date | null | undefined,
): boolean {
  const normalized = normalizeDeadlineDate(deadline);
  if (!normalized) return false;
  return normalized < getTodayIST();
}

export function canAcceptApplications(
  status: string | null | undefined,
  deadline: string | Date | null | undefined,
): boolean {
  return status === "OPEN" && !isApplicationDeadlinePassed(deadline);
}
