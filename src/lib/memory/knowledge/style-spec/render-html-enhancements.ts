/**
 * HTML sections for advanced style signals (gradients/material/state tokens).
 */
import type {
  StyleSpecGradient,
  StyleSpecStateToken,
  StyleSpecSurfaceEffect,
} from "./types";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.trim().toLowerCase();
  const m = clean.match(/^#([0-9a-f]{6})$/);
  if (!m) return hex;
  const n = m[1];
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function gradientBackground(g: StyleSpecGradient): string {
  const sorted = [...g.stops].sort((a, b) => a.positionPct - b.positionPct);
  const stops = sorted
    .map((s) => {
      const alpha = typeof s.opacity === "number" ? Math.max(0, Math.min(1, s.opacity)) : 1;
      const color = alpha < 1 ? hexToRgba(s.color, alpha) : s.color;
      return `${color} ${s.positionPct}%`;
    })
    .join(", ");
  if (g.type === "radial") return `radial-gradient(circle at center, ${stops})`;
  return `linear-gradient(${g.angleDeg ?? 135}deg, ${stops})`;
}

function gradientStopText(g: StyleSpecGradient): string {
  return g.stops
    .sort((a, b) => a.positionPct - b.positionPct)
    .map((s) => `${s.positionPct}% ${s.color}${typeof s.opacity === "number" ? ` @${s.opacity}` : ""}`)
    .join("  |  ");
}

export function renderGradientCards(gradients: StyleSpecGradient[] | undefined): string {
  if (!gradients?.length) return "";
  return gradients
    .slice(0, 6)
    .map((g) => {
      const head =
        g.type === "linear" && typeof g.angleDeg === "number"
          ? `${g.type} ${g.angleDeg}deg`
          : g.type;
      return `
      <article class="signal-card">
        <div class="signal-preview" style="background:${esc(gradientBackground(g))};"></div>
        <div class="signal-title">${esc(g.id)}</div>
        <div class="signal-meta">${esc(head)} · ${esc(g.usage)}</div>
        <div class="signal-code">${esc(gradientStopText(g))}</div>
      </article>`;
    })
    .join("");
}

export function renderSurfaceEffectCards(effects: StyleSpecSurfaceEffect[] | undefined): string {
  if (!effects?.length) return "";
  return effects
    .slice(0, 8)
    .map(
      (fx) => `
      <article class="signal-card">
        <div class="signal-title">${esc(fx.name)}</div>
        <div class="signal-meta">${esc(fx.description)}</div>
        ${
          fx.cssHints?.length
            ? `<div class="signal-code">${fx.cssHints.map((h) => esc(h)).join("<br/>")}</div>`
            : ""
        }
      </article>`,
    )
    .join("");
}

export function renderStateTokenRows(stateTokens: StyleSpecStateToken[] | undefined): string {
  if (!stateTokens?.length) return "";
  return stateTokens
    .slice(0, 16)
    .map(
      (st) => `
      <tr>
        <td>${esc(st.component)}</td>
        <td><span class="state-pill state-${esc(st.state)}">${esc(st.state)}</span></td>
        <td>${esc(st.treatment)}</td>
      </tr>`,
    )
    .join("");
}

