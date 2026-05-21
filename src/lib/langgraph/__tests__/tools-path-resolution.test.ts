/**
 * Guards P2-A: absolute paths inside outputDir are relativized so workers
 * that paste paths from `find` / `ls` don't get spurious FILE_NOT_FOUND.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fsRead, fsWrite, listFiles } from "../tools";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tools-path-test-"));
  await fs.writeFile(path.join(tmpDir, "hello.txt"), "hello", "utf-8");
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("fsRead accepts absolute paths inside outputDir", () => {
  it("reads an absolute path that resolves inside outputDir", async () => {
    const abs = path.join(tmpDir, "hello.txt");
    const result = await fsRead(abs, tmpDir);
    expect(result).toBe("hello");
  });

  it("still rejects absolute paths outside outputDir with a clear message", async () => {
    const result = await fsRead("/etc/passwd", tmpDir);
    expect(result).toMatch(/outside the project root/i);
  });

  it("returns FILE_NOT_FOUND with relative path for absolute-but-missing files", async () => {
    const abs = path.join(tmpDir, "nope.txt");
    const result = await fsRead(abs, tmpDir);
    expect(result).toMatch(/^FILE_NOT_FOUND: nope\.txt/);
  });
});

describe("fsWrite accepts absolute paths inside outputDir", () => {
  it("writes via absolute path resolving inside outputDir", async () => {
    const abs = path.join(tmpDir, "sub", "file.txt");
    const result = await fsWrite(abs, "payload", tmpDir);
    expect(result).toMatch(/^Written: sub\/file\.txt/);
    const onDisk = await fs.readFile(abs, "utf-8");
    expect(onDisk).toBe("payload");
  });

  it("rejects absolute paths outside outputDir", async () => {
    const result = await fsWrite("/tmp/escape.txt", "x", tmpDir);
    expect(result).toMatch(/outside the project root/i);
  });
});

describe("listFiles accepts absolute paths inside outputDir", () => {
  it("lists files when given an absolute directory inside outputDir", async () => {
    await fs.writeFile(path.join(tmpDir, "a.txt"), "", "utf-8");
    const result = await listFiles(tmpDir, tmpDir);
    expect(result).toContain("hello.txt");
    expect(result).toContain("a.txt");
  });
});
