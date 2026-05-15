/**
 * Standalone seed script — runs without the Next.js server.
 * Usage: npx tsx scripts/seed-design-knowledge.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileStore } from "../src/lib/memory/file-store.js";
import { LIBRARY_57B } from "../src/lib/memory/knowledge/57b-library.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

async function main() {
  const store = new FileStore({ layer: "L1", root: projectRoot });

  console.log("[seed] Starting 57B design knowledge seed...");
  console.log(`[seed] Project root: ${projectRoot}`);

  let created = 0;
  let skipped = 0;

  for (const record of LIBRARY_57B) {
    const existing = await store.list({ kind: "design-knowledge" });
    const alreadySeeded = existing.some(
      (r) =>
        r.tags.includes(`industry:${record.industry}`) &&
        r.tags.includes("source:57b-guidelines"),
    );

    if (alreadySeeded) {
      console.log(`[seed] SKIP  ${record.industry} (already exists)`);
      skipped++;
      continue;
    }

    const saved = await store.save({
      id: `DK-57b-${record.industry}`,
      layer: "L1",
      kind: "design-knowledge",
      title: record.title,
      body: record.body,
      tags: record.tags,
      source: "manual",
      refs: {},
      metrics: { score: 0.85, hits: 0 },
    });

    console.log(`[seed] CREATE ${record.industry} -> ${saved.id}`);
    created++;
  }

  console.log(`\n[seed] Done. created=${created} skipped=${skipped}`);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
