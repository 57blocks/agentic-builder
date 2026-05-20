/**
 * Style Spec — structured description of a design reference image.
 *
 * Produced by the vision analyser (vision-analyser.ts) and rendered into:
 *   - Markdown (compact, LLM-friendly tokens / typography / component guide)
 *   - HTML (full self-contained visualisation document, for UI preview)
 *
 * Persisted as the body of a `design-knowledge` memory record (one record per
 * uploaded image). The record body follows the layout produced by
 * `compose-style-spec-body.ts`.
 */

export type StyleSpecIndustry =
  | "ai"
  | "fintech-web3"
  | "saas"
  | "generic";

export interface StyleSpecColor {
  /** Lowercase 6-digit hex, e.g. `#7c3aed`. */
  hex: string;
  /** Optional short label, e.g. "Brand purple". */
  label?: string;
}

export interface StyleSpecPalette {
  primary: StyleSpecColor;
  secondary?: StyleSpecColor;
  accent?: StyleSpecColor;
  background: StyleSpecColor;
  surface: StyleSpecColor;
  text: StyleSpecColor;
  textMuted?: StyleSpecColor;
  border?: StyleSpecColor;
  success?: StyleSpecColor;
  warning?: StyleSpecColor;
  danger?: StyleSpecColor;
}

export interface StyleSpecTypography {
  /** Font family used for headings, e.g. "Inter". */
  headingFont: string;
  /** Font family used for body text. */
  bodyFont: string;
  /** Optional font for monospace/code blocks. */
  monoFont?: string;
  /** Heading weight (300-900). */
  headingWeight: number;
  /** Body weight (300-900). */
  bodyWeight: number;
  /** Base body font-size in pixels. */
  baseSizePx: number;
  /** Display traits — e.g. ["large hero headings", "tabular nums in KPIs"]. */
  notes?: string[];
}

export interface StyleSpecSpacing {
  /** Base spacing unit in px (e.g. 4 or 8). */
  basePx: number;
  /** Concrete scale used in the design, in px. */
  scalePx: number[];
}

export interface StyleSpecRadius {
  smPx: number;
  mdPx: number;
  lgPx: number;
  /** Optional fully-rounded radius (e.g. 999 for pills). */
  pillPx?: number;
}

export interface StyleSpecComponent {
  /** Short description of how this component looks/feels in the reference. */
  description: string;
}

export interface StyleSpecComponents {
  button?: StyleSpecComponent;
  card?: StyleSpecComponent;
  input?: StyleSpecComponent;
  table?: StyleSpecComponent;
  navigation?: StyleSpecComponent;
}

export interface StyleSpecGradientStop {
  /** Lowercase 6-digit hex. */
  color: string;
  /** 0-100 position for this stop. */
  positionPct: number;
  /** Optional alpha value for translucent stops (0-1). */
  opacity?: number;
}

export interface StyleSpecGradient {
  /** Stable id for referencing the gradient in prompts/templates. */
  id: string;
  type: "linear" | "radial";
  /** Optional direction for linear gradients. */
  angleDeg?: number;
  stops: StyleSpecGradientStop[];
  /** Where this gradient is used in the UI. */
  usage: string;
}

export interface StyleSpecSurfaceEffect {
  /** Short tag like "glassmorphism" / "soft-glow". */
  name: string;
  /** What visual treatment is applied. */
  description: string;
  /** Optional CSS-like hints, e.g. backdrop-filter + border alpha. */
  cssHints?: string[];
}

export interface StyleSpecStateToken {
  /** Token id, e.g. "button.primary". */
  component: string;
  /** State key, e.g. default/hover/active/focus/disabled. */
  state: "default" | "hover" | "active" | "focus" | "disabled";
  /** Textual description of visual delta in this state. */
  treatment: string;
}

/** Full structured style spec returned by the vision analyser. */
export interface StyleSpec {
  /** Industry bucket — drives recall filtering. */
  industry: StyleSpecIndustry;
  /** Public path of the source reference image (e.g. /knowledge-refs/ai-1.png). */
  imagePath: string;
  /** Original filename (basename). */
  imageName: string;
  /** ISO timestamp when the spec was generated. */
  capturedAt: string;
  /** Model id that produced the analysis. */
  model: string;
  /** 1-2 sentence summary of the overall aesthetic. */
  summary: string;
  /** Short adjectives capturing the vibe, e.g. ["minimal", "dark", "futuristic"]. */
  vibe: string[];

  palette: StyleSpecPalette;
  typography: StyleSpecTypography;
  spacing: StyleSpecSpacing;
  radius: StyleSpecRadius;
  /** Optional list of CSS box-shadow strings observed in the design. */
  shadows?: string[];
  /** Optional gradient definitions extracted from key UI areas. */
  gradients?: StyleSpecGradient[];
  /** Optional material/effect definitions (glass blur, glow, noise, etc.). */
  surfaceEffects?: StyleSpecSurfaceEffect[];
  /** Optional state-level visual token definitions per component/state. */
  stateTokens?: StyleSpecStateToken[];
  components: StyleSpecComponents;
  /** Layout pattern, e.g. "fixed left sidebar nav + hero + KPI grid + alert feed". */
  layout: string;
  /**
   * Visual elements extracted from the reference screenshot. Each entry
   * identifies a named UI element (e.g. "hero headline") and its rough
   * position on the page using a 3×3 grid: column 1-3 (left→right) and
   * row 1-3 (top→bottom). render-html.ts uses these to crop-zoom the
   * original screenshot with CSS, showing real on-image element detail
   * instead of external stock photos.
   *
   * col/row are 1-indexed integers from 1 to 3.
   * Optional for back-compat; render-html falls back to a fixed 3×3 scan.
   */
  visualElements?: VisualElement[];
  /**
   * @deprecated replaced by visualElements — kept for back-compat with
   * already-stored records that embed the old Unsplash-keyword field.
   */
  imageMotifs?: string[];
}

export interface VisualElement {
  /** Short label shown as the crop caption, e.g. "hero headline" */
  name: string;
  /**
   * Horizontal grid column: 1 = left third, 2 = center third, 3 = right third.
   */
  col: 1 | 2 | 3;
  /**
   * Vertical grid row: 1 = top third, 2 = middle third, 3 = bottom third.
   */
  row: 1 | 2 | 3;
  /**
   * Optional zoom factor: how many times to enlarge the image so the element
   * fills the crop frame. Defaults to 2.5 if omitted.
   */
  zoom?: number;
}
