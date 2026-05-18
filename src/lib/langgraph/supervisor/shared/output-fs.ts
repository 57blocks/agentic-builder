import path from "path";
import fs from "fs/promises";

export async function pathExistsUnderOutput(
  outputDir: string,
  relPath: string,
): Promise<boolean> {
  try {
    await fs.stat(path.join(outputDir, relPath));
    return true;
  } catch {
    return false;
  }
}
