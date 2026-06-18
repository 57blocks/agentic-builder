/**
 * Skill .md parser. Reads a single `.md` file, extracts the YAML frontmatter
 * (between two `---` lines), and returns a typed `Skill` object.
 *
 * Frontmatter shape (canonical example):
 *
 *   ---
 *   id: email-driven-approval-flow
 *   agent: task-breakdown
 *   version: v1
 *   description: Allows inline success on submission when approval emails carry the next step.
 *   priority: 60
 *   excludes:
 *     - polling-approval-flow
 *   trigger:
 *     type: composite
 *     prefilter:
 *       type: regex
 *       match: prd
 *       any_of:
 *         - "approval"
 *         - "access[- ]request"
 *     confirm:
 *       type: llm
 *       match: prd
 *       prompt: |
 *         Read the PRD. ...
 *   ---
 *
 *   # Skill body in Markdown follows here, verbatim, no further parsing.
 *
 * To keep the system dependency-free we hand-roll a small YAML subset
 * adequate for skills (scalars, lists, nested objects). We DO NOT support
 * anchors, references, multi-doc, or arbitrary flow syntax — if a skill
 * needs that, it's expressing too much.
 */

import fs from "node:fs";
import path from "node:path";
import type { Skill, SkillTrigger, TriggerMatchSource } from "./types";

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

export function parseSkillFile(filePath: string): Skill {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error(
      `Skill ${filePath} is missing the YAML frontmatter block (--- ... ---).`,
    );
  }
  const [, frontmatterText, body] = match;

  const parsed = parseYamlSubset(frontmatterText);

  const id = asString(parsed.id, "id");
  if (id !== path.basename(filePath, ".md")) {
    throw new Error(
      `Skill ${filePath}: frontmatter id "${id}" must match the file basename.`,
    );
  }

  const skill: Skill = {
    id,
    filePath,
    agent: asString(parsed.agent, "agent"),
    version: asString(parsed.version, "version"),
    description:
      typeof parsed.description === "string" ? parsed.description : undefined,
    priority: asNumber(parsed.priority, "priority", 50),
    excludes: asStringArray(parsed.excludes, "excludes", []),
    trigger: parseTrigger(parsed.trigger, filePath),
    body: body ?? "",
  };
  return skill;
}

function parseTrigger(raw: unknown, filePath: string): SkillTrigger {
  if (!raw || typeof raw !== "object") {
    throw new Error(`${filePath}: missing required "trigger" frontmatter field.`);
  }
  const obj = raw as Record<string, unknown>;
  const type = asString(obj.type, "trigger.type");

  if (type === "regex") {
    return {
      type: "regex",
      match: asMatchSource(obj.match, "trigger.match"),
      any_of: asStringArray(obj.any_of, "trigger.any_of", []),
    };
  }
  if (type === "llm") {
    return {
      type: "llm",
      match: asMatchSource(obj.match, "trigger.match"),
      prompt: asString(obj.prompt, "trigger.prompt"),
      model: typeof obj.model === "string" ? obj.model : undefined,
    };
  }
  if (type === "composite") {
    const prefilter = obj.prefilter && typeof obj.prefilter === "object"
      ? (obj.prefilter as Record<string, unknown>)
      : null;
    const confirm = obj.confirm && typeof obj.confirm === "object"
      ? (obj.confirm as Record<string, unknown>)
      : null;
    if (!prefilter || !confirm) {
      throw new Error(`${filePath}: composite trigger requires both "prefilter" and "confirm".`);
    }
    return {
      type: "composite",
      prefilter: {
        type: "regex",
        match: asMatchSource(prefilter.match, "trigger.prefilter.match"),
        any_of: asStringArray(prefilter.any_of, "trigger.prefilter.any_of", []),
      },
      confirm: {
        type: "llm",
        match: asMatchSource(confirm.match, "trigger.confirm.match"),
        prompt: asString(confirm.prompt, "trigger.confirm.prompt"),
        model: typeof confirm.model === "string" ? confirm.model : undefined,
      },
    };
  }
  if (type === "context") {
    const always = obj.always === true;
    const anyFeatures = asStringArray(obj.any_of_features, "trigger.any_of_features", []);
    const anyEnv = asStringArray(obj.any_of_env_keys, "trigger.any_of_env_keys", []);
    const allFlags = asStringArray(obj.all_of_flags, "trigger.all_of_flags", []);
    if (!always && anyFeatures.length === 0 && anyEnv.length === 0 && allFlags.length === 0) {
      throw new Error(
        `${filePath}: context trigger requires "always: true" or at least one of "any_of_features", "any_of_env_keys", "all_of_flags".`,
      );
    }
    return {
      type: "context",
      ...(always ? { always: true } : {}),
      ...(anyFeatures.length ? { any_of_features: anyFeatures } : {}),
      ...(anyEnv.length ? { any_of_env_keys: anyEnv } : {}),
      ...(allFlags.length ? { all_of_flags: allFlags } : {}),
    };
  }
  throw new Error(`${filePath}: unknown trigger.type "${type}".`);
}

// ─── Coercion helpers ─────────────────────────────────────────────────────

