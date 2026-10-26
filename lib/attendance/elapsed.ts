/**
 * Hours, minutes and seconds since `from`. Never negative: the server's
 * check-in time can be a moment ahead of the browser clock, which showed the
 * session timer as "-1:-1:-1" right after clocking in (FR1-029).
 */
export function elapsedHms(from: Date | string, now: Date): { hours: number; minutes: number; seconds: number } {
  const diffMs = Math.max(0, now.getTime() - new Date(from).getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
