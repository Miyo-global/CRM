import { describe, expect, it } from "vitest";

import {
  AUDIO_CAP,
  checkMediaEnvelope,
  DOC_CAP,
  IMAGE_CAP,
  mediaRuleFor,
  VIDEO_CAP,
} from "./media";

describe("mediaRuleFor", () => {
  it("knows each family and its cap", () => {
    expect(mediaRuleFor("image/png")).toEqual({ kind: "image", cap: IMAGE_CAP });
    expect(mediaRuleFor("video/mp4")).toEqual({ kind: "video", cap: VIDEO_CAP });
    expect(mediaRuleFor("audio/mpeg")).toEqual({ kind: "audio", cap: AUDIO_CAP });
    expect(mediaRuleFor("application/pdf")).toEqual({ kind: "document", cap: DOC_CAP });
  });

  it("refuses anything else, executables included", () => {
    for (const type of ["application/x-msdownload", "image/svg+xml", "", "text/html"]) {
      expect(mediaRuleFor(type), type).toBeNull();
    }
  });
});

describe("checkMediaEnvelope", () => {
  it("accepts a normal image", () => {
    expect(checkMediaEnvelope("image/png", 2_000_000)).toMatchObject({
      rule: { kind: "image" },
    });
  });

  it("rejects an unsupported type with 400", () => {
    expect(checkMediaEnvelope("application/x-msdownload", 10)).toMatchObject({
      rejection: { status: 400, code: "unsupported_type" },
    });
  });

  it("rejects an 11 MB image with 413 and says the cap", () => {
    const result = checkMediaEnvelope("image/png", 11 * 1024 * 1024);
    expect(result).toMatchObject({ rejection: { status: 413, code: "too_large" } });
    expect("rejection" in result && result.rejection.message).toContain("10 MB");
  });

  it("allows a video far past the image cap", () => {
    expect(checkMediaEnvelope("video/mp4", 50 * 1024 * 1024)).toMatchObject({
      rule: { kind: "video" },
    });
  });

  it("rejects an empty file", () => {
    expect(checkMediaEnvelope("image/png", 0)).toMatchObject({
      rejection: { code: "content_mismatch" },
    });
  });
});
