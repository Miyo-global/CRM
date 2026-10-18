import { describe, expect, it } from "vitest";

import {
  canPublishPublicly,
  DEFAULT_VERIFIED_WINDOW_DAYS,
  trustStateAt,
  verifiedUntil,
} from "./page-status";

const day = 24 * 60 * 60 * 1000;

describe("verifiedUntil", () => {
  const now = new Date("2026-10-18T00:00:00Z");

  it("uses the page's own review interval", () => {
    expect(verifiedUntil(now, 30).getTime()).toBe(now.getTime() + 30 * day);
  });

  it("falls back to 180 days", () => {
    expect(verifiedUntil(now, null).getTime()).toBe(
      now.getTime() + DEFAULT_VERIFIED_WINDOW_DAYS * day,
    );
    expect(verifiedUntil(now, 0).getTime()).toBe(
      now.getTime() + DEFAULT_VERIFIED_WINDOW_DAYS * day,
    );
  });
});

describe("trustStateAt", () => {
  const now = new Date("2026-10-18T00:00:00Z");

  it("expires a verification whose window has passed", () => {
    expect(trustStateAt("verified", new Date(now.getTime() - day), now)).toBe(
      "verification_expired",
    );
  });

  it("keeps a verification inside its window", () => {
    expect(trustStateAt("verified", new Date(now.getTime() + day), now)).toBe("verified");
  });

  it("leaves the other states alone", () => {
    expect(trustStateAt("unverified", null, now)).toBe("unverified");
    expect(trustStateAt("verification_expired", null, now)).toBe("verification_expired");
  });
});

describe("canPublishPublicly", () => {
  const base = {
    isKbAdmin: false,
    permissions: [] as string[],
    spaceRole: null as string | null,
    publicSharingEnabled: true,
  };

  it("needs the org flag, whoever is asking", () => {
    expect(canPublishPublicly({ ...base, isKbAdmin: true, publicSharingEnabled: false })).toBe(
      false,
    );
  });

  it("allows an org admin, kb:pages:manage, a publisher and a space admin", () => {
    expect(canPublishPublicly({ ...base, isKbAdmin: true })).toBe(true);
    expect(canPublishPublicly({ ...base, permissions: ["kb:pages:manage"] })).toBe(true);
    expect(canPublishPublicly({ ...base, spaceRole: "publisher" })).toBe(true);
    expect(canPublishPublicly({ ...base, spaceRole: "admin" })).toBe(true);
  });

  it("refuses an ordinary editor", () => {
    expect(canPublishPublicly({ ...base, spaceRole: "editor" })).toBe(false);
  });
});
