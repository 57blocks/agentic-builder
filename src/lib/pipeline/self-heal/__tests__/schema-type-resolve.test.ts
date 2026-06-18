import { describe, it, expect } from "vitest";
import {
  indexSchemaTypes,
  splitTopLevelFields,
  resolveTypeRefToSchema,
} from "../schema-type-resolve";
import { validateShape, sampleFromSchema } from "../contract-schema-parse";

const SCHEMA = `
export interface User {
  id: string;
  email: string;
  displayName: string;
}
export interface LoginResponse {
  token: string;
  user: User;
}
export interface Course {
  id: string;
  title: string;
  seats: number;
  archived?: boolean;
}
export interface CourseListResponse {
  items: Course[];
  total: number;
}
export type CourseId = string;
export type Status = "active" | "archived";
`;

describe("indexSchemaTypes", () => {
  it("indexes interfaces and type aliases", () => {
    const idx = indexSchemaTypes(SCHEMA);
    expect(idx.has("User")).toBe(true);
    expect(idx.has("LoginResponse")).toBe(true);
    expect(idx.has("CourseListResponse")).toBe(true);
    expect(idx.get("CourseId")).toBe("string");
    expect(idx.get("Status")).toContain("active");
  });
});

describe("splitTopLevelFields", () => {
  it("splits respecting nested braces and arrays", () => {
    const fields = splitTopLevelFields("{ a: string; b: { c: number }; d: Course[] }");
    expect(fields.map((f) => f.key)).toEqual(["a", "b", "d"]);
    expect(fields[2]!.valueType).toBe("Course[]");
  });
  it("marks optional fields", () => {
    const fields = splitTopLevelFields("{ x?: string; y: number }");
    expect(fields.find((f) => f.key === "x")!.optional).toBe(true);
    expect(fields.find((f) => f.key === "y")!.optional).toBe(false);
  });
});

describe("resolveTypeRefToSchema", () => {
  it("resolves a named type with a nested named field", () => {
    const node = resolveTypeRefToSchema(SCHEMA, "LoginResponse");
    expect(node).not.toBeNull();
    // token:string present; user expands to an object with User's fields.
    const mismatches = validateShape(
      { token: "t", user: { id: "1", email: "e", displayName: "d" } },
      node,
    );
    expect(mismatches).toEqual([]);
  });

  it("flags a missing top-level field", () => {
    const node = resolveTypeRefToSchema(SCHEMA, "LoginResponse");
    const mismatches = validateShape({ user: { id: "1", email: "e", displayName: "d" } }, node);
    expect(mismatches.some((m) => m.path === "$.token")).toBe(true);
  });

  it("flags a nested field of the wrong primitive family", () => {
    const node = resolveTypeRefToSchema(SCHEMA, "LoginResponse");
    const mismatches = validateShape(
      { token: "t", user: { id: 123, email: "e", displayName: "d" } },
      node,
    );
    expect(mismatches.some((m) => m.path === "$.user.id")).toBe(true);
  });

  it("resolves arrays of named types", () => {
    const node = resolveTypeRefToSchema(SCHEMA, "CourseListResponse");
    const ok = validateShape(
      { items: [{ id: "1", title: "t", seats: 3 }], total: 1 },
      node,
    );
    expect(ok).toEqual([]);
    const bad = validateShape({ items: "nope", total: 1 }, node);
    expect(bad.some((m) => m.path === "$.items")).toBe(true);
  });

  it("handles a bare `Course[]` reference", () => {
    const node = resolveTypeRefToSchema(SCHEMA, "Course[]");
    expect(node!.kind).toBe("array");
    expect(validateShape([{ id: "1", title: "t", seats: 2 }], node)).toEqual([]);
  });

  it("tolerates optional fields (absence is OK)", () => {
    const node = resolveTypeRefToSchema(SCHEMA, "Course");
    expect(validateShape({ id: "1", title: "t", seats: 2 }, node)).toEqual([]);
  });

  it("returns null for unknown / primitive-only refs", () => {
    expect(resolveTypeRefToSchema(SCHEMA, "Nonexistent")).toBeNull();
    expect(resolveTypeRefToSchema(SCHEMA, "none")).toBeNull();
    expect(resolveTypeRefToSchema(SCHEMA, "")).toBeNull();
  });

  it("resolves scalar aliases used as a ref", () => {
    const node = resolveTypeRefToSchema(SCHEMA, "CourseId");
    expect(node).toEqual({ kind: "primitive", type: "string" });
  });

  it("does not infinitely recurse on self-referential types", () => {
    const recursive = `export interface Node { id: string; parent: Node; children: Node[] }`;
    const node = resolveTypeRefToSchema(recursive, "Node");
    expect(node).not.toBeNull();
    // Should terminate and still validate a shallow instance.
    expect(validateShape({ id: "1", parent: {}, children: [] }, node)).toEqual([]);
  });

  it("produces a usable sample body for request synthesis", () => {
    const node = resolveTypeRefToSchema(SCHEMA, "User");
    const sample = sampleFromSchema(node) as Record<string, unknown>;
    expect(typeof sample.id).toBe("string");
    expect(typeof sample.email).toBe("string");
  });
});
