/**
 * In-memory mock project store.
 * Replace with a real database / ORM when ready.
 *
 * NOTE: This module is Node.js-only (runs in API routes).
 *       It resets on every cold start in development.
 */

import { type Project } from "@/types/project";

// Singleton in-process store (survives hot-reloads in the same process)
const globalStore = globalThis as typeof globalThis & {
  __projects?: Project[];
};

if (!globalStore.__projects) {
  globalStore.__projects = []; // default: empty array as required
}

export function getProjects(): Project[] {
  return globalStore.__projects!;
}

export function createProject(name: string): Project {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `project-${Date.now()}`;

  // Ensure slug uniqueness
  const existing = globalStore.__projects!.map((p) => p.slug);
  let finalSlug = slug;
  let counter = 2;
  while (existing.includes(finalSlug)) {
    finalSlug = `${slug}-${counter++}`;
  }

  const project: Project = {
    id: crypto.randomUUID(),
    slug: finalSlug,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  globalStore.__projects!.push(project);
  return project;
}
