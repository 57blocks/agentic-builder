import fs from "node:fs";
import path from "node:path";
import { DEFAULT_TOKENS } from "../src/lib/design/tokens";
import { renderTokensCss } from "../src/lib/design/render-tokens-css";

const css = renderTokensCss(DEFAULT_TOKENS);
const targets = [
  "scaffolds/m-tier/frontend/src/styles/tokens.css",
  "scaffolds/l-tier/frontend/src/styles/tokens.css",
  "scaffolds/s-tier/src/styles/tokens.css",
];
for (const rel of targets) {
  const abs = path.resolve(process.cwd(), rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, css, "utf-8");
  console.log("wrote", rel);
}
