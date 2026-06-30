import { describe, it, expect } from "vitest";
import { urlToFileSlug } from "../_url-slug";

describe("urlToFileSlug", () => {
  it("slugs host + pathname, lowercased", () => {
    expect(urlToFileSlug("https://csma-demo2.vercel.app/family/dashboard"))
      .toBe("csma-demo2-vercel-app-family-dashboard");
  });
  it("same URL → same slug (in-place dedup), distinct URLs differ", () => {
    const a = urlToFileSlug("https://x.app/a");
    expect(urlToFileSlug("https://x.app/a")).toBe(a);
    expect(urlToFileSlug("https://x.app/b")).not.toBe(a);
  });
  it("unparseable input is slugged from the raw string", () => {
    expect(urlToFileSlug("not a url")).toBe("not-a-url");
  });
  it("empty/undefined → 'url-capture'", () => {
    expect(urlToFileSlug("")).toBe("url-capture");
    expect(urlToFileSlug(undefined)).toBe("url-capture");
  });
  it("caps length at 120 chars", () => {
    expect(urlToFileSlug("https://x.app/" + "a".repeat(500)).length).toBeLessThanOrEqual(120);
  });
});
