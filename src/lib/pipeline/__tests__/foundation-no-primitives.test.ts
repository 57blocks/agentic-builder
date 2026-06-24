import { describe, it, expect } from "vitest";
import { ensureFrontendFoundationTask } from "../frontend-foundation-task";

function allCreates(tasks: unknown[]): string[] {
  return tasks.flatMap((t: any) =>
    Array.isArray(t.files) ? t.files : (t.files?.creates ?? []),
  );
}

describe("Foundation 不再创建手写 primitives", () => {
  const tasks = [
    {
      id: "T-1",
      title: "home view",
      files: {
        creates: ["frontend/src/views/Home.tsx"],
        reads: [],
        modifies: [],
      },
    },
  ] as any;
  const out = ensureFrontendFoundationTask(tasks);
  const creates = allCreates(out);

  it("creates 不含 PascalCase 手写 primitives", () => {
    expect(creates).not.toContain("frontend/src/components/ui/Button.tsx");
    expect(creates).not.toContain("frontend/src/components/ui/Card.tsx");
    expect(creates).not.toContain("frontend/src/components/ui/Input.tsx");
  });

  it("creates 不含 ui barrel(脚手架已预装)", () => {
    expect(creates).not.toContain("frontend/src/components/ui/index.ts");
  });

  it("仍创建 tokens 与 shell 锚点", () => {
    expect(creates).toContain("frontend/src/styles/tokens.css");
    expect(creates).toContain("frontend/src/router.tsx");
  });

  it("页面任务仍被接线为 READ ui barrel", () => {
    const home = out.find((t: any) => (t.title ?? "").includes("home"));
    const reads = (home as any)?.files?.reads ?? [];
    expect(reads).toContain("frontend/src/components/ui/index.ts");
  });
});
