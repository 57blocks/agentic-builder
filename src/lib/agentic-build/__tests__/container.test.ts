/**
 * Tests for ContainerBuildExecutor using an injected docker runner (no real
 * docker). Verifies start/stop lifecycle, that run() builds the correct
 * `docker exec ... bash -lc <cmd>` invocation and maps results, env passing,
 * unsafe-command rejection, and the run-before-start guard.
 */

import os from "os";
import path from "path";
import fs from "fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContainerBuildExecutor,
  type DockerRunner,
  type DockerExecResult,
} from "../sandbox/container";

function ok(stdout = ""): DockerExecResult {
  return { exitCode: 0, stdout, stderr: "", timedOut: false };
}

describe("ContainerBuildExecutor", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "cbe-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("start() runs `docker run -d` with the bind mount and socket", async () => {
    const calls: string[][] = [];
    const runner: DockerRunner = vi.fn(async (args) => {
      calls.push(args);
      return ok("containerid");
    });
    const ex = new ContainerBuildExecutor({ workspaceDir: dir, dockerRunner: runner });
    await ex.start();
    const runArgs = calls[0];
    expect(runArgs[0]).toBe("run");
    expect(runArgs).toContain("-d");
    expect(runArgs).toContain(`${path.resolve(dir)}:/workspace`);
    expect(runArgs).toContain("/var/run/docker.sock:/var/run/docker.sock");
    expect(runArgs.slice(-2)).toEqual(["sleep", "infinity"]);
  });

  it("run() execs `bash -lc <command>` in the container and maps the result", async () => {
    const calls: string[][] = [];
    const runner: DockerRunner = async (args) => {
      calls.push(args);
      if (args[0] === "run") return ok();
      // exec
      return { exitCode: 7, stdout: "out", stderr: "err", timedOut: false };
    };
    const ex = new ContainerBuildExecutor({
      workspaceDir: dir,
      containerName: "c1",
      dockerRunner: runner,
    });
    await ex.start();
    const res = await ex.run("pytest -q", { env: { FOO: "bar" } });
    const execArgs = calls[1];
    expect(execArgs[0]).toBe("exec");
    expect(execArgs).toContain("-e");
    expect(execArgs).toContain("FOO=bar");
    expect(execArgs.slice(-4)).toEqual(["c1", "bash", "-lc", "pytest -q"]);
    expect(res.exitCode).toBe(7);
    expect(res.output).toBe("outerr");
  });

  it("rejects unsafe commands without touching docker", async () => {
    const runner = vi.fn(async () => ok());
    const ex = new ContainerBuildExecutor({ workspaceDir: dir, dockerRunner: runner });
    await ex.start();
    runner.mockClear();
    const res = await ex.run("sudo rm -rf /");
    expect(res.exitCode).toBe(126);
    expect(runner).not.toHaveBeenCalled();
  });

  it("throws if run() is called before start()", async () => {
    const ex = new ContainerBuildExecutor({ workspaceDir: dir, dockerRunner: async () => ok() });
    await expect(ex.run("echo hi")).rejects.toThrow(/before start/);
  });

  it("file ops use the host bind-mounted fs", async () => {
    const ex = new ContainerBuildExecutor({ workspaceDir: dir, dockerRunner: async () => ok() });
    await ex.writeFile("src/a.txt", "hello");
    expect(await ex.readFile("src/a.txt")).toBe("hello");
    expect(await ex.listFiles()).toContain("src/a.txt");
    // Confirm it actually hit the real workspace dir.
    expect(await fs.readFile(path.join(dir, "src/a.txt"), "utf-8")).toBe("hello");
  });

  it("stop() force-removes the container", async () => {
    const calls: string[][] = [];
    const runner: DockerRunner = async (args) => {
      calls.push(args);
      return ok();
    };
    const ex = new ContainerBuildExecutor({ workspaceDir: dir, containerName: "c2", dockerRunner: runner });
    await ex.start();
    await ex.stop();
    expect(calls.some((a) => a[0] === "rm" && a.includes("-f") && a.includes("c2"))).toBe(true);
  });
});
