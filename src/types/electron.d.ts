import type { ReferenceCaptureResult } from "@/lib/design/format-reference-tokens";

export interface ElectronAPI {
  getPlatform: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  /** Render a reference URL in a hidden window; returns a full-page screenshot + extracted CSS tokens. */
  renderReferenceUrl: (url: string) => Promise<ReferenceCaptureResult>;
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
