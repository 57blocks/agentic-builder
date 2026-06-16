import { describe, it, expect } from "vitest";
import {
  parseEndpointsRegistry,
  serviceFromEndpoint,
} from "../endpoints-registry";

const SCHEMA = `
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { token: string }

export const ENDPOINTS = {
  "POST /api/v1/auth/login": { request: "LoginRequest", response: "LoginResponse", auth: "public" },
  "GET  /api/v1/courses":    { request: null, response: "CourseListResponse", auth: "bearer" },
  "POST /api/v1/courses/:id/enroll": { request: "EnrollRequest", response: "EnrollResponse", auth: "bearer" },
} as const;
`;

describe("parseEndpointsRegistry", () => {
  it("returns null when there is no ENDPOINTS registry", () => {
    expect(parseEndpointsRegistry("export interface Foo { a: string }")).toBeNull();
  });

  it("parses each entry's method, path, request/response types and auth", () => {
    const r = parseEndpointsRegistry(SCHEMA)!;
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({
      method: "POST",
      endpoint: "/api/v1/auth/login",
      request: "LoginRequest",
      response: "LoginResponse",
      auth: "public",
    });
  });

  it("treats null request as no body", () => {
    const r = parseEndpointsRegistry(SCHEMA)!;
    const courses = r.find((e) => e.endpoint === "/api/v1/courses")!;
    expect(courses.method).toBe("GET");
    expect(courses.request).toBeNull();
    expect(courses.response).toBe("CourseListResponse");
    expect(courses.auth).toBe("bearer");
  });

  it("keeps path params and normalizes slashes", () => {
    const r = parseEndpointsRegistry(SCHEMA)!;
    expect(r.find((e) => e.endpoint === "/api/v1/courses/:id/enroll")).toBeTruthy();
  });

  it("handles a typed declaration and trailing comma", () => {
    const src = `export const ENDPOINTS: Record<string, unknown> = {
      "DELETE /api/x/:id": { request: null, response: "Ok", auth: "bearer" },
    } as const;`;
    const r = parseEndpointsRegistry(src)!;
    expect(r).toHaveLength(1);
    expect(r[0]!.method).toBe("DELETE");
  });

  it("returns [] for an empty registry", () => {
    expect(parseEndpointsRegistry("export const ENDPOINTS = {} as const;")).toEqual([]);
  });

  it("dedupes duplicate method+path keys", () => {
    const src = `export const ENDPOINTS = {
      "GET /api/a": { request: null, response: "A", auth: "none" },
      "GET /api/a": { request: null, response: "A2", auth: "none" },
    } as const;`;
    expect(parseEndpointsRegistry(src)!).toHaveLength(1);
  });
});

describe("serviceFromEndpoint", () => {
  it("derives the first meaningful path segment", () => {
    expect(serviceFromEndpoint("/api/v1/auth/login")).toBe("auth");
    expect(serviceFromEndpoint("/api/v1/courses")).toBe("courses");
    expect(serviceFromEndpoint("/api/projects/:id")).toBe("projects");
    expect(serviceFromEndpoint("/")).toBe("app");
  });
});
