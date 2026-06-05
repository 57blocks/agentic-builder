/**
 * Shared project types used across API and UI.
 */
export interface Project {
  id: string;
  slug: string;
  name: string;
  /** Absolute path to this project's code output directory. Empty string = use legacy 'generated-code' fallback. */
  codeOutputDir: string;
  /** Public URL path to the cover screenshot, or null if none captured yet. */
  coverImagePath?: string | null;
  createdAt: string; // ISO string
}
