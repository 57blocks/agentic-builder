/**
 * Tests for worker-startup-autofix — the pure transform that wires missing
 * `start*Worker` exports into `backend/src/server.ts`. Mirrors the testing
 * shape of `route-audit-autofix.test.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  computeWorkerImportPath,
  wireWorkerStartupsIntoServer,
} from "../worker-startup-autofix";

const SCAFFOLD_SERVER = `import "dotenv/config";
import { createApp } from './app';
import { PORT } from './config/env';
import { initDb } from './db';
import { syncModels } from './models';

const app = createApp();

async function start(): Promise<void> {
  await initDb();
  await syncModels();

  app.listen(PORT, () => {
    console.log(\`API server listening on http://localhost:\${PORT}\`);
  });
}

void start();
`;

const SERVER_WITH_SCORING = `import "dotenv/config";
import { createApp } from './app';
import { PORT } from './config/env';
import { initDb } from './db';
import { syncModels } from './models';
import { startScoringWorker } from './workers/scoringWorker';

const app = createApp();

async function start(): Promise<void> {
  await initDb();
  await syncModels();

  void startScoringWorker();

  app.listen(PORT, () => {
    console.log(\`API server listening on http://localhost:\${PORT}\`);
  });
}

void start();
`;

describe("wireWorkerStartupsIntoServer", () => {
  it("wires a single new worker into a bare scaffold server.ts", () => {
    const r = wireWorkerStartupsIntoServer(SCAFFOLD_SERVER, [
      {
        exportName: "startIngestionWorker",
        importPath: "./workers/ingestionWorker",
      },
    ]);
    expect(r.wired).toEqual(["startIngestionWorker"]);
    expect(r.skipped).toEqual([]);
    expect(r.content).toContain(
      `import { startIngestionWorker } from "./workers/ingestionWorker";`,
    );
    expect(r.content).toContain("await startIngestionWorker();");
  });

  it("places the call BEFORE `app.listen(...)`", () => {
    const r = wireWorkerStartupsIntoServer(SCAFFOLD_SERVER, [
      {
        exportName: "startScoringWorker",
        importPath: "./workers/scoringWorker",
      },
    ]);
    const callIdx = r.content.indexOf("startScoringWorker();");
    const listenIdx = r.content.indexOf("app.listen(");
    expect(callIdx).toBeGreaterThan(-1);
    expect(listenIdx).toBeGreaterThan(callIdx);
  });

  it("appends another worker when one is already wired (the exact 2026-05 stablecoin scenario)", () => {
    const r = wireWorkerStartupsIntoServer(SERVER_WITH_SCORING, [
      {
        exportName: "startScoringWorker",
        importPath: "./workers/scoringWorker",
      },
      {
        exportName: "startIngestionWorker",
        importPath: "./workers/ingestionWorker",
      },
    ]);
    expect(r.wired).toEqual(["startIngestionWorker"]);
    expect(r.skipped).toContainEqual({
      exportName: "startScoringWorker",
      reason: "already called in server.ts",
    });
    expect(r.content).toContain(
      `import { startIngestionWorker } from "./workers/ingestionWorker";`,
    );
    // Already-imported `startScoringWorker` must not be re-imported.
    const importMatches = r.content.match(
      /import \{ startScoringWorker \} from/g,
    );
    expect(importMatches?.length).toBe(1);
  });

  it("is idempotent — running twice produces the same output", () => {
    const once = wireWorkerStartupsIntoServer(SCAFFOLD_SERVER, [
      {
        exportName: "startIngestionWorker",
        importPath: "./workers/ingestionWorker",
      },
    ]);
    const twice = wireWorkerStartupsIntoServer(once.content, [
      {
        exportName: "startIngestionWorker",
        importPath: "./workers/ingestionWorker",
      },
    ]);
    expect(twice.wired).toEqual([]);
    expect(twice.skipped).toContainEqual({
      exportName: "startIngestionWorker",
      reason: "already called in server.ts",
    });
    expect(twice.content).toEqual(once.content);
  });

  it("rejects malformed export names without corrupting the file", () => {
    const r = wireWorkerStartupsIntoServer(SCAFFOLD_SERVER, [
      {
        exportName: "notAWorker",
        importPath: "./workers/notAWorker",
      },
    ]);
    expect(r.wired).toEqual([]);
    expect(r.skipped[0]?.reason).toMatch(/start<X>Worker pattern/);
    expect(r.content).toEqual(SCAFFOLD_SERVER);
  });

  it("uses `await` for the first worker and `void` for the rest by default", () => {
    const r = wireWorkerStartupsIntoServer(SCAFFOLD_SERVER, [
      {
        exportName: "startIngestionWorker",
        importPath: "./workers/ingestionWorker",
      },
      {
        exportName: "startScoringWorker",
        importPath: "./workers/scoringWorker",
      },
    ]);
    expect(r.content).toMatch(/await startIngestionWorker\(\);/);
    expect(r.content).toMatch(/void startScoringWorker\(\);/);
  });

  it("respects explicit invocation override", () => {
    const r = wireWorkerStartupsIntoServer(SCAFFOLD_SERVER, [
      {
        exportName: "startIngestionWorker",
        importPath: "./workers/ingestionWorker",
        invocation: "void",
      },
    ]);
    expect(r.content).toMatch(/void startIngestionWorker\(\);/);
    expect(r.content).not.toMatch(/await startIngestionWorker\(\);/);
  });

  it("returns early with no-op when given an empty registration list", () => {
    const r = wireWorkerStartupsIntoServer(SCAFFOLD_SERVER, []);
    expect(r.wired).toEqual([]);
    expect(r.skipped).toEqual([]);
    expect(r.content).toEqual(SCAFFOLD_SERVER);
  });

  it("preserves indentation by mirroring the indent of app.listen", () => {
    const indented = SCAFFOLD_SERVER.replace(
      /\n  app\.listen/,
      "\n    app.listen",
    ).replace(/^async function start/, "  async function start");
    const r = wireWorkerStartupsIntoServer(indented, [
      {
        exportName: "startIngestionWorker",
        importPath: "./workers/ingestionWorker",
      },
    ]);
    expect(r.content).toMatch(/\n    await startIngestionWorker\(\);/);
  });
});

describe("computeWorkerImportPath", () => {
  it("computes the canonical sibling-folder import", () => {
    expect(
      computeWorkerImportPath(
        "backend/src/server.ts",
        "backend/src/workers/ingestionWorker.ts",
      ),
    ).toBe("./workers/ingestionWorker");
  });

  it("strips .ts / .tsx extensions", () => {
    expect(
      computeWorkerImportPath(
        "backend/src/server.ts",
        "backend/src/workers/scoringWorker.tsx",
      ),
    ).toBe("./workers/scoringWorker");
  });

  it("handles nested worker folders", () => {
    expect(
      computeWorkerImportPath(
        "backend/src/server.ts",
        "backend/src/workers/ingestion/cron.ts",
      ),
    ).toBe("./workers/ingestion/cron");
  });
});
