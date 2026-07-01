import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { listScaffoldUiComponents } from "../scaffold-ui-components";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "ui-comp-"));
  await fs.mkdir(path.join(dir, "src", "components", "ui"), { recursive: true });
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("listScaffoldUiComponents", () => {
  it("returns sorted component module names, excluding the barrel index", async () => {
    const uiDir = path.join(dir, "src", "components", "ui");
    for (const f of ["button.tsx", "card.tsx", "badge.tsx", "index.ts"]) {
      await fs.writeFile(path.join(uiDir, f), "", "utf-8");
    }
    expect(await listScaffoldUiComponents(dir)).toEqual(["badge", "button", "card"]);
  });

  it("returns [] when the ui directory does not exist", async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), "no-ui-"));
    expect(await listScaffoldUiComponents(empty)).toEqual([]);
    await fs.rm(empty, { recursive: true, force: true });
  });
});
