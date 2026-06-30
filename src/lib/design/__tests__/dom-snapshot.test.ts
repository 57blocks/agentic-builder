import { describe, it, expect } from "vitest";
import { buildSelfContainedHtml } from "../dom-snapshot";

const base = "https://demo.app/family/dashboard";

describe("buildSelfContainedHtml", () => {
  it("strips inline and external <script> tags", () => {
    const out = buildSelfContainedHtml({
      outerHTML: `<html><head></head><body><script>alert(1)</script><script src="/a.js"></script><p>hi</p></body></html>`,
      stylesheets: [],
      baseUrl: base,
    });
    expect(out).not.toContain("<script");
    expect(out).toContain("<p>hi</p>");
  });

  it("inlines stylesheets into a single <style> before </head>", () => {
    const out = buildSelfContainedHtml({
      outerHTML: `<html><head><title>t</title></head><body></body></html>`,
      stylesheets: [":root{--a:1}", ".x{color:red}"],
      baseUrl: base,
    });
    expect(out).toMatch(/<style[^>]*>[\s\S]*:root\{--a:1\}[\s\S]*\.x\{color:red\}[\s\S]*<\/style>\s*<\/head>/);
  });

  it("absolutises relative src/href like the browser, leaves absolute and data: intact", () => {
    const out = buildSelfContainedHtml({
      outerHTML: `<img src="/img/a.png"><a href="../x">x</a><img src="./b.png"><img src="https://cdn.app/b.png"><img src="data:image/png;base64,AA">`,
      stylesheets: [],
      baseUrl: base, // https://demo.app/family/dashboard
    });
    expect(out).toContain(`src="https://demo.app/img/a.png"`); // root-relative
    expect(out).toContain(`href="https://demo.app/x"`); // ../x from /family/ → /x (browser semantics)
    expect(out).toContain(`src="https://demo.app/family/b.png"`); // ./b.png → sibling of dashboard
    expect(out).toContain(`src="https://cdn.app/b.png"`); // absolute untouched
    expect(out).toContain(`src="data:image/png;base64,AA"`); // data: untouched
  });

  it("emits no <style> tag when there are no stylesheets", () => {
    const out = buildSelfContainedHtml({
      outerHTML: `<html><head></head><body></body></html>`,
      stylesheets: [],
      baseUrl: base,
    });
    expect(out).not.toContain("<style");
  });
});
