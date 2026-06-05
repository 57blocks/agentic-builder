import type { ReferenceCaptureResult } from "@/lib/design/format-reference-tokens";

/** Result of the lightweight `captureUrl` cover screenshot. */
export interface CoverCaptureResult {
  ok: boolean;
  /** "data:image/jpeg;base64,…" when ok. */
  screenshotDataUrl?: string;
  error?: string;
}

export interface ElectronAPI {
  getPlatform: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  selectFolder: () => Promise<string | null>;
  /** Render a reference URL in a hidden window; returns a full-page screenshot + extracted CSS tokens. */
  renderReferenceUrl: (url: string) => Promise<ReferenceCaptureResult>;
  /** Capture a viewport screenshot of a (local) URL for use as a project cover. */
  captureUrl: (url: string) => Promise<CoverCaptureResult>;
  /** Force capture during interactive login (manual fallback when auto-detection misses). */
  confirmReferenceCapture: () => void;
  /** Subscribe to the "login wall detected" signal; returns an unsubscribe fn. */
  onReferenceLoginNeeded: (callback: () => void) => () => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
