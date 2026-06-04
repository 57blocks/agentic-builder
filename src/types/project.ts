/**
 * Shared project types used across API and UI.
 */
export interface Project {
  id: string;
  slug: string;
  name: string;
  /** Public URL path to the cover screenshot, or null if none captured yet. */
  coverImagePath?: string | null;
  createdAt: string; // ISO string
}
