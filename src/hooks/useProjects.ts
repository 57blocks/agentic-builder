"use client";

import { useState, useEffect, useCallback } from "react";
import { type Project } from "@/types/project";

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: boolean;
  /** Create a new project by name. Pass localId to replace a placeholder. */
  createProject: (name: string, localId?: string) => Promise<Project>;
  /**
   * Add a placeholder project to local state only — no API call.
   * Inserted at the front of the list so it appears first in the sidebar.
   */
  addLocalProject: (name?: string) => Project;
  /** Rename a project. Optimistic — reverts on failure. */
  renameProject: (id: string, name: string) => Promise<void>;
  /** Delete a project. Optimistic — re-inserts on failure. */
  deleteProject: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as { projects: Project[] };
      setProjects(data.projects ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-fetch when another part of the app signals project metadata changed
  // (e.g. a cover screenshot was just captured in the preview panel).
  useEffect(() => {
    const onRefresh = () => void refresh();
    window.addEventListener("projects:refresh", onRefresh);
    return () => window.removeEventListener("projects:refresh", onRefresh);
  }, [refresh]);

  const createProject = useCallback(
    async (name: string, localId?: string): Promise<Project> => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, id: localId }),
      });

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      if (!res.ok) {
        const msg =
          (body as { message?: string } | null)?.message ??
          `Failed to create project (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      const data = body as { project: Project };
      setProjects((prev) => {
        // If we had a local placeholder, replace it; otherwise insert at front
        if (localId) {
          return prev.map((p) => (p.id === localId ? data.project : p));
        }
        return [data.project, ...prev];
      });
      // Notify other useProjects instances (e.g. AppNav sidebar) to re-fetch
      window.dispatchEvent(new Event("projects:refresh"));
      return data.project;
    },
    [],
  );

  const addLocalProject = useCallback((name = "New Project"): Project => {
    const slug =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `project-${Date.now()}`;

    const project: Project = {
      id: crypto.randomUUID(),
      slug,
      name,
      createdAt: new Date().toISOString(),
    };

    // Insert at the front so it's first in the sidebar
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const renameProject = useCallback(
    async (id: string, name: string): Promise<void> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Project name is required.");

      // Optimistic update — snapshot previous name for rollback.
      let previous = "";
      setProjects((prev) => {
        return prev.map((p) => {
          if (p.id !== id) return p;
          previous = p.name;
          return { ...p, name: trimmed };
        });
      });

      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        // Roll back optimistic update.
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, name: previous } : p)),
        );
        throw err instanceof Error
          ? err
          : new Error("Failed to rename project.");
      }
    },
    [],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic remove — snapshot for rollback.
      let removed: Project | undefined;
      let removedIndex = -1;
      setProjects((prev) => {
        removedIndex = prev.findIndex((p) => p.id === id);
        removed = removedIndex >= 0 ? prev[removedIndex] : undefined;
        return prev.filter((p) => p.id !== id);
      });

      try {
        const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        // Roll back: re-insert at original position.
        if (removed) {
          const restored = removed;
          const idx = removedIndex;
          setProjects((prev) => {
            const next = [...prev];
            next.splice(Math.max(0, idx), 0, restored);
            return next;
          });
        }
        throw err instanceof Error
          ? err
          : new Error("Failed to delete project.");
      }
    },
    [],
  );

  return {
    projects,
    loading,
    error,
    createProject,
    addLocalProject,
    renameProject,
    deleteProject,
    refresh,
  };
}
