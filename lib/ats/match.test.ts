import { describe, it, expect } from "vitest";

import { linkedinHandle } from "./match";

describe("linkedinHandle", () => {
  it("reads the same handle out of every way people paste the URL", () => {
    const urls = [
      "https://www.linkedin.com/in/asha-rao/",
      "http://linkedin.com/in/Asha-Rao",
      "linkedin.com/in/asha-rao?utm_source=share",
    ];
    expect(new Set(urls.map(linkedinHandle))).toEqual(new Set(["asha-rao"]));
  });

  it("ignores anything that is not a profile URL", () => {
    expect(linkedinHandle("https://example.com/asha")).toBeNull();
    expect(linkedinHandle(null)).toBeNull();
  });
});
