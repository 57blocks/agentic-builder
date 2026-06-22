import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  appendSchemaChangeRequest,
  readSchemaChangeRequests,
  appendSchemaChangeDecision,
  readSchemaChangeDecisions,
  pendingRequests,
  staleTaskIds,
  acceptedChangedTypes,
  SchemaChangeRequest,
  SchemaChangeDecision,
  SCHEMA_CHANGE_REQUESTS_REL,
} from "../schema-change-request";

const REQ: SchemaChangeRequest = {
  taskId: "be-enroll",
  typeName: "EnrollResponse",
  kind: "missing-type",
  reason: "PRD requires enrollment confirmation but schema has no EnrollResponse",
  proposedChange: "export interface EnrollResponse { enrollmentId: string; status: string }",
  endpoint: "POST /api/v1/enroll",
  createdAt: "2026-06-01T00:00:00.000Z",
};

describe("schema-change-request append/read", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "scr-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("appends and reads back requests (creates .ralph dir)", async () => {
    await appendSchemaChangeRequest(dir, REQ);
    await appendSchemaChangeRequest(dir, { ...REQ, taskId: "be-other", typeName: "Course", field: "seats" });
    const got = await readSchemaChangeRequests(dir);
    expect(got).toHaveLength(2);
    expect(got[0]!.typeName).toBe("EnrollResponse");
    expect(got[1]!.field).toBe("seats");
  });

  it("returns [] when the log does not exist", async () => {
    expect(await readSchemaChangeRequests(dir)).toEqual([]);
  });

  it("tolerates malformed JSONL lines", async () => {
    const abs = path.join(dir, SCHEMA_CHANGE_REQUESTS_REL);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, JSON.stringify(REQ) + "\n{ not json\n", "utf8");
    const got = await readSchemaChangeRequests(dir);
    expect(got).toHaveLength(1);
  });

  it("round-trips decisions", async () => {
    const decision: SchemaChangeDecision = {
      request: REQ,
      decision: "accepted",
      rationale: "PRD §4.2 confirms enrollment returns a confirmation object",
      changedTypes: ["EnrollResponse"],
      decidedAt: "2026-06-01T01:00:00.000Z",
    };
    await appendSchemaChangeDecision(dir, decision);
    const got = await readSchemaChangeDecisions(dir);
    expect(got).toHaveLength(1);
    expect(got[0]!.decision).toBe("accepted");
  });
});

describe("pendingRequests", () => {
  it("excludes requests already covered by a decision", () => {
    const r2: SchemaChangeRequest = { ...REQ, taskId: "be-other", typeName: "Course", field: "seats" };
    const decisions: SchemaChangeDecision[] = [
      { request: REQ, decision: "accepted", rationale: "", changedTypes: ["EnrollResponse"] },
    ];
    const pend = pendingRequests([REQ, r2], decisions);
    expect(pend).toHaveLength(1);
    expect(pend[0]!.taskId).toBe("be-other");
  });
});

describe("staleTaskIds", () => {
  const tasks = [
    { id: "be-enroll", text: "implement POST /enroll returning EnrollResponse" },
    { id: "fe-enroll", text: "enrollment page consumes EnrollResponse" },
    { id: "fe-courses", text: "list page consumes CourseList" },
    { id: "be-course", text: "returns Course" },
  ];

  it("returns tasks referencing a changed type, word-boundary matched", () => {
    expect(staleTaskIds(["EnrollResponse"], tasks).sort()).toEqual(["be-enroll", "fe-enroll"]);
  });

  it("does not match a type that is a prefix of another (Course vs CourseList)", () => {
    expect(staleTaskIds(["Course"], tasks)).toEqual(["be-course"]);
  });

  it("returns [] for no changed types or invalid identifiers", () => {
    expect(staleTaskIds([], tasks)).toEqual([]);
    expect(staleTaskIds(["not a type!"], tasks)).toEqual([]);
  });
});

describe("acceptedChangedTypes", () => {
  it("collects distinct changed types from accepted decisions only", () => {
    const decisions: SchemaChangeDecision[] = [
      { request: REQ, decision: "accepted", rationale: "", changedTypes: ["EnrollResponse", "Course"] },
      { request: REQ, decision: "rejected", rationale: "", changedTypes: ["ShouldNotAppear"] },
      { request: REQ, decision: "accepted", rationale: "", changedTypes: ["Course"] },
    ];
    expect(acceptedChangedTypes(decisions).sort()).toEqual(["Course", "EnrollResponse"]);
  });
});
