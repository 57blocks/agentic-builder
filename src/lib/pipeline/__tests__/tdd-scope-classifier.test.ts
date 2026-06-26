import { describe, it, expect } from "vitest";
import { classifyTddScope } from "../tdd-manifest";

describe("classifyTddScope (conservative local/integration split)", () => {
  const created = [
    "backend/src/utils/timeSlotValidation.ts",
    "backend/src/utils/scheduleOverlapCalculator.ts",
  ];

  it("promotes a pure unit test that targets only task-created files", () => {
    const scope = classifyTddScope(
      {
        type: "unit",
        targetFiles: ["backend/src/utils/timeSlotValidation.ts"],
        command: "cd backend && pnpm test timeSlotValidation.test.ts",
        file: "backend/src/utils/timeSlotValidation.test.ts",
      },
      created,
    );
    expect(scope).toBe("local");
  });

  it("promotes a util test (single-file command via basename)", () => {
    const scope = classifyTddScope(
      {
        type: "util",
        targetFiles: ["backend/src/utils/scheduleOverlapCalculator.ts"],
        command: "pnpm test scheduleOverlapCalculator.test.ts",
        file: "backend/src/utils/scheduleOverlapCalculator.test.ts",
      },
      created,
    );
    expect(scope).toBe("local");
  });

  it("keeps route-smoke tests as integration", () => {
    const scope = classifyTddScope(
      {
        type: "route-smoke",
        targetFiles: ["backend/src/utils/timeSlotValidation.ts"],
        command: "cd backend && pnpm test work-hours.routes.test.ts",
        file: "backend/src/api/modules/teacher/work-hours.routes.test.ts",
      },
      created,
    );
    expect(scope).toBe("integration");
  });

  it("keeps api-contract / frontend-service / e2e as integration", () => {
    for (const type of ["api-contract", "frontend-service", "e2e", "runtime-smoke"]) {
      const scope = classifyTddScope(
        {
          type,
          targetFiles: ["backend/src/utils/timeSlotValidation.ts"],
          command: "pnpm test timeSlotValidation.test.ts",
          file: "x.test.ts",
        },
        created,
      );
      expect(scope, `type=${type}`).toBe("integration");
    }
  });

  it("falls back to integration when a target is NOT task-created", () => {
    const scope = classifyTddScope(
      {
        type: "unit",
        targetFiles: [
          "backend/src/utils/timeSlotValidation.ts",
          "backend/src/models/User.ts", // not in `created`
        ],
        command: "pnpm test timeSlotValidation.test.ts",
        file: "backend/src/utils/timeSlotValidation.test.ts",
      },
      created,
    );
    expect(scope).toBe("integration");
  });

  it("falls back to integration when a target is an assembly file", () => {
    const scope = classifyTddScope(
      {
        type: "unit",
        targetFiles: ["backend/src/api/modules/index.ts"],
        command: "pnpm test index.test.ts",
        file: "backend/src/api/modules/index.test.ts",
      },
      ["backend/src/api/modules/index.ts"],
    );
    expect(scope).toBe("integration");
  });

  it("falls back to integration when the command runs the whole suite", () => {
    const scope = classifyTddScope(
      {
        type: "unit",
        targetFiles: ["backend/src/utils/timeSlotValidation.ts"],
        command: "cd backend && pnpm test", // no file → whole suite
        file: "backend/src/utils/timeSlotValidation.test.ts",
      },
      created,
    );
    expect(scope).toBe("integration");
  });

  it("falls back to integration when there are no target files", () => {
    const scope = classifyTddScope(
      {
        type: "unit",
        targetFiles: [],
        command: "pnpm test x.test.ts",
        file: "x.test.ts",
      },
      created,
    );
    expect(scope).toBe("integration");
  });

  it("falls back to integration for an unknown/empty type", () => {
    const scope = classifyTddScope(
      {
        type: undefined,
        targetFiles: ["backend/src/utils/timeSlotValidation.ts"],
        command: "pnpm test timeSlotValidation.test.ts",
        file: "backend/src/utils/timeSlotValidation.test.ts",
      },
      created,
    );
    expect(scope).toBe("integration");
  });
});
