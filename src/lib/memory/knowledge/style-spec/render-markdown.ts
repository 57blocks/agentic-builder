/**
 * StyleSpec → compact Markdown.
 *
 * This is the version injected into DesignAgent prompts via recall. It must
 * be short, factual and easy for an LLM to consume as design tokens.
 */

import type { StyleSpec, StyleSpecColor } from "./types";

function colorRow(name: string, c?: StyleSpecColor): string {
  if (!c) return "";
  const label = c.label ? ` — ${c.label}` : "";
  return `- ${name}: \`${c.hex}\`${label}`;
}

export function renderStyleSpecMarkdown(spec: StyleSpec): string {
  const lines: string[] = [];

  lines.push(`**Industry**: ${spec.industry}`);
  lines.push(`**Image**: ${spec.imageName}`);
  if (spec.vibe.length) {
    lines.push(`**Vibe**: ${spec.vibe.join(", ")}`);
  }
  lines.push("");
  lines.push(`**Summary**: ${spec.summary}`);
  lines.push("");

  // ── Palette ─────────────────────────────────────────────────────────────
  lines.push("### Palette");
  const p = spec.palette;
  const paletteRows = [
    colorRow("Primary", p.primary),
    colorRow("Secondary", p.secondary),
    colorRow("Accent", p.accent),
    colorRow("Background", p.background),
    colorRow("Surface", p.surface),
    colorRow("Text", p.text),
    colorRow("Text muted", p.textMuted),
    colorRow("Border", p.border),
    colorRow("Success", p.success),
    colorRow("Warning", p.warning),
    colorRow("Danger", p.danger),
  ].filter(Boolean);
  lines.push(...paletteRows);
  lines.push("");

  // ── Typography ─────────────────────────────────────────────────────────
  lines.push("### Typography");
  const t = spec.typography;
  lines.push(`- Heading font: ${t.headingFont} (weight ${t.headingWeight})`);
  lines.push(`- Body font: ${t.bodyFont} (weight ${t.bodyWeight})`);
  if (t.monoFont) lines.push(`- Mono font: ${t.monoFont}`);
  lines.push(`- Base size: ${t.baseSizePx}px`);
  if (t.notes?.length) {
    for (const n of t.notes) lines.push(`- Note: ${n}`);
  }
  lines.push("");

  // ── Spacing & Radius ───────────────────────────────────────────────────
  lines.push("### Spacing & Radius");
  lines.push(
    `- Spacing base: ${spec.spacing.basePx}px; scale: ${spec.spacing.scalePx.join(", ")}`,
  );
  const r = spec.radius;
  const radiusParts = [
    `sm ${r.smPx}px`,
    `md ${r.mdPx}px`,
    `lg ${r.lgPx}px`,
    r.pillPx ? `pill ${r.pillPx}px` : null,
  ].filter(Boolean);
  lines.push(`- Radius: ${radiusParts.join(", ")}`);
  if (spec.shadows?.length) {
    lines.push(`- Shadows: ${spec.shadows.length} variant(s)`);
    for (const s of spec.shadows) lines.push(`  - \`${s}\``);
  }
  lines.push("");

  // ── Gradients ──────────────────────────────────────────────────────────
  if (spec.gradients?.length) {
    lines.push("### Gradients");
    for (const g of spec.gradients) {
      const head =
        g.type === "linear" && typeof g.angleDeg === "number"
          ? `- **${g.id}** (${g.type}, ${g.angleDeg}deg) — ${g.usage}`
          : `- **${g.id}** (${g.type}) — ${g.usage}`;
      lines.push(head);
      for (const stop of g.stops) {
        const alpha = typeof stop.opacity === "number" ? `, alpha ${stop.opacity}` : "";
        lines.push(
          `  - stop ${stop.positionPct}%: \`${stop.color}\`${alpha}`,
        );
      }
    }
    lines.push("");
  }

  // ── Surface effects ────────────────────────────────────────────────────
  if (spec.surfaceEffects?.length) {
    lines.push("### Surface Effects");
    for (const fx of spec.surfaceEffects) {
      lines.push(`- **${fx.name}**: ${fx.description}`);
      if (fx.cssHints?.length) {
        for (const hint of fx.cssHints) lines.push(`  - \`${hint}\``);
      }
    }
    lines.push("");
  }

  // ── State tokens ───────────────────────────────────────────────────────
  if (spec.stateTokens?.length) {
    lines.push("### Interaction State Tokens");
    for (const st of spec.stateTokens) {
      lines.push(`- **${st.component}.${st.state}**: ${st.treatment}`);
    }
    lines.push("");
  }

  // ── Components ─────────────────────────────────────────────────────────
  const comps = spec.components;
  const compEntries = Object.entries(comps).filter(([, v]) => v?.description);
  if (compEntries.length > 0) {
    lines.push("### Components");
    for (const [name, def] of compEntries) {
      lines.push(`- **${name}**: ${def!.description}`);
    }
    lines.push("");
  }

  // ── Layout ─────────────────────────────────────────────────────────────
  if (spec.layout) {
    lines.push("### Layout");
    lines.push(spec.layout);
    lines.push("");
  }

  // ── Visual elements ─────────────────────────────────────────────────────
  if (spec.visualElements?.length) {
    lines.push("### UI Elements");
    lines.push(
      "Named UI regions identified in the reference screenshot (col/row = 3×3 grid):",
    );
    for (const el of spec.visualElements) {
      lines.push(`- **${el.name}** — col ${el.col}, row ${el.row}${el.zoom ? `, zoom ${el.zoom}×` : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
