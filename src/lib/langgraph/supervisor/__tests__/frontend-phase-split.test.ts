import { describe, it, expect } from "vitest";
import {
  isFoundationTask,
  splitFrontendTasks,
  detectViewExport,
  viewImportSpecifier,
  validateConsolidatedRouter,
  type ViewModule,
} from "../frontend-phase-split";
import type { CodingTask } from "@/lib/pipeline/types";

function task(id: string, creates: string[], extra?: Partial<CodingTask>): CodingTask {
  return {
    id,
    title: id,
    description: "",
    phase: "Frontend",
    files: { creates, modifies: [], reads: [] },
    ...extra,
  } as CodingTask;
}

describe("isFoundationTask / splitFrontendTasks", () => {
  it("classifies shell/design-system tasks as foundation", () => {
    expect(isFoundationTask(task("f1", ["frontend/src/router.tsx", "frontend/src/context/AuthContext.tsx"]))).toBe(true);
    expect(isFoundationTask(task("f2", ["frontend/src/components/ui/Button.tsx"]))).toBe(true);
    expect(isFoundationTask(task("f3", ["frontend/src/components/layout/AppLayout.tsx"]))).toBe(true);
    expect(isFoundationTask(task("f4", ["frontend/src/styles/tokens.css"]))).toBe(true);
  });

  it("classifies view/page tasks as pages (even if they graze the shell)", () => {
    expect(isFoundationTask(task("p1", ["frontend/src/views/Dashboard.tsx"]))).toBe(false);
    // a task that creates a view is a page even if it also lists router
    expect(
      isFoundationTask(task("p2", ["frontend/src/views/Login.tsx", "frontend/src/router.tsx"])),
    ).toBe(false);
  });

  it("splits a mixed task list, preserving order", () => {
    const tasks = [
      task("f", ["frontend/src/router.tsx"]),
      task("a", ["frontend/src/views/A.tsx"]),
      task("b", ["frontend/src/pages/B.tsx"]),
      task("ui", ["frontend/src/components/ui/Card.tsx"]),
    ];
    const { foundation, pages } = splitFrontendTasks(tasks);
    expect(foundation.map((t) => t.id)).toEqual(["f", "ui"]);
    expect(pages.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("ignores tasks with no files", () => {
    expect(isFoundationTask(task("empty", []))).toBe(false);
  });
});

describe("detectViewExport", () => {
  it("detects default function exports", () => {
    expect(detectViewExport("export default function DashboardPage() {}")).toEqual({
      exportName: "DashboardPage",
      isDefault: true,
    });
  });
  it("detects default identifier exports", () => {
    expect(detectViewExport("const Login = () => {}; export default Login;")).toEqual({
      exportName: "Login",
      isDefault: true,
    });
  });
  it("detects named component exports", () => {
    expect(detectViewExport("export function SettingsView() {}")).toEqual({
      exportName: "SettingsView",
      isDefault: false,
    });
    expect(detectViewExport("export const ProfileView = () => null")).toEqual({
      exportName: "ProfileView",
      isDefault: false,
    });
  });
  it("returns null when no component export is found", () => {
    expect(detectViewExport("export const helper = 1")).toBeNull();
  });
});

describe("viewImportSpecifier", () => {
  it("maps a view path to an @/ import specifier without extension", () => {
    expect(viewImportSpecifier("frontend/src/views/Dashboard.tsx")).toBe("@/views/Dashboard");
    expect(viewImportSpecifier("frontend/src/pages/auth/Login.tsx")).toBe("@/pages/auth/Login");
  });
});

describe("validateConsolidatedRouter", () => {
  const views: ViewModule[] = [
    { file: "frontend/src/views/A.tsx", importPath: "@/views/A", exportName: "A", isDefault: true },
    { file: "frontend/src/views/B.tsx", importPath: "@/views/B", exportName: "B", isDefault: true },
  ];

  it("passes when every view is referenced, router wired, no placeholder", () => {
    const src = `import A from "@/views/A"; import B from "@/views/B";
      export default function AppRouter(){ return <BrowserRouter><Routes/></BrowserRouter> }`;
    const r = validateConsolidatedRouter(src, views);
    expect(r.ok).toBe(true);
    expect(r.missingViews).toEqual([]);
  });

  it("flags missing view imports", () => {
    const src = `import A from "@/views/A";
      export default function AppRouter(){ return <BrowserRouter><Routes/></BrowserRouter> }`;
    const r = validateConsolidatedRouter(src, views);
    expect(r.ok).toBe(false);
    expect(r.missingViews).toEqual(["@/views/B"]);
  });

  it("flags a scaffold <Result> placeholder", () => {
    const src = `import A from "@/views/A"; import B from "@/views/B";
      export default function AppRouter(){ return <Result status="404"/> }`;
    const r = validateConsolidatedRouter(src, views);
    expect(r.hasPlaceholder).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("flags a router that doesn't wire React Router", () => {
    const src = `import A from "@/views/A"; import B from "@/views/B"; export default function X(){ return null }`;
    const r = validateConsolidatedRouter(src, views);
    expect(r.wiresRouter).toBe(false);
    expect(r.ok).toBe(false);
  });

  it("accepts createBrowserRouter/RouterProvider style", () => {
    const src = `import A from "@/views/A"; import B from "@/views/B";
      const r = createBrowserRouter([]); export default () => <RouterProvider router={r}/>`;
    expect(validateConsolidatedRouter(src, views).wiresRouter).toBe(true);
  });
});
