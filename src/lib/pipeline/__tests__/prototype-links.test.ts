import { describe, it, expect } from "vitest";
import {
  toReactRouterPath,
  deriveDemoOrigin,
  relativizeDemoHrefs,
  rewriteNextImageUrls,
} from "../prototype-links";
import type { DesignReferenceEntry } from "@/lib/pipeline/design-references";

describe("toReactRouterPath", () => {
  it("converts {param} and [param] to :param", () => {
    expect(toReactRouterPath("/en/programs/{program}/{courseId}")).toBe("/en/programs/:program/:courseId");
    expect(toReactRouterPath("/blog/[slug]")).toBe("/blog/:slug");
  });
  it("leaves static routes unchanged", () => {
    expect(toReactRouterPath("/en/about-us")).toBe("/en/about-us");
  });
});

describe("deriveDemoOrigin", () => {
  const ref = (over: Partial<DesignReferenceEntry>): DesignReferenceEntry => ({
    id: "x", fileName: "p.html", storedFileName: "x.html", mime: "text/html", bytes: 1,
    kind: "html", label: "", pageHint: "PAGE-001", uploadedAt: "t", source: "url", matchedBy: "auto", ...over,
  });
  it("derives origin from a url-sourced label", () => {
    expect(deriveDemoOrigin([ref({ label: "https://x-school.org/en/programs/aio" })])).toBe("https://x-school.org");
  });
  it("returns '' when no url source", () => {
    expect(deriveDemoOrigin([ref({ source: "upload", label: "" })])).toBe("");
  });
});

describe("relativizeDemoHrefs", () => {
  const origin = "https://x-school.org";
  it("strips the demo origin from href, keeping the path", () => {
    const tsx = `<a href="https://x-school.org/en/programs/aio">x</a>`;
    expect(relativizeDemoHrefs(tsx, origin)).toBe(`<a href="/en/programs/aio">x</a>`);
  });
  it("maps a bare demo origin href to /", () => {
    expect(relativizeDemoHrefs(`<a href="https://x-school.org">home</a>`, origin)).toBe(`<a href="/">home</a>`);
  });
  it("does NOT touch src (images keep loading from the demo)", () => {
    const tsx = `<img src="https://x-school.org/_next/image?url=%2Fa.png&w=750" />`;
    expect(relativizeDemoHrefs(tsx, origin)).toBe(tsx);
  });
  it("leaves genuinely external hrefs (other origins) alone", () => {
    const tsx = `<a href="https://twitter.com/x">t</a>`;
    expect(relativizeDemoHrefs(tsx, origin)).toBe(tsx);
  });
  it("no-ops when origin is empty", () => {
    const tsx = `<a href="https://x-school.org/en">x</a>`;
    expect(relativizeDemoHrefs(tsx, "")).toBe(tsx);
  });
});

describe("rewriteNextImageUrls", () => {
  const origin = "https://x-school.org";
  it("unwraps an absolute _next/image src to the direct asset", () => {
    const tsx = `<img src="https://x-school.org/_next/image?url=%2Fassets%2Fimages%2Fhero.png&w=750&q=75" />`;
    expect(rewriteNextImageUrls(tsx, origin)).toBe(`<img src="https://x-school.org/assets/images/hero.png" />`);
  });
  it("unwraps a RELATIVE _next/image (srcSet) to an absolute direct asset", () => {
    const tsx = `<img srcSet="/_next/image?url=%2Fassets%2Fhero.png&w=384&q=75 1x, /_next/image?url=%2Fassets%2Fhero.png&w=750&q=75 2x" />`;
    expect(rewriteNextImageUrls(tsx, origin)).toBe(
      `<img srcSet="https://x-school.org/assets/hero.png 1x, https://x-school.org/assets/hero.png 2x" />`,
    );
  });
  it("preserves an already-absolute url param", () => {
    const tsx = `<img src="/_next/image?url=https%3A%2F%2Fcdn.example%2Fa.png&w=750&q=75" />`;
    expect(rewriteNextImageUrls(tsx, origin)).toBe(`<img src="https://cdn.example/a.png" />`);
  });
  it("leaves non-_next image URLs untouched", () => {
    const tsx = `<img src="https://x-school.org/assets/logo-light.svg" />`;
    expect(rewriteNextImageUrls(tsx, origin)).toBe(tsx);
  });
});
