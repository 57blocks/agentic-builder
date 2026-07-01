import { describe, it, expect } from "vitest";
import {
  ensureAnchorNavWired,
  PROTOTYPE_ANCHOR_NAV_SOURCE,
} from "../prototype-anchor-nav";

const scaffoldMain = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { AppProviders } from "./providers/AppProviders.tsx";
import { AppRouter } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
`;

describe("ensureAnchorNavWired", () => {
  it("adds the import and renders <PrototypeAnchorNav /> inside BrowserRouter", () => {
    const out = ensureAnchorNavWired(scaffoldMain);
    expect(out).toContain(`import { PrototypeAnchorNav } from "./PrototypeAnchorNav";`);
    expect(out).toMatch(/<BrowserRouter>\s*\n\s*<PrototypeAnchorNav \/>/);
    // import lands after the existing imports, before the render call
    expect(out.indexOf("PrototypeAnchorNav")).toBeLessThan(out.indexOf("createRoot("));
  });

  it("is idempotent", () => {
    const once = ensureAnchorNavWired(scaffoldMain);
    expect(ensureAnchorNavWired(once)).toBe(once);
  });

  it("no-ops when there is no BrowserRouter to mount under", () => {
    const noRouter = `import { createRoot } from "react-dom/client";\ncreateRoot(el).render(<App />);\n`;
    expect(ensureAnchorNavWired(noRouter)).toBe(noRouter);
  });

  it("handles <BrowserRouter> with props", () => {
    const withProps = scaffoldMain.replace("<BrowserRouter>", `<BrowserRouter basename="/x">`);
    const out = ensureAnchorNavWired(withProps);
    expect(out).toMatch(/<BrowserRouter basename="\/x">\s*\n\s*<PrototypeAnchorNav \/>/);
  });

  it("the emitted component source is a valid named export using useNavigate", () => {
    expect(PROTOTYPE_ANCHOR_NAV_SOURCE).toContain("export function PrototypeAnchorNav()");
    expect(PROTOTYPE_ANCHOR_NAV_SOURCE).toContain("useNavigate");
  });
});
