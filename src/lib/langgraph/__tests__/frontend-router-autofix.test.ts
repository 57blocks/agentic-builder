import { describe, expect, it } from "vitest";
import {
  detectRouterEntryExport,
  appImportsRouterModule,
  appIsScaffoldPlaceholder,
  buildRouterAppSource,
} from "../frontend-router-autofix";

const ORPHAN_ROUTER = `import { Route, Routes } from 'react-router-dom';
import PasswordCheckerPage from '@/views/PasswordCheckerPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<PasswordCheckerPage />} />
    </Routes>
  );
}
`;

const NAMED_ROUTER = `import { Routes, Route } from "react-router-dom";
export function AppRouter() {
  return <Routes><Route path="*" element={null} /></Routes>;
}
`;

const SCAFFOLD_APP = `import { Link, Route, Routes } from 'react-router-dom'
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}
function HomePage() {
  return <p>S-Tier · React + Vite</p>;
}
export default App
`;

describe("detectRouterEntryExport", () => {
  it("detects a default-exported router component", () => {
    expect(detectRouterEntryExport(ORPHAN_ROUTER)).toEqual({
      name: "AppRouter",
      isDefault: true,
    });
  });

  it("detects a named-exported router component", () => {
    expect(detectRouterEntryExport(NAMED_ROUTER)).toEqual({
      name: "AppRouter",
      isDefault: false,
    });
  });

  it("returns null when the module renders no <Routes>", () => {
    expect(
      detectRouterEntryExport(`export default function Nope() { return null; }`),
    ).toBeNull();
  });
});

describe("appImportsRouterModule", () => {
  it("is true when App imports the router module (with or without extension)", () => {
    expect(
      appImportsRouterModule(`import AppRouter from './router';`, "./router"),
    ).toBe(true);
    expect(
      appImportsRouterModule(`import AppRouter from "./router.tsx";`, "./router"),
    ).toBe(true);
  });

  it("is false when App does not import it", () => {
    expect(appImportsRouterModule(SCAFFOLD_APP, "./router")).toBe(false);
  });
});

describe("appIsScaffoldPlaceholder", () => {
  it("flags the scaffold marker", () => {
    expect(appIsScaffoldPlaceholder(SCAFFOLD_APP)).toBe(true);
  });

  it("flags an App that inlines its own <Routes>", () => {
    expect(
      appIsScaffoldPlaceholder(`function App(){return <Routes></Routes>}`),
    ).toBe(true);
  });

  it("leaves a custom App without inline routes alone", () => {
    expect(
      appIsScaffoldPlaceholder(`function App(){return <Dashboard/>}`),
    ).toBe(false);
  });
});

describe("buildRouterAppSource", () => {
  it("emits a default import + render", () => {
    const out = buildRouterAppSource(
      { name: "AppRouter", isDefault: true },
      "./router",
    );
    expect(out).toContain("import AppRouter from './router';");
    expect(out).toContain("return <AppRouter />;");
    expect(out).toContain("export default App;");
  });

  it("emits a named import for named exports", () => {
    const out = buildRouterAppSource(
      { name: "AppRouter", isDefault: false },
      "./router",
    );
    expect(out).toContain("import { AppRouter } from './router';");
  });
});
