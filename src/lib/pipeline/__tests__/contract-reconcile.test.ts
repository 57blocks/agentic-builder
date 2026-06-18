import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  reconcileContractWithSchema,
  exportedTypeNames,
  baseTypeName,
} from "../contract-reconcile";

const SCHEMA = `
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { token: string }
export interface Course { id: string }
export type CourseId = string;
`;

async function writeProject(
  dir: string,
  contracts: unknown[],
  schema = SCHEMA,
) {
  await fs.mkdir(path.join(dir, "backend/src/shared"), { recursive: true });
  await fs.writeFile(path.join(dir, "backend/src/shared/schema.ts"), schema);
  await fs.writeFile(path.join(dir, "API_CONTRACTS.json"), JSON.stringify(contracts));
}

describe("exportedTypeNames / baseTypeName", () => {
  it("extracts interface/type/enum/const export names", () => {
    const names = exportedTypeNames(SCHEMA);
    expect(names.has("LoginRequest")).toBe(true);
    expect(names.has("Course")).toBe(true);
    expect(names.has("CourseId")).toBe(true);
  });
  it("reduces array/generic refs to the leading identifier", () => {
    expect(baseTypeName("Course[]")).toBe("Course");
    expect(baseTypeName("Promise<Course>")).toBe("Promise");
    expect(baseTypeName("LoginResponse")).toBe("LoginResponse");
  });
});

describe("reconcileContractWithSchema", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "reconcile-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("passes when every referenced type exists in the schema", async () => {
    await writeProject(dir, [
      { endpoint: "/api/v1/auth/login", method: "POST", requestType: "LoginRequest", responseType: "LoginResponse" },
      { endpoint: "/api/v1/courses", method: "GET", requestType: "none", responseType: "Course[]" },
    ]);
    const r = await reconcileContractWithSchema(dir);
    expect(r.checked).toBe(true);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("flags a referenced type that the schema does not define", async () => {
    await writeProject(dir, [
      { endpoint: "/api/v1/enroll", method: "POST", requestType: "EnrollRequest", responseType: "EnrollResponse" },
    ]);
    const r = await reconcileContractWithSchema(dir);
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual([
      { endpoint: "/api/v1/enroll", method: "POST", type: "EnrollRequest", kind: "request" },
      { endpoint: "/api/v1/enroll", method: "POST", type: "EnrollResponse", kind: "response" },
    ]);
  });

  it("ignores primitives / none", async () => {
    await writeProject(dir, [
      { endpoint: "/api/v1/ping", method: "GET", requestType: "none", responseType: "string" },
    ]);
    expect((await reconcileContractWithSchema(dir)).ok).toBe(true);
  });

  it("is a no-op on legacy contracts without *Type fields", async () => {
    await writeProject(dir, [
      { endpoint: "/api/v1/x", method: "GET", requestSchema: "none", responseSchema: "{ a: string }" },
    ]);
    const r = await reconcileContractWithSchema(dir);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("no-ops when contract or schema is missing", async () => {
    expect((await reconcileContractWithSchema(dir)).checked).toBe(false);
  });
});
