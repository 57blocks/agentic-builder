import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  addDesignReference,
  updateDesignReference,
  readManifest,
  autoMatchReferencesToPages,
} from "../pipeline/design-references";

let tmpDir: string;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "design-refs-test-"));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const fakePng = Buffer.from("fake-png");

describe("addDesignReference — new fields", () => {
  it("writes source=upload and matchedBy=auto", async () => {
    const r = await addDesignReference(tmpDir, {
      fileName: "a.png", mime: "image/png", bytes: fakePng,
      source: "upload", matchedBy: "auto",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.source).toBe("upload");
    expect(r.entry.matchedBy).toBe("auto");
    expect(r.entry.matchConfidence).toBeUndefined();
    expect(r.entry.cssToken).toBeUndefined();
  });

  it("writes source=url with cssToken", async () => {
    const r = await addDesignReference(tmpDir, {
      fileName: "shot.png", mime: "image/png", bytes: fakePng,
      source: "url", matchedBy: "manual",
      cssToken: { "--color-primary": "#3b82f6" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.source).toBe("url");
    expect(r.entry.cssToken).toEqual({ "--color-primary": "#3b82f6" });
  });

  it("defaults source=upload matchedBy=auto when omitted", async () => {
    const r = await addDesignReference(tmpDir, {
      fileName: "b.png", mime: "image/png", bytes: fakePng,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.source).toBe("upload");
    expect(r.entry.matchedBy).toBe("auto");
  });
});

describe("updateDesignReference — new fields", () => {
  it("can set pageHint, matchedBy, matchConfidence together", async () => {
    const add = await addDesignReference(tmpDir, {
      fileName: "c.png", mime: "image/png", bytes: fakePng,
      source: "upload", matchedBy: "auto",
    });
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    const updated = await updateDesignReference(tmpDir, add.entry.id, {
      pageHint: "PAGE-001",
      matchedBy: "auto",
      matchConfidence: "high",
    });
    expect(updated?.pageHint).toBe("PAGE-001");
    expect(updated?.matchedBy).toBe("auto");
    expect(updated?.matchConfidence).toBe("high");
  });

  it("can overwrite matchedBy from auto to manual (clears matchConfidence)", async () => {
    const add = await addDesignReference(tmpDir, {
      fileName: "d.png", mime: "image/png", bytes: fakePng,
      source: "upload", matchedBy: "auto",
    });
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    await updateDesignReference(tmpDir, add.entry.id, {
      pageHint: "PAGE-001", matchedBy: "auto", matchConfidence: "medium",
    });
    const u2 = await updateDesignReference(tmpDir, add.entry.id, {
      matchedBy: "manual",
      matchConfidence: null,
    });
    expect(u2?.matchedBy).toBe("manual");
    expect(u2?.matchConfidence).toBeUndefined();
  });
});

describe("autoMatchReferencesToPages — manual skip", () => {
  it("excludes manual entries from match candidates even with force=true", async () => {
    const r = await addDesignReference(tmpDir, {
      fileName: "manual.png", mime: "image/png", bytes: fakePng,
      source: "upload", matchedBy: "manual", pageHint: "PAGE-001",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // Should return empty — the only entry is manual and gets filtered out
    // (no OPENROUTER_API_KEY needed because the function exits early when imageEntries is empty)
    const results = await autoMatchReferencesToPages(
      tmpDir,
      [{ id: "PAGE-001", name: "Dashboard" }],
      { force: true },
    );

    const manualEntry = results.find((res) => res.referenceId === r.entry.id);
    expect(manualEntry).toBeUndefined();
    expect(results).toHaveLength(0);
  });
});
