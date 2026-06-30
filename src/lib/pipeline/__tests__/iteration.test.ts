import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import {
  startIteration,
  finishIteration,
  readIterations,
} from "../iteration";

describe("iteration ledger + git versioning", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "iteration-"));
    await fs.writeFile(path.join(dir, "index.js"), "console.log(1)\n", "utf-8");
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("startIteration inits git, commits a baseline, records a running iteration", async () => {
    const iter = await startIteration(dir, { prd: "add feature X" });
    expect(iter.index).toBe(1);
    expect(iter.status).toBe("running");
    expect(iter.baseGitRef).toMatch(/^[0-9a-f]{7,40}$/);
    // .git was created and the ledger persisted.
    await expect(fs.access(path.join(dir, ".git"))).resolves.toBeUndefined();
    const led = await readIterations(dir);
    expect(led).toHaveLength(1);
    expect(led[0].prd).toBe("add feature X");
  });

  it("finishIteration commits the result and marks it done", async () => {
    const iter = await startIteration(dir);
    // Simulate the iteration's coding output.
    await fs.writeFile(
      path.join(dir, "feature.js"),
      "export const x = 1\n",
      "utf-8",
    );
    await finishIteration(dir, iter.index, { taskIds: ["t1", "t2"] });
    const led = await readIterations(dir);
    expect(led[0].status).toBe("done");
    expect(led[0].resultGitRef).toMatch(/^[0-9a-f]{7,40}$/);
    expect(led[0].resultGitRef).not.toBe(led[0].baseGitRef);
    expect(led[0].taskIds).toEqual(["t1", "t2"]);
  });

  it("a second startIteration increments the index", async () => {
    await startIteration(dir);
    await finishIteration(dir, 1);
    const second = await startIteration(dir, { prd: "iteration 2" });
    expect(second.index).toBe(2);
    expect(await readIterations(dir)).toHaveLength(2);
  });
});
