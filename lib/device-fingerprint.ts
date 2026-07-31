import { createHash } from "crypto";

export function getDeviceId(userAgent: string, ipAddress: string): string {
  return createHash("sha256")
    .update(`${userAgent}:${ipAddress}`)
    .digest("hex");
}