function asString(v: unknown, field: string): string {
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error(`Skill frontmatter: field "${field}" must be a non-empty string`);
}

function asNumber(v: unknown, field: string, fallback?: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  if (fallback !== undefined) return fallback;
  throw new Error(`Skill frontmatter: field "${field}" must be a number`);
}

function asStringArray(v: unknown, field: string, fallback: string[]): string[] {
  if (v === undefined || v === null) return fallback;
  if (!Array.isArray(v)) {
    throw new Error(`Skill frontmatter: field "${field}" must be a list of strings`);
  }
  return v.map((item, i) => {
    if (typeof item !== "string") {
      throw new Error(`Skill frontmatter: ${field}[${i}] must be a string`);
    }
    return item;
  });
}

function asMatchSource(v: unknown, field: string): TriggerMatchSource {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s === "prd" || s === "trd" || s === "both") return s;
  throw new Error(
    `Skill frontmatter: ${field} must be "prd" | "trd" | "both" (got ${JSON.stringify(v)})`,
  );
}

// ─── Minimal YAML parser ──────────────────────────────────────────────────
//
// Supports: nested objects via 2-space indent; lists of scalars under a key;
// block scalars (`|` / `>`); inline strings (with or without quotes);
// numbers and booleans. No anchors, no flow-style, no advanced features.
// Good enough for our skill frontmatters (intentional simplicity).

interface ParsedYaml {
  [key: string]: YamlValue;
}
type YamlValue = string | number | boolean | YamlValue[] | ParsedYaml;

function parseYamlSubset(text: string): ParsedYaml {
  // Split into logical lines but preserve indent for structure.
  const rawLines = text.split(/\r?\n/);
  // Trim trailing empty lines.
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === "") {
    rawLines.pop();
  }
  const tokens = rawLines
    .map((line, idx) => ({ line, idx }))
    .filter((t) => t.line.trim() !== "" && !t.line.trim().startsWith("#"));

  let cursor = 0;

  function indentOf(line: string): number {
    const m = line.match(/^ */);
    return m ? m[0].length : 0;
  }

  function parseBlock(parentIndent: number): ParsedYaml {
    const out: ParsedYaml = {};
    while (cursor < tokens.length) {
      const { line } = tokens[cursor];
      const indent = indentOf(line);
      if (indent < parentIndent) break;
      if (indent > parentIndent) {
        // Should never happen at top level — bubble up to caller.
        cursor++;
        continue;
      }
      const trimmed = line.trim();
      // Top-level list items aren't supported (frontmatter is always an object).
      if (trimmed.startsWith("- ")) break;

      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) {
        cursor++;
        continue;
      }
      const key = trimmed.slice(0, colonIdx).trim();
      const rest = trimmed.slice(colonIdx + 1).trim();
      cursor++;

      // Inline array: `key: []` or `key: [item, item]`
      if (rest.startsWith("[") && rest.endsWith("]")) {
        const inner = rest.slice(1, -1).trim();
        if (inner === "") {
          out[key] = [];
        } else {
          out[key] = inner.split(",").map((s) => parseScalar(s.trim()));
        }
        continue;
      }
      if (rest === "|" || rest === ">") {
        // Block scalar — collect indented lines (relative to parentIndent).
        const baseIndent = parentIndent + 2;
        const collected: string[] = [];
        while (cursor < tokens.length) {
          const { line: nextLine } = tokens[cursor];
          const nextIndent = indentOf(nextLine);
          if (nextIndent < baseIndent) break;
          collected.push(nextLine.slice(baseIndent));
          cursor++;
        }
        out[key] = rest === "|" ? collected.join("\n") : collected.join(" ");
      } else if (rest === "") {
        // Could be a nested object or a list (next line tells us).
        if (cursor < tokens.length) {
          const nextTrimmed = tokens[cursor].line.trim();
          const nextIndent = indentOf(tokens[cursor].line);
          if (nextIndent > parentIndent && nextTrimmed.startsWith("- ")) {
            out[key] = parseList(nextIndent);
          } else if (nextIndent > parentIndent) {
            out[key] = parseBlock(nextIndent);
          } else {
            out[key] = "";
          }
        } else {
          out[key] = "";
        }
      } else {
        out[key] = parseScalar(rest);
      }
    }
    return out;
  }

  function parseList(itemIndent: number): YamlValue[] {
    const items: YamlValue[] = [];
    while (cursor < tokens.length) {
      const { line } = tokens[cursor];
      const indent = indentOf(line);
      if (indent !== itemIndent) break;
      const trimmed = line.trim();
      if (!trimmed.startsWith("- ")) break;
      const value = trimmed.slice(2).trim();
      cursor++;
      items.push(parseScalar(value));
    }
    return items;
  }

  function parseScalar(s: string): string | number | boolean {
    if (s === "true") return true;
    if (s === "false") return false;
    if (s === "null") return "";
    // Quoted strings — strip outer quotes; unescape minimal cases.
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    // Numeric coercion only when it round-trips.
    if (/^-?\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      if (!Number.isNaN(n)) return n;
    }
    return s;
  }

  return parseBlock(0);
}
